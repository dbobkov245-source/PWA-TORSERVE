/**
 * Unit Tests for discover.js utilities
 * PWA-TorServe Client Tests
 */

import { describe, it, expect, vi } from 'vitest'
import {
    getPosterUrl,
    getBackdropUrl,
    getTitle,
    getYear,
    getSearchQuery,
    DISCOVERY_CATEGORIES,
    fetchCategoryWithPages
} from './discover.js'

// ─── Helper Function Tests ─────────────────────────────────────

describe('getTitle', () => {
    it('returns title for movie', () => {
        expect(getTitle({ title: 'Inception' })).toBe('Inception')
    })

    it('returns name for TV show', () => {
        expect(getTitle({ name: 'Breaking Bad' })).toBe('Breaking Bad')
    })

    it('fallback to original_title', () => {
        expect(getTitle({ original_title: 'Original' })).toBe('Original')
    })

    it('returns default for empty item', () => {
        expect(getTitle({})).toBe('Без названия')
        expect(getTitle(null)).toBe('Без названия')
        expect(getTitle(undefined)).toBe('Без названия')
    })

    it('prefers title over name', () => {
        expect(getTitle({ title: 'Movie', name: 'Show' })).toBe('Movie')
    })
})

describe('getYear', () => {
    it('extracts year from release_date', () => {
        expect(getYear({ release_date: '2023-07-21' })).toBe('2023')
    })

    it('extracts year from first_air_date', () => {
        expect(getYear({ first_air_date: '2008-01-20' })).toBe('2008')
    })

    it('prefers release_date over first_air_date', () => {
        expect(getYear({ release_date: '2020-01-01', first_air_date: '2019-01-01' })).toBe('2020')
    })

    it('returns null for missing date', () => {
        expect(getYear({})).toBe(null)
        expect(getYear(null)).toBe(null)
    })
})

describe('getSearchQuery', () => {
    it('returns title for movie', () => {
        expect(getSearchQuery({ title: 'Dune', media_type: 'movie' })).toBe('Dune')
    })

    it('returns title + S01 for TV show', () => {
        expect(getSearchQuery({ name: 'The Bear', media_type: 'tv' })).toBe('The Bear S01')
    })

    it('works without media_type (treated as movie)', () => {
        expect(getSearchQuery({ title: 'Oppenheimer' })).toBe('Oppenheimer')
    })
})

// ─── Poster URL Tests ──────────────────────────────────────────

describe('getPosterUrl', () => {
    it('returns null for empty item', () => {
        expect(getPosterUrl(null)).toBe(null)
        expect(getPosterUrl(undefined)).toBe(null)
        expect(getPosterUrl({})).toBe(null)
    })

    it('returns TMDB poster URL for poster_path', () => {
        const url = getPosterUrl({ poster_path: '/abc123.jpg' })
        expect(url).toContain('abc123.jpg')
        expect(url).toContain('w342') // default size
    })

    it('returns Kinopoisk URL when _kp_data present', () => {
        const url = getPosterUrl({
            _kp_data: { posterUrlPreview: 'https://kp.cdn.com/poster.jpg' }
        })
        expect(url).toContain('wsrv.nl')
        expect(url).toContain('poster.jpg')
    })
})

describe('getBackdropUrl', () => {
    it('returns null for empty item', () => {
        expect(getBackdropUrl(null)).toBe(null)
        expect(getBackdropUrl({})).toBe(null)
    })

    it('returns backdrop URL for backdrop_path', () => {
        const url = getBackdropUrl({ backdrop_path: '/backdrop.jpg' })
        expect(url).toContain('backdrop.jpg')
        expect(url).toContain('w1280') // default size
    })
})

// ─── Categories Config Tests ───────────────────────────────────

describe('DISCOVERY_CATEGORIES', () => {
    it('has required categories', () => {
        const ids = DISCOVERY_CATEGORIES.map(c => c.id)
        expect(ids).toContain('trending')
        expect(ids).toContain('movies')
        expect(ids).toContain('tv')
        expect(ids).toContain('top')
    })

    it('each category has required fields', () => {
        const allowedSources = new Set(['tmdb', 'Apple TV+', 'FOX'])
        const allowedLayouts = new Set(['poster', 'editorial', 'backdrop_below', 'poster_below'])
        DISCOVERY_CATEGORIES.forEach(cat => {
            expect(cat).toHaveProperty('id')
            expect(cat).toHaveProperty('name')
            expect(cat).toHaveProperty('icon')
            expect(cat).toHaveProperty('tier')
            expect(cat.source).toSatisfy(s => allowedSources.has(s))
            expect(cat.layout).toSatisfy(l => allowedLayouts.has(l))
            expect(cat).toHaveProperty('cacheTTL')
            expect(Number.isFinite(cat.cacheTTL)).toBe(true)
            expect(cat).toHaveProperty('fetcher')
            expect(typeof cat.fetcher).toBe('function')
        })
    })

    it('includes expanded Lampa-style rows for long-scroll discovery', () => {
        const ids = DISCOVERY_CATEGORIES.map(c => c.id)
        const expectedIds = [
            'genre_80',
            'genre_9648',
            'genre_12',
            'genre_14',
            'genre_10751',
            'genre_99',
            'genre_36',
            'genre_10752',
            'genre_10402',
            'decade_1980',
            'lang_ja',
            'lang_fr',
            'lang_es',
            'lang_hi',
            'lang_tr',
            'top_tv',
            'tv_airing_today',
            'tv_on_the_air'
        ]
        expectedIds.forEach(id => expect(ids).toContain(id))
    })

    it('keeps first-paint rows bounded and moves long-tail rows to lazy tier', () => {
        const tier1Count = DISCOVERY_CATEGORIES.filter(c => c.tier === 1).length
        const tier3Count = DISCOVERY_CATEGORIES.filter(c => c.tier === 3).length

        expect(tier1Count).toBeLessThanOrEqual(8)
        expect(tier3Count).toBeGreaterThanOrEqual(15)
    })

    it('uses Apple TV-style editorial cards for comics and heist rows', () => {
        const byId = Object.fromEntries(DISCOVERY_CATEGORIES.map(row => [row.id, row]))

        expect(byId.comics_adaptations.layout).toBe('editorial')
        expect(byId.heists_robberies.layout).toBe('editorial')
    })
})

describe('fetchCategoryWithPages', () => {
    it('does not fan out to page two after a cascade failure sentinel', async () => {
        const fetcher = vi.fn().mockResolvedValue({
            results: [], source: 'none', method: 'failed', error: 'offline'
        })

        const result = await fetchCategoryWithPages({ id: 'failed', fetcher })

        expect(fetcher).toHaveBeenCalledOnce()
        expect(result).toEqual(expect.objectContaining({ method: 'failed', error: 'offline', items: [] }))
    })

    it('filters people and missing posters, tops up page two, dedupes, and caps twenty', async () => {
        const pageOne = [
            { id: 1, media_type: 'person', poster_path: '/person.jpg' },
            { id: 2, title: 'No poster' },
            ...Array.from({ length: 12 }, (_, index) => ({ id: index + 3, poster_path: `/${index}.jpg` }))
        ]
        const pageTwo = [
            { id: 3, poster_path: '/duplicate.jpg' },
            ...Array.from({ length: 15 }, (_, index) => ({ id: index + 20, poster_path: `/p2-${index}.jpg` }))
        ]
        const fetcher = vi.fn()
            .mockResolvedValueOnce({ results: pageOne, source: 'tmdb', method: 'worker' })
            .mockResolvedValueOnce({ results: pageTwo, source: 'tmdb', method: 'worker' })

        const result = await fetchCategoryWithPages({ id: 'legacy', fetcher })

        expect(fetcher).toHaveBeenCalledTimes(2)
        expect(result.items).toHaveLength(20)
        expect(result.items.some(item => item.id === 1 || item.id === 2)).toBe(false)
        expect(result.items.filter(item => item.id === 3)).toHaveLength(1)
    })
})
