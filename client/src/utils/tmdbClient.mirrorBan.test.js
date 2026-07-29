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
