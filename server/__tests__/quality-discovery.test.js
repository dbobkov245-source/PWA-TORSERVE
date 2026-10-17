/**
 * Home poster quality badges.
 *
 * Badges used to be looked up by title alone: one jac.red phrase search per
 * title and per original title, cached for an hour in memory (lost on every
 * container restart). Posters now send the film itself - title, original
 * title, year, series or not - which jac.red matches like the movie page does.
 */

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from './test-runner.js'

const DAY = 24 * 3600 * 1000

const release = (title, tags) => ({ title, tags, seeders: 10, magnet: null })

/** Swap the registered providers for a fake jac.red for one test. */
async function withJacred(search, run) {
    const { providerManager } = await import('../providers/index.js')
    const quality = await import('../qualityDiscovery.js')
    const original = providerManager.providers
    const fake = { name: 'jacred', enabled: true, isHealthy: () => true, search }
    providerManager.providers = new Map([['jacred', fake]])
    quality.resetQualityCache()
    try {
        return await run(quality)
    } finally {
        providerManager.providers = original
        quality.resetQualityCache()
    }
}

async function withNow(now, run) {
    const original = Date.now
    Date.now = () => now
    try { return await run() } finally { Date.now = original }
}

const dune2021 = { key: 'movie:438631', title: 'Дюна', original_title: 'Dune', year: '2021', is_serial: '1' }
const dune1984 = { key: 'movie:841', title: 'Дюна', original_title: 'Dune', year: '1984', is_serial: '1' }

test('a poster asks jac.red for the film itself, original title first', async () => {
    const calls = []
    const result = await withJacred(async (query, context) => {
        calls.push({ query, context })
        return [release('Dune 2021 2160p HDR', ['2160p', 'hdr']), release('Dune 2021 1080p', ['1080p'])]
    }, (q) => q.batchDiscoverItems([dune2021]))

    assert.deepEqual(calls, [{
        query: 'Dune',
        context: { title: 'Дюна', originalTitle: 'Dune', year: 2021, isSerial: false }
    }])
    assert.deepEqual(result, { 'movie:438631': ['4K', 'HDR'] })
})

test('two films with the same title get their own badges', async () => {
    const result = await withJacred(async (query, context) => (
        context.year === 2021
            ? [release('Dune 2021 2160p', ['2160p'])]
            : [release('Dune 1984 720p', ['720p'])]
    ), (q) => q.batchDiscoverItems([dune2021, dune1984]))

    assert.deepEqual(result, { 'movie:438631': ['4K'], 'movie:841': ['720p'] })
})

test('found badges are kept for a day, an empty answer for six hours', async () => {
    let calls = 0
    const now = Date.UTC(2026, 9, 17, 12)
    const nothing = { key: 'movie:1', title: 'Неизвестный фильм', year: '2026', is_serial: '1' }
    await withJacred(async (query) => {
        calls++
        return query === 'Dune' ? [release('Dune 2160p', ['2160p'])] : []
    }, async (q) => {
        await withNow(now, () => q.batchDiscoverItems([dune2021, nothing]))
        await withNow(now + 5 * 3600 * 1000, () => q.batchDiscoverItems([dune2021, nothing]))
        assert.equal(calls, 2, 'both cached after 5 hours')

        await withNow(now + 7 * 3600 * 1000, () => q.batchDiscoverItems([dune2021, nothing]))
        assert.equal(calls, 3, 'empty answer re-checked after 6 hours, badges still cached')

        await withNow(now + DAY + 60000, () => q.batchDiscoverItems([dune2021]))
        assert.equal(calls, 4, 'badges re-checked after a day')
    })
})

test('the cache survives a restart through its file', async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'quality-')), 'quality-badges.json')
    let calls = 0
    await withJacred(async () => { calls++; return [release('Dune 2160p', ['2160p'])] }, async (q) => {
        await q.batchDiscoverItems([dune2021])
        await q.flushQualityCache(file)

        q.resetQualityCache()
        q.loadQualityCache(file)
        const result = await q.batchDiscoverItems([dune2021])

        assert.equal(calls, 1)
        assert.deepEqual(result, { 'movie:438631': ['4K'] })
    })
})

test('expired or malformed entries in the cache file are ignored', async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'quality-')), 'quality-badges.json')
    await withJacred(async () => [], async (q) => {
        const key = q.qualityItemCacheKey({ title: 'Дюна', originalTitle: 'Dune', year: 2021, isSerial: false })
        writeFileSync(file, JSON.stringify({
            [key]: { badges: ['4K'], expires: Date.now() - 1 },
            broken: { badges: 'not a list', expires: Date.now() + DAY }
        }))
        q.loadQualityCache(file)
        assert.equal(q.getQualityCacheStats().size, 0)

        writeFileSync(file, '{ not json')
        q.loadQualityCache(file)
        assert.equal(q.getQualityCacheStats().size, 0)
    })
})

test('flush writes the cache atomically as JSON', async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'quality-')), 'quality-badges.json')
    await withJacred(async () => [release('Dune 2160p', ['2160p'])], async (q) => {
        await q.batchDiscoverItems([dune2021])
        await q.flushQualityCache(file)
        const saved = JSON.parse(readFileSync(file, 'utf8'))
        const entries = Object.values(saved)
        assert.equal(entries.length, 1)
        assert.deepEqual(entries[0].badges, ['4K'])
    })
})

test('an item without a usable title is skipped, not searched', async () => {
    let calls = 0
    const result = await withJacred(async () => { calls++; return [] },
        (q) => q.batchDiscoverItems([{ key: 'movie:2' }, { title: 'x' }, null]))

    assert.equal(calls, 0)
    assert.deepEqual(result, {})
})

test('old clients asking by title still get badges', async () => {
    const result = await withJacred(async (query, context) => {
        assert.equal(context ?? null, null)
        return [release(`${query} 1080p`, ['1080p'])]
    }, (q) => q.batchDiscoverQuality(['Хищник']))

    assert.deepEqual(result, { 'Хищник': ['1080p'] })
})
