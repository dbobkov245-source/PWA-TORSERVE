/**
 * Cloudflare Worker — Generic HTTP Proxy for ISP-blocked torrent sites
 *
 * DEPLOY: Cloudflare Dashboard → Workers & Pages → Create →
 *         paste this code → Deploy
 *
 * Usage: https://<worker>.workers.dev/?url=<encoded_target_url>
 * POST:  forwards body, headers, cookies
 *
 * Security: PROXY_SECRET env var (optional) restricts access
 */

const ALLOWED_HOSTS = [
  'rutracker.org', 'rutracker.nl', 'rutracker.net',
  'rutor.info', 'rutor.is',
  'megapeer.vip', 'megapeer.org',
  'kinozal.tv', 'kinozal.guru',
  'nnmclub.to', 'nnm-club.me',
  'jacred.xyz',
  'torlook.info', 'torlook.cc',
]

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        }
      })
    }

    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')

    if (!targetUrl) {
      return new Response('Usage: ?url=<target_url>', { status: 400 })
    }

    // Optional secret check
    if (env.PROXY_SECRET) {
      const secret = url.searchParams.get('secret') || request.headers.get('X-Proxy-Secret')
      if (secret !== env.PROXY_SECRET) {
        return new Response('Forbidden', { status: 403 })
      }
    }

    // Validate target host
    let target
    try {
      target = new URL(targetUrl)
    } catch {
      return new Response('Invalid URL', { status: 400 })
    }

    if (!ALLOWED_HOSTS.includes(target.hostname)) {
      return new Response(`Host not allowed: ${target.hostname}`, { status: 403 })
    }

    // Forward request
    const headers = new Headers()

    // Forward essential headers from original request
    for (const [key, value] of request.headers.entries()) {
      const k = key.toLowerCase()
      if (['cookie', 'content-type', 'accept', 'accept-language', 'referer'].includes(k)) {
        headers.set(key, value)
      }
    }

    // Override with custom headers from X-Forward-* prefix
    for (const [key, value] of request.headers.entries()) {
      if (key.toLowerCase().startsWith('x-forward-')) {
        const realHeader = key.substring(10) // strip 'x-forward-'
        headers.set(realHeader, value)
      }
    }

    // Set Host and User-Agent
    headers.set('Host', target.hostname)
    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    }

    const fetchOptions = {
      method: request.method,
      headers,
      redirect: 'manual', // Don't follow redirects, let caller handle
    }

    // Forward body for POST
    if (request.method === 'POST') {
      fetchOptions.body = await request.text()
    }

    try {
      const response = await fetch(targetUrl, fetchOptions)

      // Buffer entire response (prevents ISP stream interruption)
      const body = await response.arrayBuffer()

      // Build response headers
      const respHeaders = new Headers()
      respHeaders.set('Access-Control-Allow-Origin', '*')
      respHeaders.set('Access-Control-Expose-Headers', '*')

      // Forward response headers
      for (const [key, value] of response.headers.entries()) {
        const k = key.toLowerCase()
        if (['content-type', 'location'].includes(k)) {
          respHeaders.set(key, value)
        }
      }

      // Forward set-cookie as JSON array in custom header (Workers can't forward
      // multiple set-cookie reliably through standard headers)
      const setCookies = response.headers.getAll
        ? response.headers.getAll('set-cookie')  // CF Workers runtime
        : response.headers.getSetCookie?.() || [] // Standard
      if (setCookies.length > 0) {
        respHeaders.set('X-Set-Cookie-Json', JSON.stringify(setCookies))
      }

      // Set correct content-length for buffered response
      respHeaders.set('Content-Length', body.byteLength.toString())

      return new Response(body, {
        status: response.status,
        headers: respHeaders,
      })
    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, { status: 502 })
    }
  }
}
