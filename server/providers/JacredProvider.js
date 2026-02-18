/**
 * JacredProvider - Jacred torrent search provider
 * PWA-TorServe Provider Architecture
 * 
 * Implements Jacred API search with:
 * - Mirror rotation
 * - User-Agent rotation
 * - DoH + Worker proxy fallback (via smartFetch)
 * - Rate limiting (429) handling
 * 
 * Security note: SSL validation disabled for Jacred mirrors
 * (see header comments in original jacred.js for explanation)
 */

import { BaseProvider, formatSize } from './BaseProvider.js'
import { logger } from '../utils/logger.js'
import { smartFetch } from '../utils/doh.js'

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
const JACRED_TIMEOUT_MS = parseInt(process.env.JACRED_TIMEOUT_MS || '9000', 10)

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
        let allRateLimited = true

        for (let i = 0; i < JACRED_MIRRORS.length; i++) {
            const mirror = JACRED_MIRRORS[i]
            const mirrorId = `${mirror.protocol}://${mirror.host}:${mirror.port}`
            log.info('Trying mirror', { mirror: mirrorId, attempt: i + 1 })

            try {
                const data = await this._doSearch(mirror, query)
                hadSuccessfulResponse = true
                allRateLimited = false

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
                if (!err.message.includes('Rate limited')) {
                    allRateLimited = false
                }
            }

            if (i < JACRED_MIRRORS.length - 1) {
                await sleep(500)
            }
        }

        // Do not poison circuit breaker on temporary rate-limit bursts.
        if (!hadSuccessfulResponse && allRateLimited) {
            log.warn('All mirrors rate-limited, returning empty set for this cycle', { query })
            return []
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
    async _doSearch(mirror, query) {
        const url = `${mirror.protocol}://${mirror.host}:${mirror.port}/api/v2.0/indexers/all/results?apikey=&Query=${encodeURIComponent(query)}`
        const response = await smartFetch(url, {
            doh: 'dns-only',
            timeout: JACRED_TIMEOUT_MS,
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'application/json'
            }
        })

        if (response.status === 429) {
            const retryAfter = parseInt(response.headers?.['retry-after'] || '5', 10)
            throw new Error(`Rate limited (retry after ${retryAfter}s)`)
        }
        if (response.status >= 400) {
            throw new Error(`HTTP ${response.status}`)
        }

        const payload = response.data
        if (typeof payload === 'string' && payload.trim().startsWith('<')) {
            throw new Error('Received HTML instead of JSON (possible Cloudflare block)')
        }

        const json = typeof payload === 'string' ? JSON.parse(payload) : payload
        const rawResults = (json?.Results || json?.results || []).slice(0, 50)

        return rawResults.map(r =>
            this.normalizeResult({
                id: r.Guid || r.guid || Math.random().toString(36),
                title: r.Title || r.title || 'Unknown',
                size: formatSize(r.Size || r.size || 0),
                sizeBytes: r.Size || r.size || 0,
                date: r.PublishDate || r.publishDate || null,
                seeders: r.Seeders || r.seeders || 0,
                tracker: r.Tracker || r.tracker || 'Unknown',
                magnet: r.MagnetUri || r.magnetUri || r.Link || r.link || null
            })
        )
    }
}
