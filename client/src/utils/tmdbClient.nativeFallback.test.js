import { beforeEach, describe, expect, it, vi } from 'vitest'

const capacitorMocks = vi.hoisted(() => ({
    get: vi.fn(),
    isNativePlatform: vi.fn(() => true)
}))

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: capacitorMocks.isNativePlatform
    },
    CapacitorHttp: {
        get: capacitorMocks.get
    }
}))

import { getImageUrl, tmdbClient } from './tmdbClient.js'

const jsonResponse = (data, ok = true) => ({
    ok,
    json: vi.fn(async () => data)
})

describe('native metadata fallback isolation', () => {
    beforeEach(() => {
        localStorage.clear()
        localStorage.setItem('serverUrl', 'http://media.local')
        capacitorMocks.get.mockReset()
        vi.restoreAllMocks()
    })

    it('does not start native direct-IP work when Server Proxy succeeds', async () => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
            if (String(url).startsWith('http://media.local/api/proxy?')) {
                return jsonResponse({ results: [{ id: 1 }] })
            }
            return jsonResponse({}, false)
        })

        const result = await tmdbClient('/discover/movie?bug04=server', {
            useCache: false
        })

        expect(result.method).toBe('server_proxy')
        expect(capacitorMocks.get).not.toHaveBeenCalled()
    })

    it('opens a direct-IP circuit on SNI failure and never retries the IP URL', async () => {
        const events = []
        const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
            const value = String(url)
            if (value.startsWith('https://apn-latest.onrender.com/')) {
                events.push('lampa')
            }
            if (value.startsWith('http://media.local/api/proxy?')) {
                events.push('server_proxy')
            }
            if (value.startsWith('https://dns.google/resolve')) {
                return jsonResponse({
                    Answer: [{ type: 1, data: '203.0.113.10' }]
                })
            }
            if (value.startsWith('https://corsproxy.io/')) {
                events.push('corsproxy')
                return jsonResponse({ results: [{ id: 2 }] })
            }
            return jsonResponse({}, false)
        })
        capacitorMocks.get
            .mockImplementationOnce(async () => {
                events.push('capacitor_doh')
                throw new Error('SSLHandshakeException: HANDSHAKE_FAILURE_ON_CLIENT_HELLO')
            })
            .mockImplementationOnce(async () => {
                events.push('capacitor_direct')
                return { data: { results: [{ id: 3 }] } }
            })

        const first = await tmdbClient('/discover/movie?bug04=first', {
            useCache: false
        })
        const second = await tmdbClient('/discover/movie?bug04=second', {
            useCache: false
        })

        expect(first.method).toBe('corsproxy')
        expect(second.method).toBe('capacitor_direct')
        expect(capacitorMocks.get).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                url: expect.stringMatching(/^https:\/\/203\.0\.113\.10\/3\//)
            })
        )
        expect(capacitorMocks.get).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                url: expect.stringMatching(/^https:\/\/api\.themoviedb\.org\/3\//),
                headers: {}
            })
        )
        expect(warnings).toHaveBeenCalledWith(
            expect.stringContaining('Direct-IP circuit OPEN')
        )
        expect(events.slice(0, 4)).toEqual([
            'lampa',
            'server_proxy',
            'capacitor_doh',
            'corsproxy'
        ])
        expect(events.slice(4)).toEqual([
            'lampa',
            'server_proxy',
            'capacitor_direct'
        ])
        for (const [options] of capacitorMocks.get.mock.calls) {
            expect(options).not.toHaveProperty('rejectUnauthorized')
        }
    })

    it('keeps poster routing outside CapacitorHttp and direct-IP DoH', () => {
        const url = getImageUrl('/poster.jpg', 'w342')

        expect(url).toContain('/t/p/w342/poster.jpg')
        expect(capacitorMocks.get).not.toHaveBeenCalled()
    })
})
