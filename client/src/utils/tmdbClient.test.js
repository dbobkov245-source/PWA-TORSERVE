/**
 * tmdbClient utility tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { saveMetadata, getMetadata } from './tmdbClient.js'

const META_PREFIX = 'meta:'

function countMetaKeys() {
    return Object.keys(localStorage).filter(k => k.startsWith(META_PREFIX)).length
}

describe('saveMetadata LRU eviction', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('stores metadata and retrieves it', () => {
        saveMetadata('Inception', { id: 27205, title: 'Inception' })
        const result = getMetadata('Inception')
        expect(result?.id).toBe(27205)
    })

    it('evicts oldest entries deterministically when cache reaches limit', () => {
        // Fill the cache to exactly the max limit (must match METADATA_CACHE_LIMIT in tmdbClient.js)
        const LIMIT = 1500
        for (let i = 0; i < LIMIT; i++) {
            saveMetadata(`movie_${i}`, { id: i })
        }

        const keysBefore = countMetaKeys()
        expect(keysBefore).toBe(LIMIT)

        // Add one more — must always trigger eviction (not randomly)
        saveMetadata('movie_overflow', { id: 9999 })

        const keysAfter = countMetaKeys()

        // Must have evicted: cache cannot exceed limit
        expect(keysAfter).toBeLessThanOrEqual(LIMIT)
        // Must have evicted at least one (10% batch = 150)
        expect(keysAfter).toBeLessThan(keysBefore)
    })

    it('does not evict when cache is below limit', () => {
        saveMetadata('movie_a', { id: 1 })
        saveMetadata('movie_b', { id: 2 })

        expect(countMetaKeys()).toBe(2)
    })
})
