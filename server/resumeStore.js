/**
 * Shared resume positions — one record per torrent file for every TV.
 *
 * Each TV used to keep positions only in its own localStorage, so switching
 * TVs restarted the film. Both TVs talk to this server, so it keeps the
 * authoritative copy. Merge rule, applied identically on the client:
 * the newest `updatedAt` wins, and finishing a file leaves a tombstone so a
 * stale copy pushed later by the other TV cannot resurrect it.
 *
 * State shape (db.data.resume): { entries: { [key]: entry }, tombstones: { [key]: ms } }
 * key = `${infoHash}:${fileIndex}` (infoHash lowercase hex — real or local-library sha1).
 */

const KEY_RE = /^[0-9a-f]{40}:\d{1,5}$/
const MAX_ENTRIES = 100
const TOMBSTONE_TTL_MS = 60 * 24 * 3600 * 1000

function assertKey(key) {
    if (!KEY_RE.test(key)) throw new Error(`invalid resume key: ${key}`)
}

function finite(value, name) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`invalid ${name}`)
    return value
}

/** Keep only known fields; a record must describe the file its key names. */
function sanitizeEntry(key, entry) {
    const [infoHash, fileIndex] = key.split(':')
    if (String(entry.infoHash || '').toLowerCase() !== infoHash || Number(entry.fileIndex) !== Number(fileIndex)) {
        throw new Error('entry does not match its key')
    }
    const text = (value) => (typeof value === 'string' ? value.slice(0, 500) : null)
    return {
        infoHash,
        fileIndex: Number(fileIndex),
        fileName: text(entry.fileName),
        torrentName: text(entry.torrentName),
        tmdbId: Number.isFinite(entry.tmdbId) ? entry.tmdbId : null,
        mediaType: entry.mediaType === 'tv' || entry.mediaType === 'movie' ? entry.mediaType : null,
        position: finite(entry.position, 'position'),
        duration: Number.isFinite(entry.duration) && entry.duration > 0 ? entry.duration : 0,
        updatedAt: finite(entry.updatedAt, 'updatedAt')
    }
}

/**
 * Apply one change from a TV. Returns true when the state changed.
 * @param {{entries: Object, tombstones: Object}} state
 * @param {string} key
 * @param {{entry?: Object, deletedAt?: number}} change
 */
export function applyResumeChange(state, key, change) {
    assertKey(key)
    state.entries ||= {}
    state.tombstones ||= {}
    const current = state.entries[key]
    const tomb = state.tombstones[key] || 0

    if (change?.entry) {
        const next = sanitizeEntry(key, change.entry)
        if (next.updatedAt <= tomb) return false
        if (current && current.updatedAt >= next.updatedAt) return false
        state.entries[key] = next
        delete state.tombstones[key]
        return true
    }
    if (change && Number.isFinite(change.deletedAt)) {
        const deletedAt = finite(change.deletedAt, 'deletedAt')
        // Watched again after this delete was decided: the newer play wins.
        if (current && current.updatedAt > deletedAt) return false
        if (!current && tomb >= deletedAt) return false
        delete state.entries[key]
        state.tombstones[key] = Math.max(tomb, deletedAt)
        return true
    }
    throw new Error('change needs an entry or deletedAt')
}

/** Tombstone every file of a deleted torrent. Returns true when the state changed. */
export function tombstoneTorrent(state, infoHash, now = Date.now()) {
    const hash = String(infoHash || '').toLowerCase()
    let changed = false
    for (const key of Object.keys(state.entries || {})) {
        if (key.startsWith(`${hash}:`)) changed = applyResumeChange(state, key, { deletedAt: now }) || changed
    }
    return changed
}

/** Bound the store: newest MAX_ENTRIES positions, tombstones for TOMBSTONE_TTL_MS. */
export function pruneResume(state, now = Date.now()) {
    const entries = Object.entries(state.entries || {})
    if (entries.length > MAX_ENTRIES) {
        entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt)
        state.entries = Object.fromEntries(entries.slice(0, MAX_ENTRIES))
    }
    for (const [key, deletedAt] of Object.entries(state.tombstones || {})) {
        if (now - deletedAt > TOMBSTONE_TTL_MS) delete state.tombstones[key]
    }
}

/** Snapshot for clients: entries newest first, plus tombstones. */
export function listResume(state) {
    return {
        entries: Object.values(state.entries || {}).sort((a, b) => b.updatedAt - a.updatedAt),
        tombstones: { ...(state.tombstones || {}) }
    }
}
