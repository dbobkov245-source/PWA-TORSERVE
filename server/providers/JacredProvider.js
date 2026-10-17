/**
 * JacredProvider - Jacred torrent search provider
 * PWA-TorServe Provider Architecture
 * 
 * Implements Jacred API search with:
 * - Mirror rotation (jac.red primary, jacred.xyz fallback)
 * - User-Agent rotation
 * - DoH + Worker proxy fallback (via smartFetch)
 * - Rate limiting (429) handling: wait + retry
 * - Request coalescing: deduplicate parallel identical queries
 * 
 * Security note: SSL validation disabled for Jacred mirrors
 * (see header comments in original jacred.js for explanation)
 */

import { BaseProvider, formatSize } from './BaseProvider.js'
import { logger } from '../utils/logger.js'
import { smartFetch } from '../utils/doh.js'

const log = logger.child('JacredProvider')

// Jacred mirrors — jac.red is the new primary domain (jacred.xyz is dead since ~March 2026)
const JACRED_MIRRORS = [
    { host: 'jac.red', port: 80, protocol: 'http' },
    { host: 'jacred.xyz', port: 80, protocol: 'http' },   // legacy fallback
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
const JACRED_TIMEOUT_MS = parseInt(process.env.JACRED_TIMEOUT_MS || '15000', 10)

// Max ms to wait on a 429 retry-after before giving up
const MAX_RATE_LIMIT_WAIT_MS = 10000

export class JacredProvider extends BaseProvider {
    name = 'jacred'

    constructor() {
        super()
        this.currentMirror = JACRED_MIRRORS[0].host
        // In-flight request map for coalescing: query -> Promise
        this._inflight = new Map()
    }

    /**
     * Search torrents via Jacred API
     * Uses request coalescing to avoid duplicate parallel requests (which cause 429).
     * @param {string} query
     * @param {{title?: string, originalTitle?: string, year?: number, isSerial?: boolean}} [context]
     *   the film being looked up; lets jac.red match its title fields, year and type
     * @returns {Promise<Array>} Normalized SearchResult[]
     */
    async search(query, context = null) {
        const key = `${query.toLowerCase().trim()}|${contextKey(context)}`

        // COALESCING: if an identical query is already in-flight, share the result
        if (this._inflight.has(key)) {
            log.debug('⚡ Coalesced request (in-flight)', { query })
            return this._inflight.get(key)
        }

        const promise = this._search(query, context)
            .finally(() => this._inflight.delete(key))

        this._inflight.set(key, promise)
        return promise
    }

    /**
     * Internal search — executes actual HTTP requests
     * @private
     */
    async _search(query, context = null) {
        log.info('🔍 Starting search', { query, mirrorsCount: JACRED_MIRRORS.length })
        let hadSuccessfulResponse = false
        let lastError = null
        let allRateLimited = true

        for (let i = 0; i < JACRED_MIRRORS.length; i++) {
            const mirror = JACRED_MIRRORS[i]
            const mirrorId = `${mirror.protocol}://${mirror.host}:${mirror.port}`
            log.info('Trying mirror', { mirror: mirrorId, attempt: i + 1 })

            try {
                // The film's identity first (Lampa's full request), then a title
                // match; free text such as "Andor season 1" may match no title,
                // so retry it as a phrase.
                let data = []
                if (hasIdentity(context)) {
                    data = await this._doSearch(mirror, query, { byTitle: true, context })
                }
                if (data.length === 0) {
                    data = await this._doSearch(mirror, query, { byTitle: true })
                }
                if (data.length === 0) {
                    data = await this._doSearch(mirror, query, { byTitle: false })
                }
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
     * Do search request to specific mirror.
     * On 429: waits for retry-after (up to MAX_RATE_LIMIT_WAIT_MS) and retries once.
     * @private
     */
    async _doSearch(mirror, query, { byTitle = false, context = null } = {}, _isRetry = false) {
        // A bare Query matches the phrase against release names: "F1" found
        // only 2 releases literally named "F1 / F1". title + title_original
        // match the film's title field, as Lampa does: 74 releases, 7187 seeds.
        const params = new URLSearchParams({ apikey: '', Query: query })
        if (byTitle) {
            params.set('title', context?.title || query)
            params.set('title_original', context?.originalTitle || query)
        }
        if (context) {
            // Lampa's request: year and type narrow same-named films; the
            // category is jackett's Movies (2000) or TV (5000).
            if (context.year) params.set('year', String(context.year))
            params.set('is_serial', context.isSerial ? '2' : '1')
            params.set('Category[]', context.isSerial ? '5000' : '2000')
        }
        const url = `${mirror.protocol}://${mirror.host}:${mirror.port}/api/v2.0/indexers/all/results?${params}`

        // Using native fetch instead of smartFetch to avoid HTTP 403 blocks 
        // that occur with http.request on certain infrastructure patterns.
        const response = await fetch(url, {
            signal: AbortSignal.timeout(JACRED_TIMEOUT_MS),
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'application/json'
            }
        })

        if (response.status === 429) {
            const retryAfterSec = parseInt(response.headers.get('retry-after') || '5', 10)
            const waitMs = Math.min(retryAfterSec * 1000, MAX_RATE_LIMIT_WAIT_MS)

            if (!_isRetry) {
                // Retry once after waiting
                log.warn('Rate limited — waiting before retry', { mirror: mirror.host, waitMs })
                await sleep(waitMs)
                return this._doSearch(mirror, query, { byTitle, context }, true)
            }

            throw new Error(`Rate limited (retry after ${retryAfterSec}s)`)
        }
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const payloadText = await response.text()
        if (payloadText.trim().startsWith('<')) {
            throw new Error('Received HTML instead of JSON (possible Cloudflare block)')
        }

        let json
        try {
            json = JSON.parse(payloadText)
        } catch (e) {
            throw new Error('Failed to parse JSON response')
        }

        // Rank before capping: jac.red's order is not by seeders, so a plain
        // slice could drop the best-seeded releases of a popular title.
        const rawResults = [...(json?.Results || json?.results || [])]
            .sort((a, b) => (b.Seeders || b.seeders || 0) - (a.Seeders || a.seeders || 0))
            .slice(0, 50)

        return rawResults.map(r => {
            const result = this.normalizeResult({
                id: r.Guid || r.guid || Math.random().toString(36),
                title: r.Title || r.title || 'Unknown',
                size: formatSize(r.Size || r.size || 0),
                sizeBytes: r.Size || r.size || 0,
                date: r.PublishDate || r.publishDate || null,
                seeders: r.Seeders || r.seeders || 0,
                tracker: r.Tracker || r.tracker || 'Unknown',
                magnet: r.MagnetUri || r.magnetUri || r.Link || r.link || null
            })
            result.release = extractReleaseInfo(r)
            result.tags = mergeReleaseTags(result.tags, result.release)
            return result
        })
    }
}

/** Key for request coalescing: the same query for another film is another request. */
function contextKey(context) {
    if (!hasIdentity(context)) return ''
    return [context.title, context.originalTitle, context.year, context.isSerial ? 'tv' : 'movie']
        .map(v => String(v ?? '').toLowerCase().trim())
        .join('|')
}

function hasIdentity(context) {
    return Boolean(context && (context.title || context.originalTitle))
}

// Cover art travels as a one-frame "video" stream.
const ATTACHED_PICTURE_CODECS = new Set(['mjpeg', 'png', 'bmp', 'gif', 'webp'])

const uniqueLanguages = (streams) =>
    [...new Set(streams.map(s => s.tags?.language).filter(Boolean))]

/**
 * What jac.red already knows about a release: `info` (quality, HDR, voices)
 * and the `ffprobe` streams it probed. Lampa shows these on every row.
 * @returns {{quality: number|null, hdr: boolean, voices: string[],
 *   video: {codec: string, width: number, height: number}|null,
 *   audioChannels: number|null, audioLanguages: string[], subtitleLanguages: string[]}|null}
 */
export function extractReleaseInfo(raw) {
    const info = raw?.info
    const streams = Array.isArray(raw?.ffprobe) ? raw.ffprobe : null
    if (!info && !streams) return null

    const video = streams?.find(s => s.codec_type === 'video' && !ATTACHED_PICTURE_CODECS.has(s.codec_name))
    const audio = streams?.filter(s => s.codec_type === 'audio') || []
    const subtitles = streams?.filter(s => s.codec_type === 'subtitle') || []
    const channels = audio.map(s => s.channels).filter(n => Number.isFinite(n) && n > 0)

    return {
        quality: Number.isFinite(info?.quality) ? info.quality : null,
        hdr: info?.videotype === 'hdr',
        voices: Array.isArray(info?.voices) ? info.voices.filter(Boolean) : [],
        video: video ? { codec: video.codec_name, width: video.width, height: video.height } : null,
        audioChannels: channels.length ? Math.max(...channels) : null,
        audioLanguages: uniqueLanguages(audio),
        subtitleLanguages: uniqueLanguages(subtitles)
    }
}

const RESOLUTION_TAGS = { 2160: '2160p', 1080: '1080p', 720: '720p' }

/** jac.red's measured quality beats a resolution guessed from the release name. */
function mergeReleaseTags(tags, release) {
    if (!release) return tags
    let merged = [...tags]
    const resolution = RESOLUTION_TAGS[release.quality]
    if (resolution) {
        merged = merged.filter(t => !Object.values(RESOLUTION_TAGS).includes(t))
        merged.unshift(resolution)
    }
    if (release.hdr && !merged.includes('hdr')) merged.push('hdr')
    if (release.video?.codec === 'hevc' && !merged.includes('hevc')) merged.push('hevc')
    return merged
}
