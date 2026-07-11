import { test, expect } from './test-runner.js'
import { buildDiscoveryPath, normalizeTraktDiscovery } from '../routes/trakt.js'

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
