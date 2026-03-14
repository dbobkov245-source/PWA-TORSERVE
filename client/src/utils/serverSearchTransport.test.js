import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchServerSearchJson } from './serverSearchTransport.js'

describe('fetchServerSearchJson', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('skips native fallback when abortable search disables it', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('HTTP blocked'))
        const nativeRequest = vi.fn().mockResolvedValue({
            status: 200,
            data: { items: [] }
        })

        await expect(fetchServerSearchJson('http://192.168.1.70:3000/api/v2/search?query=Dune', {
            signal: new AbortController().signal,
            isNativePlatform: true,
            allowNativeFallback: false,
            nativeRequest
        })).rejects.toThrow('HTTP blocked')

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(nativeRequest).not.toHaveBeenCalled()
    })

    it('uses native fallback for manual native search when enabled', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('HTTP blocked'))
        const nativeRequest = vi.fn().mockResolvedValue({
            status: 200,
            data: JSON.stringify({ items: [{ id: 'native' }], meta: { providers: {} } })
        })

        await expect(fetchServerSearchJson('http://192.168.1.70:3000/api/v2/search?query=Dune', {
            isNativePlatform: true,
            allowNativeFallback: true,
            nativeRequest
        })).resolves.toEqual({
            items: [{ id: 'native' }],
            meta: { providers: {} }
        })

        expect(nativeRequest).toHaveBeenCalledTimes(1)
    })
})
