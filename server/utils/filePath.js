import path from 'path'

/**
 * Safely join a base download directory with a torrent name.
 * Throws if the resolved path escapes the base directory (path traversal attempt).
 *
 * @param {string} base  - Absolute download directory (e.g. /downloads)
 * @param {string} name  - Torrent name from DB (potentially untrusted)
 * @returns {string}     - Safe resolved path
 * @throws {Error}       - If name would escape the base directory
 */
export function safeJoinDownloadPath(base, name) {
    const normalizedBase = path.resolve(base)
    const resolved = path.resolve(base, name)

    if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
        throw new Error(`Path traversal attempt: "${name}" escapes download directory`)
    }

    return resolved
}
