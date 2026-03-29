import { test, expect } from './test-runner.js'

test('parseMagnetLookupQuery extracts provider and id from request query', async () => {
    const { parseMagnetLookupQuery } = await import('../utils/searchMagnet.js')

    expect(parseMagnetLookupQuery({
        provider: 'rutracker',
        id: 'topic-42'
    })).toEqual({
        provider: 'rutracker',
        id: 'topic-42'
    })
})

test('parseMagnetLookupQuery trims whitespace and rejects missing fields', async () => {
    const { parseMagnetLookupQuery } = await import('../utils/searchMagnet.js')

    expect(parseMagnetLookupQuery({
        provider: ' jacred ',
        id: ' magnet:?xt=urn:btih:abc '
    })).toEqual({
        provider: 'jacred',
        id: 'magnet:?xt=urn:btih:abc'
    })

    expect(() => parseMagnetLookupQuery({ provider: '', id: 'x' })).toThrow('provider and id are required')
    expect(() => parseMagnetLookupQuery({ provider: 'rutor' })).toThrow('provider and id are required')
})
