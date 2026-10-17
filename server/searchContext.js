/**
 * Film identity for a torrent search: local title, original title, year and
 * whether it is a series. jac.red matches these fields directly (as Lampa
 * sends them), which is more precise than matching a phrase against names.
 */

const clean = (value) => (typeof value === 'string' && value.trim()) ? value.trim() : null

/**
 * Read the identity from /api/v2/search query params.
 * @param {Object} params - req.query: title, original_title, year, is_serial ('1' movie, '2' series)
 * @returns {{title: string|null, originalTitle: string|null, year: number|null, isSerial: boolean}|null}
 *   null when no title is given (a plain text search)
 */
export function parseSearchContext(params = {}) {
    const title = clean(params.title)
    const originalTitle = clean(params.original_title)
    if (!title && !originalTitle) return null

    const year = /^\d{4}$/.test(String(params.year || '')) ? Number(params.year) : null
    return { title, originalTitle, year, isSerial: params.is_serial === '2' }
}

/** Cache key: a plain query keeps its old key, an identity gets its own entry. */
export function searchCacheKey(query, context) {
    if (!context) return query
    const kind = context.isSerial ? 'tv' : 'movie'
    return `${query}|${context.title || ''}|${context.originalTitle || ''}|${context.year || ''}|${kind}`
}
