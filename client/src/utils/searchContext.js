/** Add a film identity (see buildMovieTorrentContext) to /api/v2/search params. */
export function appendSearchContext(params, context) {
    if (!context) return params
    for (const [key, value] of Object.entries(context)) {
        if (value) params.set(key, value)
    }
    return params
}
