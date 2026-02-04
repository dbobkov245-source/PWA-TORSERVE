/**
 * Parse HTTP Range header (bytes=) into validated start/end.
 * Returns null for invalid ranges.
 */
export function parseRange(rangeHeader, totalLength) {
    if (!rangeHeader || typeof rangeHeader !== 'string') return null
    if (!Number.isFinite(totalLength) || totalLength <= 0) return null

    if (!rangeHeader.startsWith('bytes=')) return null
    const rangeValue = rangeHeader.slice('bytes='.length).trim()
    if (!rangeValue) return null

    const [startStr, endStr] = rangeValue.split('-')
    if (startStr === '' && endStr === '') return null

    let start = startStr === '' ? null : Number(startStr)
    let end = endStr === '' ? null : Number(endStr)

    if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return null
    if (start !== null && start < 0) return null
    if (end !== null && end < 0) return null

    // Suffix range: bytes=-N (last N bytes)
    if (start === null) {
        const suffixLength = end
        if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null
        start = suffixLength >= totalLength ? 0 : totalLength - suffixLength
        end = totalLength - 1
    } else {
        if (end === null || end >= totalLength) end = totalLength - 1
    }

    if (start > end || start >= totalLength) return null

    return { start, end }
}
