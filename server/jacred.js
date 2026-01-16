/**
 * Jacred Torrent Search API - LEGACY WRAPPER
 * PWA-TorServe v2.7.0
 * 
 * This module now wraps JacredProvider for backward compatibility.
 * New code should use:
 * - aggregator.search() for multi-source search
 * - JacredProvider directly for Jacred-only access
 * 
 * Security note: SSL validation disabled for Jacred mirrors
 * (see JacredProvider.js for details)
 */

import { JacredProvider } from './providers/JacredProvider.js'

// Singleton provider instance for backward compatibility
const _provider = new JacredProvider()

/**
 * Search torrents via Jacred API
 * @deprecated Use aggregator.search() for multi-source, or JacredProvider for direct
 * @param {string} query
 * @returns {Promise<{results: Array}|{error: string, results: []}>}
 */
export const searchJacred = async (query) => {
    const results = await _provider.search(query)
    if (results.length > 0) {
        return { results }
    }
    return { error: 'No results', results: [] }
}

/**
 * Get magnet from result (already included in search results)
 * @param {string} magnetUrl
 * @returns {Promise<{magnet: string}|{error: string}>}
 */
export const getMagnetFromJacred = async (magnetUrl) => {
    return _provider.getMagnet(magnetUrl)
}
