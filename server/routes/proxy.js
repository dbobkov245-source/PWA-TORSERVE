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
// even DoH-resolved fetch end up with ECONNREFUSED. Route through wsrv.nl
// (Netherlands-based image proxy) which still resolves the real CDN IP.
const WSRV_PROXIED_HOSTS = new Set(['image.tmdb.org']);

function buildWsrvUrl(originalUrl) {
    const u = new URL(originalUrl);
    const sslPath = `ssl:${u.hostname}${u.pathname}${u.search}`;
    return `https://wsrv.nl/?url=${encodeURIComponent(sslPath)}&output=webp`;
}

async function streamViaWsrv({ url, req, res }) {
    const wsrvUrl = buildWsrvUrl(url);
    const upstream = await fetch(wsrvUrl, {
        method: 'GET',
        headers: { accept: req.headers.accept || 'image/*' },
        signal: AbortSignal.timeout(20000)
    });

    res.status(upstream.status);
    const forwardHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'etag'];
    for (const h of forwardHeaders) {
        const v = upstream.headers.get(h);
        if (v) res.set(h, v);
    }
    res.set('X-Proxy-Source', 'wsrv');

    const buffer = Buffer.from(await upstream.arrayBuffer());

    // Disk-cache successful image fetches (mirrors the direct branch)
    if (upstream.status === 200 && isImageRequest(url)) {
        cacheImage(url, buffer).catch(() => {});
    }

    res.end(buffer);
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
        const targetUrl = new URL(url);

        if (!ALLOWED_DOMAINS.includes(targetUrl.hostname)) {
            console.warn(`[Proxy] 🚫 Blocked domain: ${targetUrl.hostname}`);
            return res.status(403).json({ error: 'Domain not allowed' });
        }

        const amsterdamHandled = await attemptAmsterdamProxy({ targetUrl, url, req, res })
        if (amsterdamHandled) {
            return
        }

        // O2: Check disk cache for images
        if (isImageRequest(url)) {
            const cachedPath = await getCachedImage(url);
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

        // Route GeoIP-blocked hosts through wsrv.nl (e.g. image.tmdb.org)
        if (WSRV_PROXIED_HOSTS.has(targetUrl.hostname)) {
            try {
                await streamViaWsrv({ url, req, res });
                return;
            } catch (err) {
                console.warn(`[Proxy] wsrv fallback failed for ${targetUrl.hostname}: ${err.message}`);
                if (!res.headersSent) {
                    return res.status(502).json({ error: 'wsrv proxy failed', details: err.message });
                }
                return;
            }
        }

        console.log(`[Proxy] 🔄 Fetching: ${url.replace(/api_key=[^&]+/, 'api_key=***')}`);

        // Get DoH resolved config
        const config = await getSmartConfig(url);

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
        const proxyReq = transport.request(config.resolvedIP ? options : url, (proxyRes) => {
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
            if (isImageRequest(url) && proxyRes.statusCode === 200) {
                const chunks = [];
                proxyRes.on('data', chunk => chunks.push(chunk));
                proxyRes.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    // Save to cache async (fire-and-forget)
                    cacheImage(url, buffer).catch(() => { });
                    res.end(buffer);
                });
            } else {
                proxyRes.pipe(res);
            }
        });

        proxyReq.on('error', (err) => {
            console.error('[Proxy] Request Error:', err.message, url);
            tryFallback(err.message);
        });

        proxyReq.on('timeout', () => {
            console.error('[Proxy] Timeout:', url);
            proxyReq.destroy();
            tryFallback('timeout');
        });

        // Last-resort fallback: smartFetch races the Worker proxy when
        // WORKER_PROXY_URL is set, so even a poisoned direct path recovers.
        // Only runs when no bytes have been sent yet.
        let fallbackTried = false;
        async function tryFallback(reason) {
            if (fallbackTried || res.headersSent) {
                if (!res.headersSent) {
                    res.status(502).json({ error: 'Proxy request failed', details: reason });
                }
                return;
            }
            fallbackTried = true;
            try {
                const result = await smartFetch(url, { timeout: 20000, responseType: 'arraybuffer' });
                if (res.headersSent) return;
                res.status(result.status || 200);
                const ct = result.headers?.['content-type'];
                if (ct) res.set('content-type', ct);
                const cl = result.headers?.['content-length'];
                if (cl) res.set('content-length', cl);
                res.set('X-Proxy-Source', 'smartfetch-fallback');
                const buffer = Buffer.isBuffer(result.data) ? result.data : Buffer.from(result.data || '');
                if (isImageRequest(url) && result.status === 200) {
                    cacheImage(url, buffer).catch(() => {});
                }
                res.end(buffer);
            } catch (fallErr) {
                console.error('[Proxy] Fallback failed:', fallErr.message, url);
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
