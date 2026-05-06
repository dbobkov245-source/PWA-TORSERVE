/**
 * Helpers for deciding whether a media file is safe to serve directly from disk.
 *
 * On NAS filesystems torrent clients may create sparse/preallocated files where
 * stat.size already equals the final media length, but the actual allocated
 * blocks still contain only a tiny downloaded subset.
 */

/**
 * Return actually allocated bytes when the filesystem exposes block counts.
 * Falls back to logical size on platforms that do not report `stat.blocks`.
 *
 * @param {{ size?: number, blocks?: number }} stat
 * @returns {number}
 */
export function getAllocatedSizeBytes(stat) {
    if (typeof stat?.blocks === 'number' && Number.isFinite(stat.blocks) && stat.blocks >= 0) {
        return stat.blocks * 512
    }

    return typeof stat?.size === 'number' && Number.isFinite(stat.size)
        ? stat.size
        : 0
}

/**
 * Serve from disk only when the actually allocated bytes cover the whole file.
 *
 * @param {{ size?: number, blocks?: number }} stat
 * @param {number} expectedLength
 * @returns {boolean}
 */
export function shouldServeFileFromDisk(stat, expectedLength) {
    if (!Number.isFinite(expectedLength) || expectedLength <= 0) return false
    return getAllocatedSizeBytes(stat) >= expectedLength
}

/**
 * Map a (fileOffset, byteWithinFile) pair to its containing torrent piece index.
 *
 * @param {number} fileOffset - Byte offset of the file inside the torrent.
 * @param {number} byteWithinFile - Byte position within the file (e.g. Range start).
 * @param {number} pieceLength - Torrent piece length in bytes.
 * @returns {number}
 */
export function getStartPieceIndex(fileOffset, byteWithinFile, pieceLength) {
    const offset = Number.isFinite(fileOffset) ? fileOffset : 0
    const within = Number.isFinite(byteWithinFile) ? byteWithinFile : 0
    const len = Number.isFinite(pieceLength) && pieceLength > 0 ? pieceLength : 1
    return Math.floor((offset + within) / len)
}
