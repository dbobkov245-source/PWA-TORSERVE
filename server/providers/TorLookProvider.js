/**
 * TorLookProvider - TorLook.info torrent search provider
 * PWA-TorServe Provider Architecture
 * 
 * TorLook is a torrent aggregator/metasearch engine
 * Implements HTML parsing, no authentication required
 */

import https from 'https'
import { BaseProvider } from './BaseProvider.js'
import { logger } from '../utils/logger.js'

const log = logger.child('TorLookProvider')

const TORLOOK_HOST = 'torlook.info'

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
            return []
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
     * @private
     */
    _doSearch(query) {
        return new Promise((resolve, reject) => {
            // TorLook search URL: /search/query/
            const searchPath = `/search/${encodeURIComponent(query)}/`

            const options = {
                hostname: TORLOOK_HOST,
                port: 443,
                path: searchPath,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html',
                    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
                },
                timeout: 15000
            }

            const req = https.request(options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`))
                    return
                }

                let data = ''
                res.setEncoding('utf8')

                res.on('data', chunk => data += chunk)
                res.on('end', () => {
                    try {
                        const results = this._parseResults(data)
                        resolve(results)
                    } catch (err) {
                        reject(new Error(`Parse failed: ${err.message}`))
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
     * Parse TorLook search results HTML
     * @private
     */
    _parseResults(html) {
        const results = []

        // TorLook results are in divs with class "item"
        // Each contains: title, size, seeds, magnet link

        // Match torrent items
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

            // Parse size to bytes
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
