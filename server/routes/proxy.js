import express from 'express';
import { getSmartConfig } from '../utils/doh.js';
import { Readable } from 'stream';

const router = express.Router();

// Allowlist for security (SSRF prevention)
// Includes TMDB, Kinopoisk, and Image Mirrors
const ALLOWED_DOMAINS = [
    'api.themoviedb.org',
    'image.tmdb.org',
    'kinopoiskapiunofficial.tech',
    'avatars.mds.yandex.net', // KP images
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
        // 1. Validate Domain
        let hostname;
        try {
            hostname = new URL(url).hostname;
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        if (!ALLOWED_DOMAINS.includes(hostname)) {
            console.warn(`[Proxy] Blocked domain: ${hostname}`);
            return res.status(403).json({ error: 'Domain not allowed' });
        }

        // 2. Get Smart Config (DoH resolution)
        // This gives us the resolved IP to bypass DNS blocking
        const config = await getSmartConfig(url, {
            headers: {
                // Forward Client-Hints if present? Maybe simpler to stick to defaults
            }
        });

        // 3. Fetch with Stream
        // Using native fetch, which returns a web stream body
        const response = await fetch(config.url, {
            method: 'GET',
            headers: config.headers,
            // Timeout 20s for large images/slow APIs
            signal: AbortSignal.timeout(20000) 
        });

        // 4. Forward Headers & Status
        res.status(response.status);
        
        const forwardHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'etag'];
        for (const h of forwardHeaders) {
            if (response.headers.has(h)) {
                res.set(h, response.headers.get(h));
            }
        }

        // 5. Pipe Response to Express
        if (response.body) {
            Readable.fromWeb(response.body).pipe(res);
        } else {
            res.end();
        }

    } catch (err) {
        console.error('[Proxy] Error:', err.message, url);
        if (!res.headersSent) {
            const status = err.name === 'TimeoutError' ? 504 : 502;
            res.status(status).json({ error: 'Proxy request failed', details: err.message });
        }
    }
});

export default router;
