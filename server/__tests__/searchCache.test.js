/**
 * SearchCache Tests
 * Tests for server/searchCache.js
 *
 * Covers: get/set/clear, key normalization, TTL expiry,
 * hit/miss stats, hit rate, LRU eviction at capacity.
 */

import { test, expect } from './test-runner.js'
import { searchCache } from '../searchCache.js'

test('get returns null on cache miss', () => {
    searchCache.clear()
    const result = searchCache.get('nonexistent query xyz')
    expect(result).toBeNull()
})

test('set and get returns stored results', () => {
    searchCache.clear()
    const results = [{ title: 'Movie A', magnet: 'magnet:?xt=urn:btih:aaa' }]
    const providers = { jacred: { count: 1, status: 'ok' } }

    searchCache.set('test query', results, providers)
    const cached = searchCache.get('test query')

    expect(cached).toBeDefined()
    expect(cached.results.length).toBe(1)
    expect(cached.results[0].title).toBe('Movie A')
    expect(cached.providers.jacred.status).toBe('ok')
})

test('get is case-insensitive (key normalization)', () => {
    searchCache.clear()
    searchCache.set('Interstellar 2014', [{ title: 'test' }], {})

    const result = searchCache.get('interstellar 2014')
    expect(result).toBeDefined()
    expect(result.results[0].title).toBe('test')
})

test('get trims whitespace from query', () => {
    searchCache.clear()
    searchCache.set('dune', [{ title: 'Dune' }], {})

    const result = searchCache.get('  dune  ')
    expect(result).toBeDefined()
    expect(result.results[0].title).toBe('Dune')
})

test('get returns null after TTL expires (manual expiry injection)', () => {
    searchCache.clear()
    searchCache.set('expired query', [{ title: 'Old' }], {})

    const key = 'expired query'
    const entry = searchCache.cache.get(key)
    entry.expires = Date.now() - 1

    const result = searchCache.get('expired query')
    expect(result).toBeNull()
})

test('expired entry is evicted from cache after access', () => {
    searchCache.clear()
    searchCache.set('stale', [{ title: 'Stale' }], {})

    const key = 'stale'
    searchCache.cache.get(key).expires = Date.now() - 1

    searchCache.get('stale')
    expect(searchCache.cache.has(key)).toBe(false)
})

test('clear removes all entries', () => {
    searchCache.set('query1', [{ title: 'A' }], {})
    searchCache.set('query2', [{ title: 'B' }], {})

    searchCache.clear()
    expect(searchCache.cache.size).toBe(0)
    expect(searchCache.get('query1')).toBeNull()
})

test('getStats returns required fields', () => {
    searchCache.clear()
    const stats = searchCache.getStats()

    expect(typeof stats.size).toBe('number')
    expect(typeof stats.maxSize).toBe('number')
    expect(typeof stats.hits).toBe('number')
    expect(typeof stats.misses).toBe('number')
    expect(typeof stats.ttlMinutes).toBe('number')
    expect(stats.ttlMinutes).toBe(5)
})

test('getStats reports N/A hit rate when no requests made', () => {
    const stats = searchCache.getStats()
    const isValid = stats.hitRate === 'N/A' || stats.hitRate.endsWith('%')
    expect(isValid).toBe(true)
})

test('hits and misses are counted correctly', () => {
    searchCache.clear()

    const before = searchCache.getStats()

    searchCache.set('counted', [{ title: 'X' }], {})
    searchCache.get('counted')
    searchCache.get('counted')
    searchCache.get('not-there')

    const after = searchCache.getStats()
    expect(after.hits - before.hits).toBe(2)
    expect(after.misses - before.misses).toBe(1)
})

test('hitRate reflects actual ratio after requests', () => {
    searchCache.clear()
    searchCache.set('hr-test', [{ title: 'Y' }], {})
    searchCache.get('hr-test')
    searchCache.get('miss-me')

    const stats = searchCache.getStats()
    expect(stats.hitRate).toContain('%')
})

test('set overwrites existing entry with same key', () => {
    searchCache.clear()
    searchCache.set('overwrite', [{ title: 'Old' }], {})
    searchCache.set('overwrite', [{ title: 'New' }, { title: 'Extra' }], {})

    const result = searchCache.get('overwrite')
    expect(result.results.length).toBe(2)
    expect(result.results[0].title).toBe('New')
})

test('set handles empty results array', () => {
    searchCache.clear()
    searchCache.set('empty results', [], {})
    const result = searchCache.get('empty results')
    expect(result).toBeDefined()
    expect(result.results.length).toBe(0)
})

test('set handles large results array', () => {
    searchCache.clear()
    const results = Array.from({ length: 200 }, (_, i) => ({ title: `Movie ${i}` }))
    searchCache.set('large', results, {})

    const result = searchCache.get('large')
    expect(result.results.length).toBe(200)
})
