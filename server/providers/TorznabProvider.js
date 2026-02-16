/**
 * TorznabProvider - Torznab-compatible indexer provider (Jackett/Prowlarr)
 * PWA-TorServe Provider Architecture — STAB-D
 *
 * Connects to any Torznab-compatible indexer API (Jackett, Prowlarr, etc.)
 * Disabled by default — enable via TORZNAB_ENABLED=1.
 *
 * Config env vars:
 *   TORZNAB_ENABLED=1               — enable provider
 *   TORZNAB_URL=http://host:9117/api/v2.0/indexers/all/results/torznab
 *   TORZNAB_API_KEY=your-api-key
 *   TORZNAB_TIMEOUT=15000           — request timeout (ms, default 15s)
 *   TORZNAB_LIMIT=50                — max results per search
 */

import { BaseProvider } from './BaseProvider.js'
import { logger } from '../utils/logger.js'

const log = logger.child('TorznabProvider')

const DEFAULT_TIMEOUT = 15000
const DEFAULT_LIMIT = 50

export class TorznabProvider extends BaseProvider {
    name = 'torznab'

    /** @type {'disabled'|'not_configured'|null} */
    disableReason = null

    constructor() {
        super()

        // STAB-D: Disabled by default
        if (process.env.TORZNAB_ENABLED !== '1') {
            this.enabled = false
            this.disableReason = 'disabled'
            log.info('Torznab disabled (set TORZNAB_ENABLED=1 to enable)')
            return
        }

        this.baseUrl = (process.env.TORZNAB_URL || '').replace(/\/+$/, '')
        this.apiKey = process.env.TORZNAB_API_KEY || ''
        this.timeout = parseInt(process.env.TORZNAB_TIMEOUT || String(DEFAULT_TIMEOUT), 10)
        this.limit = parseInt(process.env.TORZNAB_LIMIT || String(DEFAULT_LIMIT), 10)

        if (!this.baseUrl || !this.apiKey) {
            this.enabled = false
            this.disableReason = 'not_configured'
            log.info('Torznab disabled: TORZNAB_URL or TORZNAB_API_KEY not set')
            return
        }

        log.info('Torznab enabled', { url: this.baseUrl, limit: this.limit })
    }

    /**
     * Search torrents via Torznab API
     */
    async search(query) {
        if (!this.enabled) return []

        const url = `${this.baseUrl}?t=search&q=${encodeURIComponent(query)}&apikey=${this.apiKey}&limit=${this.limit}`

        log.info('Searching', { query })

        const response = await this._fetch(url)

        if (response.status >= 400) {
            throw new Error(`Torznab HTTP ${response.status}`)
        }

        const body = typeof response.data === 'string' ? response.data : ''

        // Detect error responses
        if (body.includes('<error code=')) {
            const errMatch = body.match(/<error code="(\d+)" description="([^"]*)"/)
            const errMsg = errMatch ? `API error ${errMatch[1]}: ${errMatch[2]}` : 'Unknown API error'
            throw new Error(errMsg)
        }

        const results = this._parseXML(body)

        if (results.length > 0) {
            log.info('Search successful', { count: results.length })
        } else {
            log.warn('Empty results', { query })
        }

        return results
    }

    /**
     * Get magnet link (already in search results for Torznab)
     */
    async getMagnet(magnetUrl) {
        if (magnetUrl && magnetUrl.startsWith('magnet:')) {
            return { magnet: magnetUrl }
        }
        return { error: 'No magnet link' }
    }

    /**
     * Fetch with timeout using native fetch
     * @private
     */
    async _fetch(url) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/xml, text/xml, */*',
                    'User-Agent': 'PWA-TorServe/1.0'
                }
            })

            const data = await res.text()
            clearTimeout(timeoutId)

            return { data, status: res.status, headers: Object.fromEntries(res.headers) }
        } catch (err) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
                throw new Error('Torznab request timeout')
            }
            throw err
        }
    }

    /**
     * Parse Torznab XML response (RSS 2.0 with torznab:attr extensions)
     * Uses regex — no XML parser dependency needed.
     * @private
     */
    _parseXML(xml) {
        const results = []

        // Split by <item> blocks
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi
        let itemMatch

        while ((itemMatch = itemRegex.exec(xml)) !== null && results.length < this.limit) {
            const item = itemMatch[1]

            // Extract title
            const titleMatch = item.match(/<title><!\[CDATA\[([^\]]*)\]\]><\/title>/) ||
                item.match(/<title>([^<]*)<\/title>/)
            if (!titleMatch) continue
            const title = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()

            // Extract torznab:attr values
            const attrs = this._extractAttrs(item)

            // Magnet link — only include results with magnet (per plan: don't break POST /api/add contract)
            const magnet = attrs.magneturl || null
            if (!magnet) continue

            // Extract guid
            const guidMatch = item.match(/<guid[^>]*>([^<]*)<\/guid>/)
            const guid = guidMatch ? guidMatch[1] : magnet

            // Size
            const sizeBytes = parseInt(attrs.size || '0', 10) || 0
            const sizeStr = this._formatSize(sizeBytes)

            // Seeders
            const seeders = parseInt(attrs.seeders || '0', 10) || 0

            // Date
            const dateMatch = item.match(/<pubDate>([^<]*)<\/pubDate>/)
            const date = dateMatch ? dateMatch[1] : null

            // Tracker name from jackettindexer attr or fallback
            const tracker = attrs.jackettindexer || attrs.prowlarrindexer || 'Torznab'

            results.push(this.normalizeResult({
                id: guid,
                title,
                size: sizeStr,
                sizeBytes,
                date,
                seeders,
                tracker,
                magnet
            }))
        }

        return results
    }

    /**
     * Extract all torznab:attr key-value pairs from an <item> block
     * @private
     */
    _extractAttrs(itemXml) {
        const attrs = {}
        const attrRegex = /<torznab:attr\s+name="([^"]+)"\s+value="([^"]*)"\s*\/?>/gi
        let match
        while ((match = attrRegex.exec(itemXml)) !== null) {
            attrs[match[1]] = match[2]
        }

        // Also check enclosure for size fallback
        if (!attrs.size) {
            const encMatch = itemXml.match(/<enclosure[^>]*length="(\d+)"/)
            if (encMatch) attrs.size = encMatch[1]
        }

        return attrs
    }

    /**
     * Format bytes to human-readable
     * @private
     */
    _formatSize(bytes) {
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
}
