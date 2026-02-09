/**
 * RutorProvider - Rutor.info torrent search provider
 * PWA-TorServe Provider Architecture v2.7.2
 * 
 * Implements Rutor search with:
 * - Mirror rotation (rutor.info, rutor.is)
 * - Smart Fetch (DoH + SNI Bypass) for ISP blocking resilience
 * - HTML parsing via regex (no external deps)
 * - No authentication required (public tracker)
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
     * @private
     */
    async _doSearch(mirror, query) {
        const url = `${mirror.protocol}://${mirror.host}/search/0/0/000/0/${encodeURIComponent(query)}`

        const response = await smartFetch(url, {
            headers: {
                'Accept': 'text/html',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 45000
        })

        return this._parseResults(response.data)
    }

    /**
     * Parse Rutor search results HTML
     * @private
     */
    _parseResults(html) {
        const results = []

        // Rutor HTML structure:
        // <tr class="gai"...> or <tr class="tum"...>
        // Contains: magnet link, title, size, seeders

        // Match table rows with torrent data
        const rowRegex = /<tr[^>]*class="(?:gai|tum)"[^>]*>([\s\S]*?)<\/tr>/gi

        let rowMatch
        while ((rowMatch = rowRegex.exec(html)) !== null && results.length < 30) {
            const rowHtml = rowMatch[1]

            // Extract magnet link
            const magnetMatch = rowHtml.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/i)
            if (!magnetMatch) continue

            const magnet = magnetMatch[1]
                .replace(/&amp;/g, '&')

            // Extract title from the last link before size
            // Pattern: <a href="/torrent/...">Title</a>
            const titleMatch = rowHtml.match(/<a[^>]*href="\/torrent\/\d+[^"]*"[^>]*>([^<]+)<\/a>/i)
            if (!titleMatch) continue

            const title = titleMatch[1]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim()

            // Extract size (format: "1.5 GB" or "500 MB")
            const sizeMatch = rowHtml.match(/>(\d+(?:\.\d+)?\s*(?:GB|MB|KB|TB))</i)
            const sizeStr = sizeMatch ? sizeMatch[1] : 'N/A'

            // Parse size to bytes
            let sizeBytes = 0
            const sizeNumMatch = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|TB)/i)
            if (sizeNumMatch) {
                const num = parseFloat(sizeNumMatch[1])
                const unit = sizeNumMatch[2].toUpperCase()
                const mult = { 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 }
                sizeBytes = num * (mult[unit] || 1)
            }

            // Extract seeders (green number in span)
            const seedMatch = rowHtml.match(/<span[^>]*class="[^"]*green[^"]*"[^>]*>(\d+)<\/span>/i)
            const seeders = seedMatch ? parseInt(seedMatch[1]) : 0

            results.push(this.normalizeResult({
                id: magnet, // Use magnet as ID
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
