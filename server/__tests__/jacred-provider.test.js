/**
 * Jacred query shape.
 *
 * A bare `Query=F1` makes jac.red match the phrase against release names and
 * returned 2 one-seeder releases literally called "F1 / F1". Lampa adds
 * `title` + `title_original`, which matches the film's title field instead:
 * 74 releases, top one 7187 seeders ("Формула-1 / F1: The Movie"). Measured
 * live 2026-10-11.
 */

import assert from 'node:assert/strict'
import { test } from './test-runner.js'

function jacredResponse(results) {
    return new Response(JSON.stringify({ Results: results }), { status: 200 })
}

const release = (title, seeders) => ({
    Guid: title, Title: title, Size: 1, Seeders: seeders, Tracker: 'rutor',
    MagnetUri: `magnet:?xt=urn:btih:${String(seeders).padStart(40, '0')}`
})

async function withFetch(impl, run) {
    const original = globalThis.fetch
    globalThis.fetch = impl
    try { return await run() } finally { globalThis.fetch = original }
}

test('jacred is asked by title the way Lampa asks it', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const urls = []
    const results = await withFetch(async (url) => {
        urls.push(new URL(url))
        return jacredResponse([release('F1 / F1: The Movie (2025) WEB-DL 1080p', 7187)])
    }, () => new JacredProvider().search('F1'))

    assert.equal(urls.length, 1)
    assert.equal(urls[0].searchParams.get('Query'), 'F1')
    assert.equal(urls[0].searchParams.get('title'), 'F1')
    assert.equal(urls[0].searchParams.get('title_original'), 'F1')
    assert.equal(results[0].seeders, 7187)
})

test('a title search that finds nothing falls back to the bare phrase query', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const urls = []
    const results = await withFetch(async (url) => {
        const parsed = new URL(url)
        urls.push(parsed)
        return parsed.searchParams.has('title')
            ? jacredResponse([])
            : jacredResponse([release('Andor S01 1080p', 40)])
    }, () => new JacredProvider().search('Andor season 1'))

    assert.equal(urls.length, 2)
    assert.equal(urls[1].searchParams.get('title'), null)
    assert.equal(results.length, 1)
})

test('the 50-result cap keeps the best-seeded releases, not the first ones', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const many = Array.from({ length: 60 }, (_, i) => release(`F1 rip ${i}`, i))
    const results = await withFetch(async () => jacredResponse(many), () => new JacredProvider().search('F1'))

    assert.equal(results.length, 50)
    assert.equal(results[0].seeders, 59)
    assert.ok(results.every(r => r.seeders >= 10))
})
