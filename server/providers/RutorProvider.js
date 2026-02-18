/**
 * RutorProvider - Rutor.info torrent search provider
 * PWA-TorServe Provider Architecture v2.8.1
 * 
 * v2.8.1 FIXES:
 * - FIX-RU-1: Use doh: 'dns-only' — bypass DNS block without breaking TLS
 * - FIX-RU-2: Check HTTP status codes
 * - FIX-RU-3: Log body snippet on parse failures
 */

import { BaseProvider, formatSize } from './BaseProvider.js'
import { logger } from '../utils/logger.js'
import { smartFetch } from '../utils/doh.js'

const log = logger.child('RutorProvider')

// Rutor mirrors
const RUTOR_MIRRORS = [
    { host: 'rutor.info', protocol: 'https' },
    { host: 'rutor.is', protocol: 'https' },
]

// FIX-RU-1: smartFetch options for tracker connections
// Timeout 10s: leaves room for Worker proxy fallback within aggregator's 30s limit
const TRACKER_FETCH_OPTS = {
    doh: 'dns-only',  // Bypass DNS blocking, but DON'T substitute IP in TLS
    timeout: 10000,
}

function stripTagsAndEntities(html = '') {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim()
}

function parseSizeFromRow(rowHtml = '') {
    const parseFromText = (text) => {
        const sizeMatch = text.match(/([\d.,]+)\s*(TB|GB|MB|KB|ТБ|ГБ|МБ|КБ)/i)
        if (!sizeMatch) return null

        const num = parseFloat(sizeMatch[1].replace(',', '.'))
        if (!Number.isFinite(num)) return null

        const unitRaw = sizeMatch[2].toUpperCase()
        const unitMap = { 'ТБ': 'TB', 'ГБ': 'GB', 'МБ': 'MB', 'КБ': 'KB' }
        const unit = unitMap[unitRaw] || unitRaw
        const mult = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
        const sizeBytes = num * (mult[unit] || 1)

        return {
            size: `${num.toFixed(2)} ${unit}`,
            sizeBytes
        }
    }

    // Some rows contain two right-aligned cells: comments + size.
    // Select the first right cell that actually contains a size token.
    const rightCells = [...rowHtml.matchAll(/<td[^>]*align\s*=\s*["']?right["']?[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => m[1])

    for (const cell of rightCells) {
        const parsed = parseFromText(stripTagsAndEntities(cell))
        if (parsed) return parsed
    }

    // Fallback: try whole row text
    const fallback = parseFromText(stripTagsAndEntities(rowHtml))
    if (fallback) return fallback

    return { size: 'N/A', sizeBytes: 0 }
}

export class RutorProvider extends BaseProvider {
    name = 'rutor'

    constructor() {
        super()
        this.currentMirror = RUTOR_MIRRORS[0]
    }

    /**
     * Search torrents on Rutor with mirror fallback
     */
    async search(query) {
        log.info('🔍 Starting search', { query, mirrorsCount: RUTOR_MIRRORS.length })
        let hadSuccessfulResponse = false
        let lastError = null

        for (const mirror of RUTOR_MIRRORS) {
            const mirrorId = `${mirror.protocol}://${mirror.host}`
            log.info('Trying mirror', { mirror: mirrorId })

            try {
                const results = await this._doSearch(mirror, query)
                hadSuccessfulResponse = true

                if (results.length > 0) {
                    this.currentMirror = mirror
                    log.info('✅ Search successful', { mirror: mirrorId, count: results.length })
                    return results
                }
                log.warn('Empty results', { mirror: mirrorId })
            } catch (err) {
                lastError = err
                log.warn(`Mirror failed`, { mirror: mirrorId, error: err.message })
            }
        }

        if (!hadSuccessfulResponse && lastError) {
            log.error('All mirrors failed', { error: lastError.message })
            throw new Error(`Rutor unavailable: ${lastError.message}`)
        }

        log.warn('All mirrors returned empty results', { query })
        return []
    }

    /**
     * Get magnet (already in search results)
     */
    async getMagnet(magnetUrl) {
        if (magnetUrl && magnetUrl.startsWith('magnet:')) {
            return { magnet: magnetUrl }
        }
        return { error: 'No magnet link' }
    }

    /**
     * Do search request to specific mirror
     * FIX-RU-1: doh: 'dns-only'
     * FIX-RU-2: Check HTTP status
     * @private
     */
    async _doSearch(mirror, query) {
        const url = `${mirror.protocol}://${mirror.host}/search/0/0/000/0/${encodeURIComponent(query)}`

        const response = await smartFetch(url, {
            ...TRACKER_FETCH_OPTS,
            headers: {
                'Accept': 'text/html',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
        })

        // FIX-RU-2: Check HTTP status
        if (response.status >= 400) {
            log.error('Search HTTP error', { mirror: mirror.host, status: response.status })
            throw new Error(`Search failed: HTTP ${response.status}`)
        }

        const body = typeof response.data === 'string' ? response.data : ''

        // FIX-RU-3: Detect if we got a Cloudflare block or redirect
        if (body.length < 500 && (body.includes('cloudflare') || body.includes('cf-browser-verification'))) {
            log.warn('Cloudflare block detected', { mirror: mirror.host, bodyLength: body.length })
            throw new Error('Cloudflare block')
        }

        const results = this._parseResults(body)

        // FIX-RU-3: Log if we got HTML but no results (likely wrong page)
        if (results.length === 0 && body.length > 100) {
            log.debug('Got HTML but no results parsed', {
                mirror: mirror.host,
                bodyLength: body.length,
                bodySnippet: body.substring(0, 300)
            })
        }

        return results
    }

    /**
     * Parse Rutor search results HTML
     * @private
     */
    _parseResults(html) {
        const results = []

        const rowRegex = /<tr[^>]*class="(?:gai|tum)"[^>]*>([\s\S]*?)<\/tr>/gi

        let rowMatch
        while ((rowMatch = rowRegex.exec(html)) !== null && results.length < 30) {
            const rowHtml = rowMatch[1]

            // Extract magnet link
            const magnetMatch = rowHtml.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/i)
            if (!magnetMatch) continue

            const magnet = magnetMatch[1]
                .replace(/&amp;/g, '&')

            // Extract title
            const titleMatch = rowHtml.match(/<a[^>]*href="\/torrent\/\d+[^"]*"[^>]*>([^<]+)<\/a>/i)
            if (!titleMatch) continue

            const title = titleMatch[1]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim()

            // Extract size (supports multiple Rutor markup variants)
            const { size: sizeStr, sizeBytes } = parseSizeFromRow(rowHtml)

            // Extract seeders (Rutor wraps value with icon/img + nbsp)
            const seedCellMatch = rowHtml.match(/<span[^>]*class="[^"]*green[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
            const seedText = seedCellMatch ? stripTagsAndEntities(seedCellMatch[1]) : ''
            const seeders = parseInt(seedText.match(/\d+/)?.[0] || '0', 10)

            results.push(this.normalizeResult({
                id: magnet,
                title,
                size: sizeStr,
                sizeBytes,
                seeders,
                tracker: 'Rutor',
                magnet
            }))
        }

        return results
    }
}
