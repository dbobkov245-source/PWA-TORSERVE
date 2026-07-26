/**
 * Turn an /api/add failure response into something a TV user can act on.
 *
 * The route answers 503 with both halves of the story when the native
 * engine times out: `error` is why the torrent-stream swarm gave up, and
 * `fallbackError` is why the TorrServer sidecar did not take over. Showing
 * only "HTTP 500" hid an unreachable sidecar for days.
 *
 * @param {number} status HTTP status code
 * @param {{ error?: string, fallbackError?: string } | null | undefined} payload parsed JSON body
 * @returns {string}
 */
export function describeAddTorrentError(status, payload) {
    const reason = payload?.error || `HTTP ${status}`
    if (!payload?.fallbackError) return reason
    return `${reason}\nTorrServer: ${payload.fallbackError}`
}
