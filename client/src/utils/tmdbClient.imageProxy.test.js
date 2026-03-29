import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => true)
    },
    CapacitorHttp: {
        request: vi.fn()
    }
}))

import { getImageUrl } from './tmdbClient.js'

describe('getImageUrl native server proxy', () => {
    beforeEach(() => {
        localStorage.clear()
        localStorage.setItem('serverUrl', 'http://192.168.1.70:3000')
    })

    it('uses the configured server proxy for native poster requests', () => {
        const url = getImageUrl('/abc123.jpg', 'w342')

        expect(url).toBe(
            'http://192.168.1.70:3000/api/proxy?url=' +
            encodeURIComponent('https://image.tmdb.org/t/p/w342/abc123.jpg')
        )
    })
})
