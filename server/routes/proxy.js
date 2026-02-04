import express from 'express';
import { getSmartConfig } from '../utils/doh.js';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const router = express.Router();

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

        console.log(`[Proxy] 🔄 Fetching: ${url}`);

        // Get DoH resolved config
        const config = await getSmartConfig(url);

        const isHttps = targetUrl.protocol === 'https:';
        const options = {
            method: 'GET',
            headers: config.headers,
            timeout: 20000,
        };

        // 🔥 CRITICAL FIX: SNI Support
        // If we have a resolved IP, we use it for the connection but keep the hostname for TLS SNI
        if (config.resolvedIP) {
            options.hostname = config.resolvedIP;
            options.path = targetUrl.pathname + targetUrl.search;
            options.port = targetUrl.port || (isHttps ? 443 : 80);

            if (isHttps) {
                options.servername = config.hostname; // This is the SNI part
            }
        }

        const transport = isHttps ? https : http;
        const proxyReq = transport.request(config.resolvedIP ? options : url, (proxyRes) => {
            // Forward status
            res.status(proxyRes.statusCode);

            // Forward allowed headers
            const forwardHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'src'];
            console.log(`[Proxy] 📥 Response ${proxyRes.statusCode}: ${proxyRes.headers['content-type']}`);
            for (const h of forwardHeaders) {
                if (proxyRes.headers[h]) {
                    res.set(h, proxyRes.headers[h]);
                }
            }

            // Pipe data
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('[Proxy] Request Error:', err.message, url);
            if (!res.headersSent) {
                res.status(502).json({ error: 'Proxy request failed', details: err.message });
            }
        });

        proxyReq.on('timeout', () => {
            console.error('[Proxy] Timeout:', url);
            proxyReq.destroy();
            if (!res.headersSent) {
                res.status(504).json({ error: 'Proxy timeout' });
            }
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
