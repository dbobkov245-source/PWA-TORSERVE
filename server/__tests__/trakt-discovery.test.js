import { test, expect } from './test-runner.js'
import * as trakt from '../routes/trakt.js'

const { buildDiscoveryPath, normalizeTraktDiscovery } = trakt

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code
            return this
        },
        json(body) {
            this.body = body
            return this
        }
    }
}

async function callDiscovery({ kind = 'trending', type = 'movies', getClientId, fetchDiscovery }) {
    const response = createResponse()
    const handler = trakt.createDiscoveryHandler({ getClientId, fetchDiscovery })
    await handler({ params: { kind }, query: { type } }, response)
    return response
}

test('Trakt discovery validates route values', () => {
    expect(buildDiscoveryPath('trending', 'movies')).toBe('/movies/trending')
    expect(() => buildDiscoveryPath('unknown', 'movies')).toThrow('bad discovery kind')
    expect(() => buildDiscoveryPath('trending', 'people')).toThrow('bad media type')
})

test('Trakt discovery preserves rank and TMDB id', () => {
    const result = normalizeTraktDiscovery([
        { watchers: 9, movie: { title: 'Heat', year: 1995, ids: { tmdb: 949 } } }
    ], 'movies')
    expect(result[0]).toEqual({
        id: 949,
        rank: 1,
        title: 'Heat',
        name: 'Heat',
        media_type: 'movie',
        release_date: '1995-01-01',
        first_air_date: null
    })
})

test('Trakt discovery rejects an invalid kind before checking configuration', async () => {
    const response = await callDiscovery({
        kind: 'unknown',
        getClientId: () => '',
        fetchDiscovery: async () => { throw new Error('must not fetch') }
    })

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'bad discovery kind' })
})

test('Trakt discovery rejects an invalid media type before checking configuration', async () => {
    const response = await callDiscovery({
        type: 'people',
        getClientId: () => '',
        fetchDiscovery: async () => { throw new Error('must not fetch') }
    })

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'bad media type' })
})

test('Trakt discovery returns 503 when valid input has no client id', async () => {
    let fetchCalls = 0
    const response = await callDiscovery({
        getClientId: () => '',
        fetchDiscovery: async () => { fetchCalls += 1 }
    })

    expect(response.statusCode).toBe(503)
    expect(response.body).toEqual({ error: 'trakt_not_configured' })
    expect(fetchCalls).toBe(0)
})

test('Trakt discovery maps an upstream non-2xx response to its error contract', async () => {
    const response = await callDiscovery({
        getClientId: () => 'public-client-id',
        fetchDiscovery: async () => ({ ok: false, status: 429 })
    })

    expect(response.statusCode).toBe(502)
    expect(response.body).toEqual({ error: 'trakt_discovery_failed', status: 429 })
})

test('Trakt discovery maps transport rejection to its error contract', async () => {
    const response = await callDiscovery({
        getClientId: () => 'public-client-id',
        fetchDiscovery: async () => { throw new Error('socket reset') }
    })

    expect(response.statusCode).toBe(502)
    expect(response.body).toEqual({ error: 'trakt_discovery_failed' })
})

test('Trakt discovery maps malformed upstream JSON to its error contract', async () => {
    const response = await callDiscovery({
        getClientId: () => 'public-client-id',
        fetchDiscovery: async () => ({
            ok: true,
            status: 200,
            json: async () => { throw new SyntaxError('Unexpected token') }
        })
    })

    expect(response.statusCode).toBe(502)
    expect(response.body).toEqual({ error: 'trakt_discovery_failed' })
})
