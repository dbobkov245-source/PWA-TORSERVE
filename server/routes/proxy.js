import express from 'express';
import { getSmartConfig } from '../utils/doh.js';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import { getCachedImage, cacheImage } from '../imageCache.js';

const router = express.Router();

export function shouldSkipProxyWrite(res, settled = false) {
    return Boolean(
        settled ||
        res?.headersSent ||
        res?.writableEnded ||
        res?.destroyed
    );
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
        let settled = false;
        const shouldSkipWrite = () => shouldSkipProxyWrite(res, settled);
        const fail = (statusCode, payload) => {
            if (shouldSkipWrite()) return;
            settled = true;
            res.status(statusCode).json(payload);
        };

        const targetUrl = new URL(url);

        if (!ALLOWED_DOMAINS.includes(targetUrl.hostname)) {
            console.warn(`[Proxy] 🚫 Blocked domain: ${targetUrl.hostname}`);
            return res.status(403).json({ error: 'Domain not allowed' });
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
            if (shouldSkipWrite()) {
                proxyRes.resume();
                return;
            }

            res.status(proxyRes.statusCode || 502);

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
                proxyRes.on('error', (err) => {
                    console.error('[Proxy] Upstream stream error:', err.message, url);
                    fail(502, { error: 'Proxy stream failed', details: err.message });
                });
                proxyRes.on('aborted', () => {
                    console.error('[Proxy] Upstream aborted:', url);
                    fail(502, { error: 'Proxy upstream aborted' });
                });
                proxyRes.on('end', () => {
                    if (shouldSkipWrite()) return;
                    const buffer = Buffer.concat(chunks);
                    // Save to cache async (fire-and-forget)
                    cacheImage(url, buffer).catch(() => { });
                    settled = true;
                    res.end(buffer);
                });
            } else {
                proxyRes.on('error', (err) => {
                    console.error('[Proxy] Pipe error:', err.message, url);
                    fail(502, { error: 'Proxy stream failed', details: err.message });
                });
                proxyRes.pipe(res);
            }
        });

        proxyReq.on('error', (err) => {
            console.error('[Proxy] Request Error:', err.message, url);
            fail(502, { error: 'Proxy request failed', details: err.message });
        });

        proxyReq.on('timeout', () => {
            console.error('[Proxy] Timeout:', url);
            proxyReq.destroy();
            fail(504, { error: 'Proxy timeout' });
        });

        res.on('close', () => {
            settled = true;
            try { proxyReq.destroy(); } catch (_) { /* ignore */ }
        });

        proxyReq.end();

    } catch (err) {
        console.error('[Proxy] Fatal Error:', err.message, url);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal proxy error', details: err.message });
        }
    }
});

export default router;
