/**
 * watchHistory.js — playback positions for "Continue Watching"
 *
 * TVPlayer.play() resolves with {position, duration, finished} when the
 * external player closes. We persist per torrent file, feed the position
 * back into the next play() call (Vimu `startfrom` / MX `position`), and
 * build the home-screen resume row from the unfinished entries.
 */

const STORAGE_KEY = 'watch_history_v1'
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

/** Treats a player result as "watched to the end"? */
export function isFinishedResult({ position = 0, duration = 0, finished = false } = {}) {
    if (finished) return true
    if (duration > 0 && position / duration >= FINISHED_RATIO) return true
    return false
}

/**
 * Store the outcome of a playback session.
 * Finished sessions remove the resume entry (next play starts fresh).
 */
export function recordPlaybackResult({ infoHash, fileIndex, fileName, torrentName, result }) {
    if (!infoHash || !Number.isInteger(fileIndex)) return
    const map = load()
    const key = entryKey(infoHash, fileIndex)
    const position = Math.max(0, result?.position || 0)

    if (isFinishedResult(result) || position < MIN_RESUME_POSITION_MS) {
        if (map[key]) {
            delete map[key]
            save(map)
        }
        return
    }

    map[key] = {
        infoHash: infoHash.toLowerCase(),
        fileIndex,
        fileName: fileName || null,
        torrentName: torrentName || null,
        position,
        duration: Math.max(0, result?.duration || 0),
        updatedAt: Date.now()
    }
    save(map)
}

/** Resume position (ms) for the next play() call, 0 = start from scratch */
export function getResumePosition(infoHash, fileIndex) {
    const entry = load()[entryKey(infoHash, fileIndex)]
    return entry?.position || 0
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
