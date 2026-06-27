import express from 'express';
import { getSmartConfig, smartFetch } from '../utils/doh.js';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import { getCachedImage, cacheImage } from '../imageCache.js';
import {
    buildAmsterdamProxyRequest,
    shouldTryAmsterdamProxy
} from '../utils/amsterdamProxy.js';

const router = express.Router();

const AMSTERDAM_SECRET_HEADER = 'x-amsterdam-proxy-secret'
const AMSTERDAM_PROXY_TIMEOUT_MS = parseInt(process.env.AMSTERDAM_PROXY_TIMEOUT_MS || '6000', 10)

export function shouldUseAmsterdamProxy(targetUrl, options = {}) {
    const amsterdamProxyUrl = options.amsterdamProxyUrl ?? process.env.AMSTERDAM_PROXY_URL ?? ''
    const amsterdamProxySecret = options.amsterdamProxySecret ?? process.env.AMSTERDAM_PROXY_SECRET ?? ''

    return Boolean(amsterdamProxyUrl && amsterdamProxySecret) && shouldTryAmsterdamProxy(targetUrl)
}

export function buildAmsterdamProxyPlan(targetUrl, options = {}) {
    const amsterdamProxyUrl = options.amsterdamProxyUrl ?? process.env.AMSTERDAM_PROXY_URL ?? ''
    const amsterdamProxySecret = options.amsterdamProxySecret ?? process.env.AMSTERDAM_PROXY_SECRET ?? ''

    if (!amsterdamProxyUrl || !amsterdamProxySecret) return null

    const request = buildAmsterdamProxyRequest(targetUrl, { upstreamBaseUrl: amsterdamProxyUrl })
    if (!request) return null

    return {
        ...request,
        upstreamHeaders: {
            [AMSTERDAM_SECRET_HEADER]: amsterdamProxySecret
        }
    }
}

export function shouldFallbackFromAmsterdamStatus(statusCode) {
    return Number.isInteger(statusCode) && statusCode >= 500
}

export function shouldSkipProxyWrite(res, responseSettled = false) {
    return Boolean(responseSettled || res.headersSent || res.writableEnded || res.destroyed)
}

export function withTmdbApiKey(rawUrl, options = {}) {
    const tmdbApiKey = options.tmdbApiKey ?? process.env.TMDB_API_KEY ?? ''
    if (!tmdbApiKey) return rawUrl

    const targetUrl = new URL(rawUrl)
    if (targetUrl.hostname !== 'api.themoviedb.org' || targetUrl.searchParams.has('api_key')) {
        return rawUrl
    }

    targetUrl.searchParams.set('api_key', tmdbApiKey)
    return targetUrl.toString()
}

function getForwardHeaders(proxyRes) {
    const forwardHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'etag']
    return forwardHeaders.reduce((headers, key) => {
        if (proxyRes.headers[key]) headers[key] = proxyRes.headers[key]
        return headers
    }, {})
}

async function attemptAmsterdamProxy({ targetUrl, url, req, res }) {
    const plan = buildAmsterdamProxyPlan(targetUrl)
    if (!plan || !shouldUseAmsterdamProxy(targetUrl)) return false

    const upstream = new URL(plan.upstreamUrl)
    const isHttps = upstream.protocol === 'https:'
    const transport = isHttps ? https : http

    return await new Promise((resolve) => {
        const proxyReq = transport.request({
            method: 'GET',
            headers: {
                ...plan.upstreamHeaders,
                accept: req.headers.accept || '*/*'
            },
            hostname: upstream.hostname,
            port: upstream.port || (isHttps ? 443 : 80),
            path: upstream.pathname + upstream.search,
            servername: isHttps ? upstream.hostname : undefined,
            timeout: AMSTERDAM_PROXY_TIMEOUT_MS
        }, (proxyRes) => {
            if (shouldFallbackFromAmsterdamStatus(proxyRes.statusCode || 0)) {
                proxyRes.resume()
                resolve(false)
                return
            }

            res.status(proxyRes.statusCode || 200)
            for (const [key, value] of Object.entries(getForwardHeaders(proxyRes))) {
                res.set(key, value)
            }

            res.set('X-Proxy-Source', 'amsterdam')
            proxyRes.pipe(res)
            proxyRes.on('end', () => resolve(true))
            proxyRes.on('error', () => resolve(false))
        })

        proxyReq.on('timeout', () => {
            proxyReq.destroy()
            resolve(false)
        })

        proxyReq.on('error', () => resolve(false))
        proxyReq.end()
    })
}

// Allowlist for security (SSRF prevention)
const ALLOWED_DOMAINS = [
    'api.themoviedb.org',
    'image.tmdb.org',
    'kinopoiskapiunofficial.tech',
    'avatars.mds.yandex.net',
    'imagetmdb.com',
    'nl.imagetmdb.com',
    'de.imagetmdb.com',
    'pl.imagetmdb.com',
    'lampa.byskaz.ru'
];

// Bunny CDN (image.tmdb.org → tmdb-image-prod.b-cdn.net) GeoIP-blocks RU:
// its authoritative DNS returns 127.0.0.1 for RU clients, so direct fetch and
// even DoH-resolved fetch end up with ECONNREFUSED. Route through Lampa CDN
// mirrors (fast: 170-390ms from this NAS), wsrv.nl as the slow fallback
// (measured 5.9-154s, aborts mid-body under load → half-rendered posters).
const WSRV_PROXIED_HOSTS = new Set(['image.tmdb.org']);
const IMAGE_MIRROR_HOSTS = ['imagetmdb.com', 'nl.imagetmdb.com', 'de.imagetmdb.com', 'pl.imagetmdb.com'];
const IMAGE_MIRROR_TIMEOUT_MS = parseInt(process.env.IMAGE_MIRROR_TIMEOUT_MS || '2500', 10);

function buildWsrvUrl(originalUrl) {
    const u = new URL(originalUrl);
    const sslPath = `ssl:${u.hostname}${u.pathname}${u.search}`;
    return `https://wsrv.nl/?url=${encodeURIComponent(sslPath)}&output=webp`;
}

async function forwardImageResponse({ upstream, source, url, res }) {
    res.status(upstream.status);
    const forwardHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'etag'];
    for (const h of forwardHeaders) {
        const v = upstream.headers.get(h);
        if (v) res.set(h, v);
    }
    res.set('X-Proxy-Source', source);

    const buffer = Buffer.from(await upstream.arrayBuffer());

    // Disk-cache successful image fetches (mirrors the direct branch)
    if (upstream.status === 200 && isImageRequest(url)) {
        cacheImage(url, buffer).catch(() => {});
    }

    res.end(buffer);
}

async function streamViaImageMirrors({ url, req, res }) {
    const u = new URL(url);

    // Race all mirrors: one slow mirror must not serialize into its full
    // timeout before the next is tried (measured 5s penalty per poster).
    const attempts = IMAGE_MIRROR_HOSTS.map(async (host) => {
        const upstream = await fetch(`https://${host}${u.pathname}${u.search}`, {
            method: 'GET',
            headers: { accept: req.headers.accept || 'image/*' },
            signal: AbortSignal.timeout(IMAGE_MIRROR_TIMEOUT_MS)
        });
        if (!upstream.ok) throw new Error(`${host} HTTP ${upstream.status}`);
        return { upstream, host };
    });

    let winner;
    try {
        winner = await Promise.any(attempts);
    } catch (aggregate) {
        const first = aggregate?.errors?.[0];
        throw first || new Error('All image mirrors failed');
    }

    await forwardImageResponse({ upstream: winner.upstream, source: `mirror:${winner.host}`, url, res });
}

async function streamViaWsrv({ url, req, res }) {
    const wsrvUrl = buildWsrvUrl(url);
    const upstream = await fetch(wsrvUrl, {
        method: 'GET',
        headers: { accept: req.headers.accept || 'image/*' },
        signal: AbortSignal.timeout(20000)
    });

    await forwardImageResponse({ upstream, source: 'wsrv', url, res });
}

// O2: Check if URL is an image request (for disk caching)
const isImageRequest = (url) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const pathname = new URL(url).pathname.toLowerCase();
    return imageExtensions.some(ext => pathname.endsWith(ext)) ||
        url.includes('image.tmdb.org');
};

router.get('/', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const upstreamUrl = withTmdbApiKey(url);
        const targetUrl = new URL(upstreamUrl);

        if (!ALLOWED_DOMAINS.includes(targetUrl.hostname)) {
            console.warn(`[Proxy] 🚫 Blocked domain: ${targetUrl.hostname}`);
            return res.status(403).json({ error: 'Domain not allowed' });
        }

        const amsterdamHandled = await attemptAmsterdamProxy({ targetUrl, url: upstreamUrl, req, res })
        if (amsterdamHandled) {
            return
        }

        // O2: Check disk cache for images
        if (isImageRequest(upstreamUrl)) {
            const cachedPath = await getCachedImage(upstreamUrl);
            if (cachedPath) {
                // Serve from cache
                const ext = cachedPath.split('.').pop().toLowerCase();
                const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
                res.set('Content-Type', mimeMap[ext] || 'image/jpeg');
                res.set('X-Cache', 'HIT');
                res.set('Cache-Control', 'public, max-age=604800'); // 7 days
                return fs.createReadStream(cachedPath).pipe(res);
            }
        }

        // GeoIP-blocked image hosts: CDN mirrors first, wsrv.nl fallback
        if (WSRV_PROXIED_HOSTS.has(targetUrl.hostname)) {
            try {
                await streamViaImageMirrors({ url: upstreamUrl, req, res });
                return;
            } catch (mirrorErr) {
                console.warn(`[Proxy] image mirrors failed for ${targetUrl.hostname}: ${mirrorErr.message}`);
                if (res.headersSent) return;
            }
            try {
                await streamViaWsrv({ url: upstreamUrl, req, res });
                return;
            } catch (err) {
                console.warn(`[Proxy] wsrv fallback failed for ${targetUrl.hostname}: ${err.message}`);
                if (!res.headersSent) {
                    return res.status(502).json({ error: 'image proxy failed', details: err.message });
                }
                return;
            }
        }

        console.log(`[Proxy] 🔄 Fetching: ${upstreamUrl.replace(/api_key=[^&]+/, 'api_key=***')}`);

        // Get DoH resolved config
        const config = await getSmartConfig(upstreamUrl);

        const isHttps = targetUrl.protocol === 'https:';
        const options = {
            method: 'GET',
            headers: config.headers,
            timeout: 20000,
        };

        // 🔥 CRITICAL FIX: SNI Support
        if (config.resolvedIP) {
            options.hostname = config.resolvedIP;
            options.path = targetUrl.pathname + targetUrl.search;
            options.port = targetUrl.port || (isHttps ? 443 : 80);

            if (isHttps) {
                options.servername = config.hostname;
            }
        }

        const transport = isHttps ? https : http;
        const proxyReq = transport.request(config.resolvedIP ? options : upstreamUrl, (proxyRes) => {
            // Surface upstream socket aborts on the response stream so we can
            // close `res` and free the client socket. Without this listener,
            // an upstream RST mid-body either crashes Node ('error' event with
            // no listener) or, in the buffered-image branch below, leaves the
            // client request hanging forever because 'end' never fires.
            proxyRes.on('error', (err) => {
                console.warn(`[Proxy] upstream stream error: ${err.message} ${upstreamUrl.replace(/api_key=[^&]+/, 'api_key=***')}`);
                if (!res.headersSent) {
                    // Direct path failed before any bytes left our process —
                    // hand off to the existing fallback chain.
                    tryFallback(`upstream ${err.message}`);
                } else if (!res.writableEnded) {
                    res.destroy(err);
                }
            });

            res.status(proxyRes.statusCode);

            // Forward allowed headers
            const forwardHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'etag'];
            console.log(`[Proxy] 📥 Response ${proxyRes.statusCode}: ${proxyRes.headers['content-type']}`);
            for (const h of forwardHeaders) {
                if (proxyRes.headers[h]) {
                    res.set(h, proxyRes.headers[h]);
                }
            }
            res.set('X-Cache', 'MISS');

            // O2: Collect data for caching if image
            if (isImageRequest(upstreamUrl) && proxyRes.statusCode === 200) {
                const chunks = [];
                proxyRes.on('data', chunk => chunks.push(chunk));
                proxyRes.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    // Save to cache async (fire-and-forget)
                    cacheImage(upstreamUrl, buffer).catch(() => { });
                    res.end(buffer);
                });
            } else {
                proxyRes.pipe(res);
            }
        });

        proxyReq.on('error', (err) => {
            console.error('[Proxy] Request Error:', err.message, upstreamUrl.replace(/api_key=[^&]+/, 'api_key=***'));
            tryFallback(err.message);
        });

        proxyReq.on('timeout', () => {
            console.error('[Proxy] Timeout:', upstreamUrl.replace(/api_key=[^&]+/, 'api_key=***'));
            proxyReq.destroy();
            tryFallback('timeout');
        });

        // Last-resort fallback: smartFetch races the Worker proxy when
        // WORKER_PROXY_URL is set, so even a poisoned direct path recovers.
        // Only runs when no bytes have been sent yet.
        let fallbackTried = false;
        // Guard against a misbehaving upstream returning a huge payload via
        // the buffered smartFetch path. /api/proxy only fronts TMDB/KP/wsrv
        // (max ~5MB images), so anything beyond this cap is almost certainly
        // a bug or hostile response.
        const FALLBACK_MAX_BYTES = 25 * 1024 * 1024;
        async function tryFallback(reason) {
            if (fallbackTried || res.headersSent) {
                if (!res.headersSent) {
                    res.status(502).json({ error: 'Proxy request failed', details: reason });
                }
                return;
            }
            fallbackTried = true;
            try {
                const result = await smartFetch(upstreamUrl, { timeout: 20000, responseType: 'arraybuffer' });
                if (res.headersSent) return;
                const buffer = Buffer.isBuffer(result.data) ? result.data : Buffer.from(result.data || '');
                if (buffer.length > FALLBACK_MAX_BYTES) {
                    console.warn(`[Proxy] Fallback payload too large (${buffer.length} bytes), refusing: ${upstreamUrl.replace(/api_key=[^&]+/, 'api_key=***')}`);
                    res.status(502).json({ error: 'Proxy fallback payload too large' });
                    return;
                }
                res.status(result.status || 200);
                const ct = result.headers?.['content-type'];
                if (ct) res.set('content-type', ct);
                const cl = result.headers?.['content-length'];
                if (cl) res.set('content-length', cl);
                res.set('X-Proxy-Source', 'smartfetch-fallback');
                if (isImageRequest(upstreamUrl) && result.status === 200) {
                    cacheImage(upstreamUrl, buffer).catch(() => {});
                }
                res.end(buffer);
            } catch (fallErr) {
                console.error('[Proxy] Fallback failed:', fallErr.message, upstreamUrl.replace(/api_key=[^&]+/, 'api_key=***'));
                if (!res.headersSent) {
                    res.status(502).json({ error: 'Proxy request failed', details: `${reason}; fallback: ${fallErr.message}` });
                }
            }
        }

        proxyReq.end();

    } catch (err) {
        console.error('[Proxy] Fatal Error:', err.message, url);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal proxy error', details: err.message });
        }
    }
});

export default router;
