import { describe, expect, it, vi } from 'vitest'

import {
    getSearchResultActionKey,
    resolveSearchResultMagnet,
    verifySearchResultBeforeAdd
} from './searchResultActions.js'

describe('getSearchResultActionKey', () => {
    it('prefers the magnet link when available', () => {
        expect(getSearchResultActionKey({
            magnet: 'magnet:?xt=urn:btih:abc',
            provider: 'jacred',
            id: '123'
        })).toBe('magnet:?xt=urn:btih:abc')
    })

    it('falls back to provider-qualified id when magnet is missing', () => {
        expect(getSearchResultActionKey({
            provider: 'rutracker',
            id: 'topic-42'
        })).toBe('rutracker:topic-42')
    })
})

describe('resolveSearchResultMagnet', () => {
    it('returns the inline magnet without extra network resolution', async () => {
        const fetchJson = vi.fn()

        const magnet = await resolveSearchResultMagnet({
            magnet: 'magnet:?xt=urn:btih:inline'
        }, fetchJson)

        expect(magnet).toBe('magnet:?xt=urn:btih:inline')
        expect(fetchJson).not.toHaveBeenCalled()
    })

    it('resolves missing magnets through the provider-aware API', async () => {
        const fetchJson = vi.fn(async (requestPath) => {
            expect(requestPath).toBe('/api/v2/magnet?provider=rutracker&id=topic-77')
            return { magnet: 'magnet:?xt=urn:btih:resolved' }
        })

        const magnet = await resolveSearchResultMagnet({
            provider: 'rutracker',
            id: 'topic-77',
            magnet: null
        }, fetchJson)

        expect(magnet).toBe('magnet:?xt=urn:btih:resolved')
        expect(fetchJson).toHaveBeenCalledTimes(1)
    })

    it('throws when neither magnet nor provider-qualified id is available', async () => {
        await expect(resolveSearchResultMagnet({
            id: 'loose-id',
            magnet: null
        }, vi.fn())).rejects.toThrow('Search result is missing magnet resolution metadata')
    })
})

describe('verifySearchResultBeforeAdd', () => {
    it('does not run an extra probe for already playable results', async () => {
        const probeJson = vi.fn()

        const result = await verifySearchResultBeforeAdd({
            playabilityStatus: 'playable',
            preflight: { peers: 2 }
        }, 'magnet:?xt=urn:btih:inline', probeJson)

        expect(result).toEqual({
            status: 'playable',
            peers: 2,
            source: 'cached'
        })
        expect(probeJson).not.toHaveBeenCalled()
    })

    it('probes unchecked results before add', async () => {
        const probeJson = vi.fn(async (magnet) => {
            expect(magnet).toBe('magnet:?xt=urn:btih:probe')
            return { status: 'playable', peers: 1 }
        })

        const result = await verifySearchResultBeforeAdd({
            playabilityStatus: 'unchecked',
            preflight: null
        }, 'magnet:?xt=urn:btih:probe', probeJson)

        expect(result).toEqual({
            status: 'playable',
            peers: 1,
            source: 'probe'
        })
    })

    it('throws for dead probe results so add flow can fail fast', async () => {
        await expect(verifySearchResultBeforeAdd({
            playabilityStatus: 'unchecked'
        }, 'magnet:?xt=urn:btih:dead', vi.fn(async () => ({ status: 'dead', peers: 0 })))).rejects.toThrow('Торрент сейчас недоступен')
    })

    it('rejects restricted bare magnets when the live probe cannot prove playback', async () => {
        await expect(verifySearchResultBeforeAdd({
            playabilityStatus: 'unchecked',
            tracker: 'nnmclub, kinozal',
            magnet: 'magnet:?xt=urn:btih:3B3D300F79252A6BD9C8E9548EFABC136815F935'
        }, 'magnet:?xt=urn:btih:3B3D300F79252A6BD9C8E9548EFABC136815F935', vi.fn(async () => ({ status: 'risky', peers: 0 })))).rejects.toThrow('без announce-адресов')
    })
})
