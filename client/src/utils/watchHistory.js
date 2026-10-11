/**
 * watchHistory.js — playback positions for "Continue Watching"
 *
 * TVPlayer.play() resolves with {position, duration, finished} when the
 * external player closes. We persist per torrent file, feed the position
 * back into the next play() call (Vimu `startfrom` / MX `position`), and
 * build the home-screen resume row from the unfinished entries.
 *
 * localStorage stays the fast synchronous source, but it belongs to one TV.
 * Changes are also pushed to the server (resumeSync.js) and the other TV's
 * changes merged back with the server's rule: newest updatedAt wins, and a
 * finished file leaves a tombstone so a stale copy cannot resurrect it.
 */

const STORAGE_KEY = 'watch_history_v1'
const TOMBSTONES_KEY = 'watch_history_tombstones_v1'
const TOMBSTONE_TTL_MS = 60 * 24 * 3600 * 1000
const MAX_ENTRIES = 30
// Below this watched amount a resume makes no sense
const MIN_RESUME_POSITION_MS = 2 * 60 * 1000
// Past this fraction the item counts as watched
const FINISHED_RATIO = 0.95

function entryKey(infoHash, fileIndex) {
    return `${(infoHash || '').toLowerCase()}:${fileIndex}`
}

function load() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    } catch {
        return {}
    }
}

function save(map) {
    try {
        const entries = Object.entries(map)
        if (entries.length > MAX_ENTRIES) {
            entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
            map = Object.fromEntries(entries.slice(0, MAX_ENTRIES))
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    } catch { /* localStorage unavailable */ }
}

function loadTombstones() {
    try {
        return JSON.parse(localStorage.getItem(TOMBSTONES_KEY)) || {}
    } catch {
        return {}
    }
}

function saveTombstones(tombstones, now = Date.now()) {
    try {
        for (const [key, at] of Object.entries(tombstones)) {
            if (now - at > TOMBSTONE_TTL_MS) delete tombstones[key]
        }
        localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombstones))
    } catch { /* localStorage unavailable */ }
}

/** Treats a player result as "watched to the end"? */
export function isFinishedResult(result) {
    const { position, duration, finished } = result || {}
    if (finished === true) return true
    if (Number.isFinite(position) && position >= 0 && Number.isFinite(duration)
        && duration > 0 && position / duration >= FINISHED_RATIO) return true
    return false
}

/**
 * Store the outcome of a playback session.
 * Finished sessions remove the resume entry (next play starts fresh).
 * @returns {{key: string, entry?: Object, deletedAt?: number} | null}
 *   the change to push to the server, or null when nothing changed
 */
export function recordPlaybackResult({ infoHash, fileIndex, fileName, torrentName, tmdbId = null, mediaType = null, result }) {
    if (!infoHash || !Number.isInteger(fileIndex)) return null
    const finished = isFinishedResult(result)
    const position = result?.position
    // External players may close without a result (-1). Keep the last known
    // progress unless completion or a real nonnegative position was reported.
    if (!finished && (!Number.isFinite(position) || position < 0)) return null
    const map = load()
    const key = entryKey(infoHash, fileIndex)

    // Finished, or explicitly restarted near the beginning: forget the position
    // here and, through the tombstone, on the other TV too.
    if (finished || position < MIN_RESUME_POSITION_MS) {
        // A finished film is announced even with no local entry: the position
        // may exist only on the server, saved by the other TV.
        if (!map[key] && !finished) return null
        const deletedAt = Date.now()
        delete map[key]
        save(map)
        const tombstones = loadTombstones()
        tombstones[key] = deletedAt
        saveTombstones(tombstones)
        return { key, deletedAt }
    }

    map[key] = {
        infoHash: infoHash.toLowerCase(),
        fileIndex,
        fileName: fileName || null,
        torrentName: torrentName || null,
        // tmdbId/mediaType carried so the catalog can map this torrent back to a
        // TMDB item (Trakt scrobble, real progress % on posters). Preserve any
        // previously-stored id if this call doesn't supply one.
        tmdbId: tmdbId ?? map[key]?.tmdbId ?? null,
        mediaType: mediaType ?? map[key]?.mediaType ?? null,
        position,
        duration: Number.isFinite(result?.duration) ? Math.max(0, result.duration) : 0,
        updatedAt: Date.now()
    }
    save(map)
    const tombstones = loadTombstones()
    if (tombstones[key]) {
        delete tombstones[key]
        saveTombstones(tombstones)
    }
    return { key, entry: map[key] }
}

/**
 * Merge the server's snapshot (every TV's changes) into this TV.
 * @param {{entries: Object[], tombstones: Object}} remote
 * @returns {boolean} whether anything local changed
 */
export function mergeRemoteResume(remote) {
    const map = load()
    const tombstones = loadTombstones()
    let changed = false

    for (const [key, deletedAt] of Object.entries(remote?.tombstones || {})) {
        if (!Number.isFinite(deletedAt)) continue
        if (map[key] && map[key].updatedAt <= deletedAt) {
            delete map[key]
            changed = true
        }
        if (!map[key] && (tombstones[key] || 0) < deletedAt) tombstones[key] = deletedAt
    }
    for (const entry of remote?.entries || []) {
        if (!entry?.infoHash || !Number.isInteger(entry.fileIndex) || !Number.isFinite(entry.updatedAt)) continue
        const key = entryKey(entry.infoHash, entry.fileIndex)
        if (entry.updatedAt <= (tombstones[key] || 0)) continue
        if (map[key] && map[key].updatedAt >= entry.updatedAt) continue
        map[key] = { ...entry, infoHash: entry.infoHash.toLowerCase() }
        delete tombstones[key]
        changed = true
    }

    if (changed) save(map)
    saveTombstones(tombstones)
    return changed
}

/** Resume position (ms) for the next play() call, 0 = start from scratch */
export function getResumePosition(infoHash, fileIndex) {
    const entry = load()[entryKey(infoHash, fileIndex)]
    return entry?.position || 0
}

/** Full stored entry (incl. tmdbId/mediaType) for a torrent file, or null. */
export function getResumeEntry(infoHash, fileIndex) {
    return load()[entryKey(infoHash, fileIndex)] || null
}

/** Unfinished sessions, newest first — source for the Continue Watching row */
export function getResumeItems() {
    return Object.values(load())
        .filter((e) => (e.position || 0) >= MIN_RESUME_POSITION_MS)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

/** Drop entries (e.g. when the torrent is deleted) */
export function removeResumeEntries(infoHash) {
    const map = load()
    const hash = (infoHash || '').toLowerCase()
    let changed = false
    for (const key of Object.keys(map)) {
        if (key.startsWith(`${hash}:`)) {
            delete map[key]
            changed = true
        }
    }
    if (changed) save(map)
}
