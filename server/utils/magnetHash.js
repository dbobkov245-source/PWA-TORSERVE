const BTIH_RE = /xt=urn:btih:([0-9a-f]{32,64})/i

/**
 * Extract the BitTorrent info-hash (btih) from a magnet URI.
 * Returns the hash as a lowercase hex string, or null if not found.
 *
 * @param {string} magnet
 * @returns {string|null}
 */
export function extractBtihFromMagnet(magnet) {
    if (!magnet) return null
    const m = magnet.match(BTIH_RE)
    return m ? m[1].toLowerCase() : null
}

/**
 * Check whether a magnet URI's infoHash starts with the given query string.
 * Supports full-hash or prefix (partial) matching.
 * Only matches against the actual btih value — never tracker URLs or other fields.
 *
 * @param {string} magnet
 * @param {string} query  - Full or prefix hash (case-insensitive)
 * @returns {boolean}
 */
export function isMagnetHashMatch(magnet, query) {
    if (!magnet || !query) return false
    const hash = extractBtihFromMagnet(magnet)
    if (!hash) return false
    return hash.startsWith(query.toLowerCase())
}
