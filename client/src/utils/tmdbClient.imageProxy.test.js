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

describe('getImageUrl poster routing', () => {
    beforeEach(() => {
        localStorage.clear()
        localStorage.setItem('serverUrl', 'http://192.168.1.79:3000')
    })

    it('uses a direct CDN mirror by default (keeps NAS out of poster path)', () => {
        const url = getImageUrl('/abc123.jpg', 'w342')

        expect(url).toMatch(/^https:\/\//)
        expect(url).toContain('/t/p/w342/abc123.jpg')
        expect(url).not.toContain('/api/proxy')
    })

    it('falls back to the server proxy when all mirrors are banned (proxy mode)', () => {
        localStorage.setItem('tmdb_image_proxy_enabled', 'true')

        const url = getImageUrl('/abc123.jpg', 'w342')

        expect(url).toBe(
            'http://192.168.1.79:3000/api/proxy?url=' +
            encodeURIComponent('https://image.tmdb.org/t/p/w342/abc123.jpg')
        )
    })

    it('falls back to wsrv when proxy mode is on and no server is configured', () => {
        localStorage.removeItem('serverUrl')
        localStorage.setItem('tmdb_image_proxy_enabled', 'true')

        const url = getImageUrl('/abc123.jpg', 'w342')

        expect(url).toBe('https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/w342/abc123.jpg&output=webp')
    })
})
