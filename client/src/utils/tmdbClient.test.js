/**
 * tmdbClient utility tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { addTmdbQueryParams, saveMetadata, getMetadata } from './tmdbClient.js'

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

describe('native server proxy routing', () => {
    it('uses the native default server URL for metadata proxy when localStorage is empty', () => {
        const src = fs.readFileSync(path.resolve(import.meta.dirname, './tmdbClient.js'), 'utf8')

        expect(src).toContain("import { resolveInitialServerUrl } from './helpers.js'")
        expect(src).toContain('function getApiBase({ allowNativeDefault = false } = {})')
        expect(src).toContain("resolveInitialServerUrl({ isNative: true, storedUrl: '' })")
        expect(src).toContain('getApiBase({ allowNativeDefault: true })')
    })
})

describe('addTmdbQueryParams', () => {
    it('does not duplicate language when endpoint already has language', () => {
        const url = addTmdbQueryParams(
            '/discover/movie?primary_release_year=2025&language=ru-RU&page=1',
            { apiKey: 'server-key' }
        )

        expect(url).toContain('primary_release_year=2025')
        expect(url).toContain('api_key=server-key')
        expect(url.match(/language=/g)).toHaveLength(1)
    })

    it('preserves existing api_key and language', () => {
        const url = addTmdbQueryParams(
            '/discover/movie?api_key=client-key&language=ru-RU&page=1',
            { apiKey: 'server-key' }
        )

        expect(url).toContain('api_key=client-key')
        expect(url).not.toContain('api_key=server-key')
        expect(url.match(/language=/g)).toHaveLength(1)
    })
})
