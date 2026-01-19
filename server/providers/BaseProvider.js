/**
 * BaseProvider - Abstract base class for torrent search providers
 * PWA-TorServe Provider Architecture
 * 
 * All providers must implement:
 * - search(query) → Promise<SearchResult[]>
 * - getMagnet(id) → Promise<{magnet}|{error}>
 * 
 * SearchResult format:
 * {
 *   id: string,           // Unique identifier (can be guid, topic id, etc.)
 *   title: string,        // Torrent title
 *   size: string,         // Human-readable size (e.g., "1.5 GB")
 *   sizeBytes: number,    // Size in bytes (for sorting/filtering)
 *   seeders: number,      // Number of seeders
 *   tracker: string,      // Tracker name
 *   magnet: string|null,  // Magnet link (if available immediately)
 *   provider: string      // Provider name (for deduplication/logging)
 * }
 */

export class BaseProvider {
    /** Provider name (used in logs and results) */
    name = 'base'

    /** Whether provider is enabled */
    enabled = true

    /** Provider-specific configuration */
    config = {}

    /**
     * Search for torrents
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of SearchResult objects
     */
    async search(query) {
        throw new Error('search() must be implemented by subclass')
    }

    /**
     * Get magnet link for a specific torrent
     * @param {string} id - Torrent identifier
     * @returns {Promise<{magnet: string}|{error: string}>}
     */
    async getMagnet(id) {
        throw new Error('getMagnet() must be implemented by subclass')
    }

    /**
     * Check if provider is healthy and ready to accept requests
     * @returns {boolean}
     */
    isHealthy() {
        return this.enabled
    }

    /**
     * Normalize result to standard SearchResult format (API v2)
     * @param {Object} raw - Raw result from provider
     * @returns {Object} Normalized SearchResult with dateTs, tags, and health
     */
    normalizeResult(raw) {
        const seeders = raw.seeders || 0
        return {
            id: raw.id || String(Math.random()),
            title: raw.title || 'Unknown',
            size: raw.size || 'N/A',
            sizeBytes: raw.sizeBytes || raw.Size || 0,
            dateTs: this.parseDate(raw.date),
            tags: this.extractQualityTags(raw.title),
            seeders: seeders,
            health: this.calculateHealth(seeders),
            tracker: raw.tracker || this.name,
            magnet: raw.magnet || raw.magnetUrl || null,
            provider: this.name
        }
    }

    /**
     * Calculate torrent health based on seeders count
     * UX-02: Visual indicator for download reliability
     * @param {number} seeders
     * @returns {'excellent'|'good'|'poor'|'dead'}
     */
    calculateHealth(seeders) {
        if (seeders >= 50) return 'excellent'  // 🟢 Fast download
        if (seeders >= 10) return 'good'       // 🟡 Reliable
        if (seeders >= 1) return 'poor'        // 🟠 Slow but possible
        return 'dead'                          // 🔴 No sources
    }


    /**
     * Parse various date formats to Unix timestamp (milliseconds)
     * Supports: Unix timestamp (seconds), ISO strings, Date objects
     * @param {number|string|Date|null} dateValue
     * @returns {number|null} Unix timestamp in milliseconds, or null
     */
    parseDate(dateValue) {
        if (!dateValue) return null

        // Unix timestamp in seconds (Jacred API format)
        if (typeof dateValue === 'number') {
            // If it looks like seconds (before year 3000), convert to ms
            return dateValue < 32503680000 ? dateValue * 1000 : dateValue
        }

        // ISO string "2025-01-15T12:30:00Z" or other parseable formats
        if (typeof dateValue === 'string') {
            const parsed = Date.parse(dateValue)
            if (!isNaN(parsed)) return parsed
        }

        // Date object
        if (dateValue instanceof Date) {
            return dateValue.getTime()
        }

        return null
    }

    /**
     * Extract quality tags from torrent title
     * Uses strict regex patterns to minimize false positives
     * @param {string} title
     * @returns {string[]} Array of quality tags: ['2160p', '1080p', '720p', 'hevc', 'hdr', 'cam']
     */
    extractQualityTags(title) {
        if (!title) return []

        const tags = []
        const upper = title.toUpperCase()

        // Resolution detection (mutually exclusive, highest wins)
        if (/\b2160[pрPР]\b/.test(title) || /\b4K\b/i.test(title) || /\bUHD\b/i.test(title)) {
            tags.push('2160p')
        } else if (/\b1080[pрPР]\b/.test(title)) {
            tags.push('1080p')
        } else if (/\b720[pрPР]\b/.test(title)) {
            tags.push('720p')
        }

        // Codec detection
        if (/\b(HEVC|H\.?265|x265)\b/i.test(title)) {
            tags.push('hevc')
        }

        // HDR detection (exclude HDRip which is different)
        if (/\bHDR(10)?(\+|Plus)?\b/i.test(title) && !/\bHDRip\b/i.test(title)) {
            tags.push('hdr')
        }

        // Dolby Vision
        if (/\b(DV|Dolby\s*Vision)\b/i.test(title)) {
            tags.push('dv')
        }

        // Low quality indicators
        if (/\b(CAMRip|CAM|HDTS|TS|Telesync|TC)\b/i.test(title)) {
            tags.push('cam')
        }

        return tags
    }
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
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
