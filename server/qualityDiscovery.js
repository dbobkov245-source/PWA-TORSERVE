/**
 * qualityDiscovery.js — Discover available torrent quality for movies
 * ADR-001 Item 7: Quality Badges on home page (like Lampa)
 * 
 * Searches torrents for movie titles and extracts best available quality.
 * Results cached for 1 hour to avoid spamming providers.
 */

import { search } from './aggregator.js'
import { logger } from './utils/logger.js'

const log = logger.child('QualityDiscovery')

// Cache configuration
const CACHE_TTL_MS = 60 * 60 * 1000  // 1 hour
const MAX_CACHE_SIZE = 500

// In-memory cache: title -> { badges, expires }
const qualityCache = new Map()

/**
 * Clean cache of expired entries
 */
function cleanCache() {
    const now = Date.now()
    for (const [key, value] of qualityCache) {
        if (now > value.expires) {
            qualityCache.delete(key)
        }
    }
    // Evict oldest if still over limit
    if (qualityCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(qualityCache.entries())
        entries.sort((a, b) => a[1].expires - b[1].expires)
        const toRemove = entries.slice(0, Math.ceil(MAX_CACHE_SIZE * 0.2))
        toRemove.forEach(([k]) => qualityCache.delete(k))
    }
}

/**
 * Normalize title for cache key
 */
function normalizeTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s\u0400-\u04FF]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Extract best quality badges from search results
 * @param {Array} results - Search results from aggregator
 * @returns {string[]} - Array of quality labels: ['4K', '1080p', 'HDR', etc.]
 */
function extractBestQuality(results) {
    if (!results || results.length === 0) return []

    const found = {
        '4K': false,
        '1080p': false,
        '720p': false,
        'HDR': false,
        'DV': false
    }

    for (const result of results) {
        const tags = result.tags || []

        if (tags.includes('2160p')) found['4K'] = true
        if (tags.includes('1080p')) found['1080p'] = true
        if (tags.includes('720p')) found['720p'] = true
        if (tags.includes('hdr')) found['HDR'] = true
        if (tags.includes('dv')) found['DV'] = true

        // Early exit if we found best quality
        if (found['4K'] && found['HDR']) break
    }

    // Return found badges in priority order
    const badges = []
    if (found['4K']) badges.push('4K')
    else if (found['1080p']) badges.push('1080p')
    else if (found['720p']) badges.push('720p')

    if (found['DV']) badges.push('DV')
    else if (found['HDR']) badges.push('HDR')

    return badges
}

/**
 * Discover quality for a single title
 * @param {string} title - Movie/show title
 * @returns {Promise<string[]>} - Quality badges
 */
export async function discoverQuality(title) {
    if (!title) return []

    const key = normalizeTitle(title)

    // Check cache
    const cached = qualityCache.get(key)
    if (cached && Date.now() < cached.expires) {
        return cached.badges
    }

    try {
        // Search with limit to reduce load
        const { results } = await search(title, { limit: 20 })
        const badges = extractBestQuality(results)

        // Cache result
        qualityCache.set(key, {
            badges,
            expires: Date.now() + CACHE_TTL_MS
        })

        log.debug('Quality discovered', { title: key, badges })
        return badges

    } catch (err) {
        log.warn('Quality discovery failed', { title: key, error: err.message })
        return []
    }
}

/**
 * Batch discover quality for multiple titles
 * @param {string[]} titles - Array of titles (max 10)
 * @returns {Promise<Object>} - { title: badges[] }
 */
export async function batchDiscoverQuality(titles) {
    if (!titles || !Array.isArray(titles)) return {}

    // Limit to 10 titles per batch
    const limited = titles.slice(0, 10)
    const result = {}

    // Clean cache periodically
    if (Math.random() < 0.1) cleanCache()

    // Check cache first, collect uncached
    const uncached = []
    for (const title of limited) {
        const key = normalizeTitle(title)
        const cached = qualityCache.get(key)
        if (cached && Date.now() < cached.expires) {
            result[title] = cached.badges
        } else {
            uncached.push(title)
        }
    }

    // Fetch uncached in parallel (with concurrency limit)
    if (uncached.length > 0) {
        log.info('Batch quality discovery', { cached: limited.length - uncached.length, fetching: uncached.length })

        const promises = uncached.map(title =>
            discoverQuality(title).then(badges => ({ title, badges }))
        )

        const settled = await Promise.allSettled(promises)

        for (const item of settled) {
            if (item.status === 'fulfilled') {
                result[item.value.title] = item.value.badges
            }
        }
    }

    return result
}

/**
 * Get cache statistics
 */
export function getQualityCacheStats() {
    return {
        size: qualityCache.size,
        maxSize: MAX_CACHE_SIZE,
        ttlMinutes: CACHE_TTL_MS / 60000
    }
}
