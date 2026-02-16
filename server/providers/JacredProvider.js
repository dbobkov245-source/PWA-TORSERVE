/**
 * JacredProvider - Jacred torrent search provider
 * PWA-TorServe Provider Architecture
 * 
 * Implements Jacred API search with:
 * - Mirror rotation
 * - User-Agent rotation
 * - Retry with exponential backoff
 * - Rate limiting (429) handling
 * 
 * Security note: SSL validation disabled for Jacred mirrors
 * (see header comments in original jacred.js for explanation)
 */

import https from 'https'
import http from 'http'
import { BaseProvider, formatSize } from './BaseProvider.js'
import { logger } from '../utils/logger.js'
import { withRetry, retryPredicates } from '../utils/retry.js'

const log = logger.child('JacredProvider')

// Jacred mirrors — HTTP first (HTTPS often blocked by ISP on port 443)
const JACRED_MIRRORS = [
    { host: 'jacred.xyz', port: 80, protocol: 'http' },
    { host: 'jacred.xyz', port: 443, protocol: 'https' },
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
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export class JacredProvider extends BaseProvider {
    name = 'jacred'

    constructor() {
        super()
        this.currentMirror = JACRED_MIRRORS[0].host
    }

    /**
     * Search torrents via Jacred API
     * @param {string} query
     * @returns {Promise<Array>} Normalized SearchResult[]
     */
    async search(query) {
        log.info('🔍 Starting search', { query, mirrorsCount: JACRED_MIRRORS.length })
        let hadSuccessfulResponse = false
        let lastError = null

        for (let i = 0; i < JACRED_MIRRORS.length; i++) {
            const mirror = JACRED_MIRRORS[i]
            const mirrorId = `${mirror.protocol}://${mirror.host}:${mirror.port}`
            log.info('Trying mirror', { mirror: mirrorId, attempt: i + 1 })

            try {
                const data = await withRetry(() => this._doSearch(mirror, query), {
                    maxRetries: 2,
                    baseDelayMs: 2500,
                    shouldRetry: (err) => {
                        // Fail fast on 429 to avoid locking search flow for user queries.
                        if (err.message.includes('Rate limited')) return false
                        return retryPredicates.transient(err)
                    },
                    onRetry: (err, attempt, delay) => {
                        log.warn('Mirror retry', { mirror: mirrorId, attempt, delay: Math.round(delay), error: err.message })
                    }
                })

                hadSuccessfulResponse = true

                if (data && data.length > 0) {
                    this.currentMirror = mirror.host
                    log.info('✅ Mirror connected', { mirror: mirrorId, resultsCount: data.length })
                    return data
                } else {
                    log.warn('Mirror returned empty results', { mirror: mirrorId })
                }
            } catch (err) {
                lastError = err
                log.warn('❌ Mirror failed', { mirror: mirrorId, error: err.message })
            }

            if (i < JACRED_MIRRORS.length - 1) {
                await sleep(500)
            }
        }

        if (!hadSuccessfulResponse && lastError) {
            log.error('❌ All mirrors failed', { query, triedMirrors: JACRED_MIRRORS.length, error: lastError.message })
            throw new Error(`Jacred unavailable: ${lastError.message}`)
        }

        log.warn('All mirrors returned empty results', { query, triedMirrors: JACRED_MIRRORS.length })
        return []
    }

    /**
     * Get magnet from result (already included in search results)
     * @param {string} magnetUrl
     * @returns {Promise<{magnet: string}|{error: string}>}
     */
    async getMagnet(magnetUrl) {
        if (magnetUrl && magnetUrl.startsWith('magnet:')) {
            return { magnet: magnetUrl }
        }
        return { error: 'No magnet link' }
    }

    /**
     * Do search request to specific mirror
     * @private
     */
    _doSearch(mirror, query, redirectCount = 0) {
        const MAX_REDIRECTS = 3

        return new Promise((resolve, reject) => {
            const searchPath = `/api/v2.0/indexers/all/results?apikey=&Query=${encodeURIComponent(query)}`

            const options = {
                hostname: mirror.host,
                port: mirror.port,
                path: searchPath,
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'application/json'
                },
                timeout: 15000
            }

            const protocol = mirror.protocol === 'https' ? https : http

            const req = protocol.request(options, (res) => {
                // Handle redirects
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
                        resolve(this._doSearch(newMirror, query, redirectCount + 1))
                    } catch (e) {
                        reject(new Error(`Invalid redirect: ${res.headers.location}`))
                    }
                    return
                }

                // Handle rate limiting
                if (res.statusCode === 429) {
                    const retryAfter = parseInt(res.headers['retry-after'] || '5', 10)
                    reject(new Error(`Rate limited (retry after ${retryAfter}s)`))
                    return
                }

                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`))
                    return
                }

                let data = ''
                res.setEncoding('utf8')

                res.on('data', chunk => data += chunk)
                res.on('end', () => {
                    try {
                        if (data.trim().startsWith('<')) {
                            reject(new Error('Received HTML instead of JSON (possible Cloudflare block)'))
                            return
                        }

                        const json = JSON.parse(data)
                        const results = (json.Results || json.results || []).slice(0, 50).map(r =>
                            this.normalizeResult({
                                id: r.Guid || r.guid || Math.random().toString(36),
                                title: r.Title || r.title || 'Unknown',
                                size: formatSize(r.Size || r.size || 0),
                                sizeBytes: r.Size || r.size || 0,
                                date: r.PublishDate || r.publishDate || null,  // API v2: date support
                                seeders: r.Seeders || r.seeders || 0,
                                tracker: r.Tracker || r.tracker || 'Unknown',
                                magnet: r.MagnetUri || r.magnetUri || r.Link || r.link || null
                            })
                        )
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
}
