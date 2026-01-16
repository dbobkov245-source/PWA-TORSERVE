/**
 * Search Cache - Short-lived cache for search results
 * PWA-TorServe Provider Architecture
 * 
 * Reduces load on providers by caching search results for 5-10 minutes.
 * Uses LRU-like eviction when cache is full.
 */

import { logger } from './utils/logger.js'

const log = logger.child('SearchCache')

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes
const MAX_CACHE_SIZE = 100          // Max cached queries

class SearchCache {
    constructor() {
        /** @type {Map<string, {results: Array, expires: number, providers: Object}>} */
        this.cache = new Map()
        this.hits = 0
        this.misses = 0
    }

    /**
     * Generate cache key from query
     * @param {string} query
     * @returns {string}
     */
    _key(query) {
        return query.toLowerCase().trim()
    }

    /**
     * Get cached results if available and not expired
     * @param {string} query
     * @returns {{results: Array, providers: Object}|null}
     */
    get(query) {
        const key = this._key(query)
        const cached = this.cache.get(key)

        if (!cached) {
            this.misses++
            return null
        }

        if (Date.now() > cached.expires) {
            this.cache.delete(key)
            this.misses++
            log.debug('Cache expired', { query: key })
            return null
        }

        this.hits++
        log.debug('Cache hit', { query: key, age: Math.round((cached.expires - Date.now()) / 1000) + 's left' })
        return { results: cached.results, providers: cached.providers }
    }

    /**
     * Store search results in cache
     * @param {string} query
     * @param {Array} results
     * @param {Object} providers
     */
    set(query, results, providers) {
        const key = this._key(query)

        // Evict old entries if cache is full
        if (this.cache.size >= MAX_CACHE_SIZE) {
            this._evictOldest()
        }

        this.cache.set(key, {
            results,
            providers,
            expires: Date.now() + CACHE_TTL_MS
        })

        log.debug('Cache set', { query: key, resultsCount: results.length })
    }

    /**
     * Evict oldest entries (LRU-like)
     * @private
     */
    _evictOldest() {
        const now = Date.now()
        let evicted = 0

        // First, remove expired entries
        for (const [key, value] of this.cache) {
            if (now > value.expires) {
                this.cache.delete(key)
                evicted++
            }
        }

        // If still full, remove oldest 10%
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const toRemove = Math.ceil(MAX_CACHE_SIZE * 0.1)
            const keys = Array.from(this.cache.keys()).slice(0, toRemove)
            keys.forEach(k => this.cache.delete(k))
            evicted += toRemove
        }

        if (evicted > 0) {
            log.debug('Cache evicted', { count: evicted })
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear()
        log.info('Cache cleared')
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getStats() {
        const total = this.hits + this.misses
        return {
            size: this.cache.size,
            maxSize: MAX_CACHE_SIZE,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? Math.round((this.hits / total) * 100) + '%' : 'N/A',
            ttlMinutes: CACHE_TTL_MS / 60000
        }
    }
}

// Singleton instance
export const searchCache = new SearchCache()
