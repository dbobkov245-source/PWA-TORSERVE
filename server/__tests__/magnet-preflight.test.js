import { test, expect } from './test-runner.js'
import { preflightResults } from '../magnetPreflight.js'

function makeMagnet(hash) {
    return `magnet:?xt=urn:btih:${hash}`
}

function makeResult(hash, seeders) {
    return {
        id: hash,
        title: hash,
        seeders,
        sizeBytes: 1024,
        magnet: makeMagnet(hash)
    }
}

test('preflightResults returns before slow probes finish when budget expires', async () => {
    const slowProbe = () => new Promise((resolve) => {
        setTimeout(() => resolve({ status: 'playable', peers: 2, durationMs: 50 }), 50)
    })

    const start = Date.now()
    const results = await preflightResults([
        makeResult('1111111111111111111111111111111111111111', 90),
        makeResult('2222222222222222222222222222222222222222', 80)
    ], {
        topN: 2,
        concurrency: 1,
        totalBudgetMs: 10,
        probe: slowProbe
    })

    const elapsed = Date.now() - start
    if (elapsed >= 40) {
        throw new Error(`Expected preflight to stop waiting after budget, got ${elapsed}ms`)
    }

    expect(results[0].playabilityStatus).toBe('unchecked')
    expect(results[1].playabilityStatus).toBe('unchecked')
})

test('preflightResults keeps finished probe results when budget expires mid-batch', async () => {
    const probe = (magnet) => new Promise((resolve) => {
        const delay = magnet.includes('aaaaaaaa') ? 0 : 50
        setTimeout(() => {
            resolve({
                status: magnet.includes('aaaaaaaa') ? 'playable' : 'dead',
                peers: magnet.includes('aaaaaaaa') ? 1 : 0,
                durationMs: delay
            })
        }, delay)
    })

    const results = await preflightResults([
        makeResult('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 100),
        makeResult('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 90)
    ], {
        topN: 2,
        concurrency: 2,
        totalBudgetMs: 10,
        probe
    })

    const playable = results.find((item) => item.id === 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    const pending = results.find((item) => item.id === 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')

    expect(playable.playabilityStatus).toBe('playable')
    expect(pending.playabilityStatus).toBe('unchecked')
})
