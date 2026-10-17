// No imports on purpose: posters, the movie page and serverApi all use this.

const isSeries = (item) => item?.media_type === 'tv' || Boolean(item?.name || item?.original_name)

/**
 * The film's identity as /api/v2/search and /api/quality-badges take it.
 * jac.red matches these fields (as Lampa sends them) instead of a phrase in
 * release names.
 * @returns {{title?: string, original_title?: string, year?: string, is_serial: '1'|'2'}|null}
 */
export function buildMovieTorrentContext(item) {
    const title = item?.title || item?.name || ''
    const originalTitle = item?.original_title || item?.original_name || ''
    if (!title && !originalTitle) return null

    const context = {}
    if (title) context.title = title
    if (originalTitle) context.original_title = originalTitle
    const serial = isSeries(item)
    // A series' first-air year would hide seasons released later, and a
    // non-empty answer skips the fallback queries. Movies keep their year.
    const date = serial ? '' : (item?.release_date || item?.first_air_date || '')
    if (date) context.year = date.substring(0, 4)
    context.is_serial = serial ? '2' : '1'
    return context
}

/** Add a film identity (see buildMovieTorrentContext) to /api/v2/search params. */
export function appendSearchContext(params, context) {
    if (!context) return params
    for (const [key, value] of Object.entries(context)) {
        if (value) params.set(key, value)
    }
    return params
}
