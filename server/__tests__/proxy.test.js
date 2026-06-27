import { test, expect } from './test-runner.js'
import { shouldSkipProxyWrite, withTmdbApiKey } from '../routes/proxy.js'

test('shouldSkipProxyWrite blocks writes after the response is settled', () => {
    expect(shouldSkipProxyWrite({
        headersSent: false,
        writableEnded: false,
        destroyed: false
    }, true)).toBe(true)
})

test('shouldSkipProxyWrite blocks writes after headers are already sent', () => {
    expect(shouldSkipProxyWrite({
        headersSent: true,
        writableEnded: false,
        destroyed: false
    }, false)).toBe(true)
})

test('shouldSkipProxyWrite allows the first upstream response write', () => {
    expect(shouldSkipProxyWrite({
        headersSent: false,
        writableEnded: false,
        destroyed: false
    }, false)).toBe(false)
})

test('withTmdbApiKey injects server key into TMDB URLs without api_key', () => {
    const url = withTmdbApiKey(
        'https://api.themoviedb.org/3/discover/movie?primary_release_year=2025&page=1',
        { tmdbApiKey: 'server-key' }
    )

    expect(url).toContain('primary_release_year=2025')
    expect(url).toContain('page=1')
    expect(url).toContain('api_key=server-key')
})

test('withTmdbApiKey preserves existing TMDB api_key', () => {
    const url = withTmdbApiKey(
        'https://api.themoviedb.org/3/discover/movie?api_key=client-key&page=1',
        { tmdbApiKey: 'server-key' }
    )

    expect(url).toContain('api_key=client-key')
    expect(url).not.toContain('api_key=server-key')
})
