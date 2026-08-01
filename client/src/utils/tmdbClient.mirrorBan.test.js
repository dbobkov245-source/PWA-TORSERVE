import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: vi.fn(() => true) },
    CapacitorHttp: { request: vi.fn() }
}))

import {
    getCurrentImageMirror,
    reportBrokenImage,
    _resetMirrorStatsForTest,
    MIRROR_BAN_TTL_MS
} from './tmdbClient.js'

const PREFERRED = 'nl.imagetmdb.com'

function failMirror(mirror, times) {
    for (let i = 0; i < times; i++) {
        reportBrokenImage(`https://${mirror}/t/p/w342/x${i}.jpg`)
    }
}

describe('image mirror bans expire', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.useRealTimers()
        _resetMirrorStatsForTest()
    })

    it('bans a mirror only after the error burst threshold', () => {
        failMirror(PREFERRED, 19)
        expect(getCurrentImageMirror()).toBe(PREFERRED)

        failMirror(PREFERRED, 1)
        expect(getCurrentImageMirror()).not.toBe(PREFERRED)
    })

    it('lets a banned mirror come back after the TTL', () => {
        // A ban used to last until the app was restarted. One network blip
        // during a fast scroll cost the mirror for the whole session, and
        // once every mirror had blipped the posters stayed blank until a
        // cold start.
        vi.useFakeTimers()
        const start = Date.now()

        failMirror(PREFERRED, 20)
        expect(getCurrentImageMirror()).not.toBe(PREFERRED)

        vi.setSystemTime(start + MIRROR_BAN_TTL_MS - 1000)
        expect(getCurrentImageMirror()).not.toBe(PREFERRED)

        vi.setSystemTime(start + MIRROR_BAN_TTL_MS + 1000)
        expect(getCurrentImageMirror()).toBe(PREFERRED)
    })

    it('recovers without proxy mode once bans expire', () => {
        vi.useFakeTimers()
        const start = Date.now()

        for (const mirror of ['nl.imagetmdb.com', 'imagetmdb.com', 'de.imagetmdb.com', 'pl.imagetmdb.com']) {
            failMirror(mirror, 20)
        }
        getCurrentImageMirror()

        vi.setSystemTime(start + MIRROR_BAN_TTL_MS + 1000)
        expect(getCurrentImageMirror()).toBe(PREFERRED)
    })
})

describe('warmup does not pin proxy mode', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.useRealTimers()
        _resetMirrorStatsForTest()
    })

    it('leaves proxy mode alone when every warmup probe fails', async () => {
        // Warmup runs once during the cold start, while hundreds of posters
        // compete for the connection. Judging mirrors there and writing a
        // 6h proxy-mode flag meant one unlucky start broke posters for half
        // a day, across restarts.
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('timeout'))))

        const { _warmupImageMirrorsForTest } = await import('./tmdbClient.js')
        await _warmupImageMirrorsForTest()

        expect(localStorage.getItem('tmdb_image_proxy_enabled')).toBe(null)
        vi.unstubAllGlobals()
    })

    it('clears a stuck proxy-mode flag when the routing version changes', async () => {
        const { getCurrentImageMirror, IMAGE_ROUTE_VERSION } = await import('./tmdbClient.js')

        localStorage.setItem('tmdb_image_proxy_enabled', 'true')
        localStorage.setItem('tmdb_image_proxy_enabled_at', String(Date.now()))
        localStorage.setItem('tmdb_image_route_version', 'nl-direct-v2')

        getCurrentImageMirror()

        expect(localStorage.getItem('tmdb_image_proxy_enabled')).toBe(null)
        expect(localStorage.getItem('tmdb_image_route_version')).toBe(IMAGE_ROUTE_VERSION)
    })
})
