/**
 * RuTracker Search API - LEGACY WRAPPER
 * PWA-TorServe v2.7.0
 * 
 * This module now wraps RuTrackerProvider for backward compatibility.
 * New code should use:
 * - aggregator.search() for multi-source search
 * - RuTrackerProvider directly for RuTracker-only access
 */

import { RuTrackerProvider } from './providers/RuTrackerProvider.js'

// Singleton provider instance for backward compatibility
const _provider = new RuTrackerProvider()

/**
 * Search RuTracker
 * @deprecated Use aggregator.search() for multi-source, or RuTrackerProvider for direct
 * @param {string} query
 * @returns {Promise<{results: Array}|{error: string, results: []}>}
 */
export const searchRuTracker = async (query) => {
    const results = await _provider.search(query)
    if (results.length > 0) {
        return { results }
    }
    return { error: 'No results', results: [] }
}

/**
 * Get magnet link from topic page
 * @param {string} topicId
 * @returns {Promise<{magnet: string}|{error: string}>}
 */
export const getMagnetLink = async (topicId) => {
    return _provider.getMagnet(topicId)
}
