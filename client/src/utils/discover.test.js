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
    DISCOVERY_CATEGORIES
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
        DISCOVERY_CATEGORIES.forEach(cat => {
            expect(cat).toHaveProperty('id')
            expect(cat).toHaveProperty('name')
            expect(cat).toHaveProperty('icon')
            expect(cat).toHaveProperty('fetcher')
            expect(typeof cat.fetcher).toBe('function')
        })
    })
})
