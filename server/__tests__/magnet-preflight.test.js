import { test, expect } from './test-runner.js'
import { getProbeTimeoutStatus, getReadyProbeStatus, preflightResults } from '../magnetPreflight.js'

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

test('getProbeTimeoutStatus treats zero-peer timeout as unchecked, not dead', () => {
    expect(getProbeTimeoutStatus(0)).toBe('unchecked')
    expect(getProbeTimeoutStatus(2)).toBe('playable')
})

test('getReadyProbeStatus requires real payload before marking a ready torrent playable', () => {
    expect(getReadyProbeStatus({ downloaded: 1024, speed: 0, peers: 1 })).toBe('playable')
    expect(getReadyProbeStatus({ downloaded: 0, speed: 128, peers: 1 })).toBe('playable')
    expect(getReadyProbeStatus({ downloaded: 0, speed: 0, peers: 3 })).toBe('stalled')
    expect(getReadyProbeStatus({ downloaded: 0, speed: 0, peers: 0 })).toBe('risky')
})

test('preflightResults keeps bare private-tracker magnets below public results with proven discovery', async () => {
    const results = await preflightResults([
        {
            id: 'public-1782',
            title: 'Crime 101 WEBRip 1080p',
            seeders: 1782,
            sizeBytes: 7 * 1024 ** 3,
            tracker: 'Rutor',
            magnet: 'magnet:?xt=urn:btih:77f6e4883bdb2b6179e8df18aa18b32234a10c34&tr=udp://opentor.net:6969'
        },
        {
            id: 'public-803',
            title: 'Crime 101 WEBRip',
            seeders: 803,
            sizeBytes: 2 * 1024 ** 3,
            tracker: 'Rutor',
            magnet: 'magnet:?xt=urn:btih:766025d4ffad9b8a19370758500c87c9b7cb5080&tr=udp://opentor.net:6969'
        },
        {
            id: 'public-341',
            title: 'Crime 101 WEB-DLRip',
            seeders: 341,
            sizeBytes: 3 * 1024 ** 3,
            tracker: 'nnmclub, rutor, kinozal',
            magnet: 'magnet:?xt=urn:btih:60021aa73504c3a4e7559b2320478883cf151544&dn=rutor.info&tr=udp://opentor.net:6969'
        },
        {
            id: 'public-151',
            title: 'Crime 101 WEB-DL 1080p',
            seeders: 151,
            sizeBytes: 11 * 1024 ** 3,
            tracker: 'Rutor',
            magnet: 'magnet:?xt=urn:btih:4001f3868d37b270884e292572b6b2b997a1a30c&tr=udp://opentor.net:6969'
        },
        {
            id: 'private-bare-17',
            title: 'Crime 101 4K HDR10+',
            seeders: 17,
            sizeBytes: 20 * 1024 ** 3,
            tracker: 'nnmclub, kinozal',
            magnet: 'magnet:?xt=urn:btih:3B3D300F79252A6BD9C8E9548EFABC136815F935'
        }
    ], {
        topN: 4,
        concurrency: 2,
        totalBudgetMs: 100,
        probe: async () => ({ status: 'risky', peers: 0, durationMs: 10 })
    })

    const bareIndex = results.findIndex((item) => item.id === 'private-bare-17')
    const publicIndex = results.findIndex((item) => item.id === 'public-1782')

    expect(publicIndex).toBe(0)
    expect(bareIndex).toBeGreaterThan(publicIndex)
})
