/**
 * TorLookProvider - TorLook.info torrent search provider
 * PWA-TorServe Provider Architecture v2.8.1
 * 
 * v2.8.1 FIXES:
 * - FIX-TL-1: Use doh: 'dns-only' — bypass DNS block without breaking TLS
 * - FIX-TL-2: Check HTTP status codes  
 * - FIX-TL-3: Detect redirect to main page (common block pattern)
 */

import { BaseProvider } from './BaseProvider.js'
import { logger } from '../utils/logger.js'
import { smartFetch } from '../utils/doh.js'

const log = logger.child('TorLookProvider')

const TORLOOK_HOST = 'torlook.info'

// FIX-TL-1: smartFetch options for tracker connections
const TRACKER_FETCH_OPTS = {
    doh: 'dns-only',  // Bypass DNS blocking, but DON'T substitute IP in TLS
    timeout: 30000,
}

export class TorLookProvider extends BaseProvider {
    name = 'torlook'

    /**
     * Search torrents on TorLook
     */
    async search(query) {
        log.info('🔍 Starting search', { query })

        try {
            const results = await this._doSearch(query)
            if (results.length > 0) {
                log.info('✅ Search successful', { count: results.length })
            } else {
                log.warn('Empty results')
            }
            return results
        } catch (err) {
            log.warn('Search failed', { error: err.message })
            throw new Error(`TorLook unavailable: ${err.message}`)
        }
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
     * Do search request
     * FIX-TL-1: doh: 'dns-only'
     * FIX-TL-2: Check HTTP status
     * @private
     */
    async _doSearch(query) {
        const url = `https://${TORLOOK_HOST}/search/${encodeURIComponent(query)}/`

        const response = await smartFetch(url, {
            ...TRACKER_FETCH_OPTS,
            headers: {
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
            },
        })

        // FIX-TL-2: Check HTTP status
        if (response.status >= 400) {
            log.error('Search HTTP error', { status: response.status })
            throw new Error(`Search failed: HTTP ${response.status}`)
        }

        const body = typeof response.data === 'string' ? response.data : ''

        // FIX-TL-3: Detect redirect to main page (common when blocked)
        if (body.length < 1000 && !body.includes('item') && !body.includes('magnet')) {
            log.warn('Response looks like main page / block redirect', {
                bodyLength: body.length,
                bodySnippet: body.substring(0, 200)
            })
        }

        const results = this._parseResults(body)

        // Log for debugging if no results from non-empty HTML
        if (results.length === 0 && body.length > 500) {
            log.debug('Got HTML but no results parsed', {
                bodyLength: body.length,
                bodySnippet: body.substring(0, 300)
            })
        }

        return results
    }

    /**
     * Parse TorLook search results HTML
     * @private
     */
    _parseResults(html) {
        const results = []

        const itemRegex = /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi

        let itemMatch
        while ((itemMatch = itemRegex.exec(html)) !== null && results.length < 25) {
            const itemHtml = itemMatch[1]

            // Extract magnet link
            const magnetMatch = itemHtml.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/i)
            if (!magnetMatch) continue

            const magnet = magnetMatch[1].replace(/&amp;/g, '&')

            // Extract title
            const titleMatch = itemHtml.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                itemHtml.match(/<a[^>]*href="[^"]*"[^>]*title="([^"]+)"/i)
            if (!titleMatch) continue

            const title = titleMatch[1]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim()

            // Extract size
            const sizeMatch = itemHtml.match(/>(\d+(?:\.\d+)?\s*(?:GB|MB|KB|TB))</i)
            const sizeStr = sizeMatch ? sizeMatch[1] : 'N/A'

            let sizeBytes = 0
            const sizeNumMatch = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|TB)/i)
            if (sizeNumMatch) {
                const num = parseFloat(sizeNumMatch[1])
                const unit = sizeNumMatch[2].toUpperCase()
                const mult = { 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 }
                sizeBytes = num * (mult[unit] || 1)
            }

            // Extract seeders
            const seedMatch = itemHtml.match(/<span[^>]*class="[^"]*seed[^"]*"[^>]*>(\d+)<\/span>/i)
            const seeders = seedMatch ? parseInt(seedMatch[1]) : 0

            results.push(this.normalizeResult({
                id: magnet,
                title,
                size: sizeStr,
                sizeBytes,
                seeders,
                tracker: 'TorLook',
                magnet
            }))
        }

        return results
    }
}
