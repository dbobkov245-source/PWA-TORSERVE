const ALLOWED_AMSTERDAM_HOSTS = new Set([
    'api.themoviedb.org',
    'image.tmdb.org'
])

function normalizeUrl(input) {
    if (input instanceof URL) return input
    return new URL(input)
}

export function shouldTryAmsterdamProxy(input) {
    const targetUrl = normalizeUrl(input)
    return ALLOWED_AMSTERDAM_HOSTS.has(targetUrl.hostname)
}

export function buildAmsterdamProxyRequest(input, { upstreamBaseUrl = 'http://127.0.0.1:4010' } = {}) {
    const targetUrl = normalizeUrl(input)

    if (!shouldTryAmsterdamProxy(targetUrl)) {
        return null
    }

    const prefix = targetUrl.hostname === 'image.tmdb.org' ? '/image' : '/tmdb'
    const upstreamPath = `${prefix}${targetUrl.pathname}${targetUrl.search}`
    const upstreamUrl = new URL(upstreamPath, upstreamBaseUrl).toString()

    return {
        targetUrl: targetUrl.toString(),
        targetHost: targetUrl.hostname,
        targetPath: targetUrl.pathname,
        targetQuery: targetUrl.search,
        upstreamBaseUrl,
        upstreamPath,
        upstreamUrl
    }
}
