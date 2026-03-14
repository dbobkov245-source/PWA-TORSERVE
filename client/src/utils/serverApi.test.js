import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchTorrents } from './serverApi.js'

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
