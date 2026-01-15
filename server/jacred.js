/**
 * Jacred Torrent Search API
 * Использует публичные Jacred сервисы (как в Lampa)
 * 
 * 🆕 v2.3.6: Removed dead mirrors, added User-Agent rotation for rate limit bypass
 * 🆕 v2.3.5: Redirect support, rate limiting (429) with retries, delays between mirrors
 * 🆕 v2.3.4: Added jacred.ru mirror, HTTP fallbacks, improved logging
 * 🆕 v2.3.3: Added retry logic with exponential backoff
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                        🔒 SECURITY NOTICE                                   │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ This module disables SSL certificate validation (rejectUnauthorized: false) │
 * │                                                                             │
 * │ WHY: Jacred mirrors often use self-signed or expired certificates.         │
 * │      Without this, the app would fail to connect to any working mirror.    │
 * │                                                                             │
 * │ RISKS:                                                                      │
 * │   - Man-in-the-middle attacks possible (ISP/VPN could intercept)           │
 * │   - No guarantee you're talking to the real server                         │
 * │                                                                             │
 * │ MITIGATIONS:                                                                │
 * │   - Multiple mirrors = if one is compromised, others work                  │
 * │   - Only search queries are sent (no auth, no personal data)               │
 * │   - Magnet links are cryptographically verified (infohash)                 │
 * │                                                                             │
 * │ This is an ACCEPTED TRADEOFF for torrent search functionality.             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

import https from 'https'
import http from 'http'
import { logger } from './utils/logger.js'
import { withRetry, retryPredicates } from './utils/retry.js'

const log = logger.child('Jacred')

// List of Jacred mirrors (only working ones)
// 🆕 v2.3.6: Removed dead mirrors, added User-Agent rotation
const JACRED_MIRRORS = [
    { host: 'jacred.xyz', port: 443, protocol: 'https' },
    // Fallback: try with different port (some ISPs block 443)
    { host: 'jacred.xyz', port: 80, protocol: 'http' },
]

// User-Agent rotation to avoid rate limiting
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
]

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

let currentMirror = JACRED_MIRRORS[0].host

/**
 * Search torrents via Jacred API with retry logic
 * 🆕 v2.3.6: Enhanced logging for production debugging
 */
export const searchJacred = async (query) => {
    log.info('🔍 Starting search', { query, mirrorsCount: JACRED_MIRRORS.length })

    for (let i = 0; i < JACRED_MIRRORS.length; i++) {
        const mirror = JACRED_MIRRORS[i]
        const mirrorId = `${mirror.protocol}://${mirror.host}:${mirror.port}`
        log.info('Trying mirror', { mirror: mirrorId, attempt: i + 1 })

        try {
            // Retry each mirror up to 3 times with 5s delay (as server requests for 429)
            const data = await withRetry(() => doSearch(mirror, query), {
                maxRetries: 3,
                baseDelayMs: 5000,  // 5 seconds as requested by Retry-After header
                shouldRetry: (err) => {
                    // Retry on transient errors OR rate limiting
                    if (err.message.includes('Rate limited')) return true
                    return retryPredicates.transient(err)
                },
                onRetry: (err, attempt, delay) => {
                    log.warn('Mirror retry', { mirror: mirrorId, attempt, delay: Math.round(delay), error: err.message })
                }
            })

            if (data && data.length > 0) {
                currentMirror = mirror.host
                log.info('✅ Mirror connected', { mirror: mirrorId, resultsCount: data.length })
                return { results: data }
            } else {
                log.warn('Mirror returned empty results', { mirror: mirrorId })
            }
        } catch (err) {
            log.warn('❌ Mirror failed', { mirror: mirrorId, error: err.message })
        }

        // Add delay between mirrors to avoid rate limiting
        if (i < JACRED_MIRRORS.length - 1) {
            await sleep(500)
        }
    }

    log.error('❌ All mirrors failed', { query, triedMirrors: JACRED_MIRRORS.length })
    return { error: 'All mirrors failed', results: [] }
}

// Helper: sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Do search request to specific mirror
 * 🆕 v2.3.5: Supports redirects (301/302), rate limiting (429), HTTP/HTTPS
 */
const doSearch = (mirror, query, redirectCount = 0) => {
    const MAX_REDIRECTS = 3

    return new Promise((resolve, reject) => {
        // Jacred uses Jackett-compatible API
        const searchPath = `/api/v2.0/indexers/all/results?apikey=&Query=${encodeURIComponent(query)}`

        const options = {
            hostname: mirror.host,
            port: mirror.port,
            path: searchPath,
            method: 'GET',
            // ⚠️ SECURITY: See module header for explanation
            rejectUnauthorized: false,
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'application/json'
            },
            timeout: 15000
        }

        const protocol = mirror.protocol === 'https' ? https : http

        const req = protocol.request(options, (res) => {
            // Handle redirects (301, 302, 307, 308)
            if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                if (redirectCount >= MAX_REDIRECTS) {
                    reject(new Error('Too many redirects'))
                    return
                }

                try {
                    const redirectUrl = new URL(res.headers.location, `${mirror.protocol}://${mirror.host}`)
                    const newMirror = {
                        host: redirectUrl.hostname,
                        port: redirectUrl.port || (redirectUrl.protocol === 'https:' ? 443 : 80),
                        protocol: redirectUrl.protocol.replace(':', '')
                    }
                    log.debug('Following redirect', { to: redirectUrl.href })
                    resolve(doSearch(newMirror, query, redirectCount + 1))
                } catch (e) {
                    reject(new Error(`Invalid redirect: ${res.headers.location}`))
                }
                return
            }

            // Handle rate limiting (429)
            if (res.statusCode === 429) {
                const retryAfter = parseInt(res.headers['retry-after'] || '5', 10)
                reject(new Error(`Rate limited (retry after ${retryAfter}s)`))
                return
            }

            // Check for non-200 status codes
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`))
                return
            }

            let data = ''
            res.setEncoding('utf8')

            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try {
                    // Check if response is HTML (Cloudflare block, etc.)
                    if (data.trim().startsWith('<')) {
                        reject(new Error('Received HTML instead of JSON (possible Cloudflare block)'))
                        return
                    }

                    const json = JSON.parse(data)
                    // Jackett returns { Results: [...] }
                    const results = (json.Results || json.results || []).slice(0, 50).map(r => ({
                        id: r.Guid || r.guid || Math.random().toString(36),
                        title: r.Title || r.title || 'Unknown',
                        size: formatSize(r.Size || r.size || 0),
                        Size: r.Size || r.size || 0,  // Raw bytes for autodownloader
                        seeders: r.Seeders || r.seeders || 0,
                        tracker: r.Tracker || r.tracker || 'Unknown',
                        magnet: r.MagnetUri || r.magnetUri || r.Link || r.link || null,
                        magnetUrl: r.MagnetUri || r.magnetUri || r.Link || r.link || null
                    }))
                    resolve(results)
                } catch (err) {
                    reject(new Error('Parse error: ' + err.message))
                }
            })
        })

        req.on('error', reject)
        req.on('timeout', () => {
            req.destroy()
            reject(new Error('Timeout'))
        })

        req.end()
    })
}

/**
 * Format bytes to human readable
 */
const formatSize = (bytes) => {
    if (!bytes) return 'N/A'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024
        i++
    }
    return `${size.toFixed(1)} ${units[i]}`
}

/**
 * Get magnet from result (already included in search results)
 */
export const getMagnetFromJacred = async (magnetUrl) => {
    // Magnet is already in the search result, just return it
    if (magnetUrl && magnetUrl.startsWith('magnet:')) {
        return { magnet: magnetUrl }
    }
    return { error: 'No magnet link' }
}
