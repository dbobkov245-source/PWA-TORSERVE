import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { isNativePlatformMock } = vi.hoisted(() => ({
    isNativePlatformMock: vi.fn(() => false)
}))

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => isNativePlatformMock()
    }
}))

import { searchTorrents, getAIPicks, getFavorites } from './serverApi.js'

describe('searchTorrents', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('calls the v2 search endpoint with limit', async () => {
        localStorage.setItem('serverUrl', 'http://192.168.1.70:3000')

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ items: [], meta: { providers: {} } })
        })

        await searchTorrents('Dune 2021')

        expect(fetchSpy).toHaveBeenCalledWith(
            'http://192.168.1.70:3000/api/v2/search?query=Dune+2021&limit=100'
        )
    })

    it('adds skipCache when forceFresh is enabled', async () => {
        localStorage.setItem('serverUrl', 'http://192.168.1.70:3000')

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ items: [], meta: { providers: {} } })
        })

        await searchTorrents('Fight Club', { limit: 25, forceFresh: true })

        expect(fetchSpy).toHaveBeenCalledWith(
            'http://192.168.1.70:3000/api/v2/search?query=Fight+Club&limit=25&skipCache=1'
        )
    })

    it('forwards abort signal to fetch when provided', async () => {
        localStorage.setItem('serverUrl', 'http://192.168.1.70:3000')

        const controller = new AbortController()
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ items: [], meta: { providers: {} } })
        })

        await searchTorrents('Primate', { signal: controller.signal })

        expect(fetchSpy).toHaveBeenCalledWith(
            'http://192.168.1.70:3000/api/v2/search?query=Primate&limit=100',
            { signal: controller.signal }
        )
    })
})

describe('getAIPicks', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('calls /api/ai-picks on the configured server', async () => {
        localStorage.setItem('serverUrl', 'http://192.168.1.70:3000')

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ([{ id: 1, title: 'Movie' }])
        })

        await getAIPicks()

        expect(fetchSpy).toHaveBeenCalledWith('http://192.168.1.70:3000/api/ai-picks')
    })

    it('returns empty array on server error', async () => {
        localStorage.setItem('serverUrl', 'http://192.168.1.70:3000')

        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: false,
            status: 500
        })

        const result = await getAIPicks()
        expect(result).toEqual([])
    })
})

describe('favorites base URL', () => {
    beforeEach(() => {
        localStorage.clear()
        isNativePlatformMock.mockReturnValue(false)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('does not use window.location.origin for favorites on native builds', async () => {
        localStorage.setItem('serverUrl', 'http://192.168.1.70:3000')
        isNativePlatformMock.mockReturnValue(true)

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ([])
        })

        await getFavorites()

        expect(fetchSpy).toHaveBeenCalledWith('http://192.168.1.70:3000/api/favorites')
    })

    it('falls back to the native default server URL when no server is stored yet', async () => {
        isNativePlatformMock.mockReturnValue(true)

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ([])
        })

        await getFavorites()

        expect(fetchSpy).toHaveBeenCalledWith('http://192.168.1.70:3000/api/favorites')
    })
})
