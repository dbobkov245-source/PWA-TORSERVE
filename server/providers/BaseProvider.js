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
     * Normalize result to standard SearchResult format
     * @param {Object} raw - Raw result from provider
     * @returns {Object} Normalized SearchResult
     */
    normalizeResult(raw) {
        return {
            id: raw.id || String(Math.random()),
            title: raw.title || 'Unknown',
            size: raw.size || 'N/A',
            sizeBytes: raw.sizeBytes || raw.Size || 0,
            seeders: raw.seeders || 0,
            tracker: raw.tracker || this.name,
            magnet: raw.magnet || raw.magnetUrl || null,
            provider: this.name
        }
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
