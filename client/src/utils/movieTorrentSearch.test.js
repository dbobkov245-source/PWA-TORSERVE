import { describe, it, expect } from 'vitest'
import {
    buildMovieTorrentQueries,
    getMovieTorrentKey,
    getMovieTorrentSummary,
    shouldStopMovieTorrentPreload
} from './movieTorrentSearch.js'

describe('getMovieTorrentKey', () => {
    it('builds a stable movie cache key', () => {
        expect(getMovieTorrentKey({
            id: 603,
            media_type: 'movie'
        })).toBe('movie:603')
    })

    it('treats items with name as TV by default', () => {
        expect(getMovieTorrentKey({
            id: 1399,
            name: 'Game of Thrones'
        })).toBe('tv:1399')
    })
})

describe('buildMovieTorrentQueries', () => {
    it('builds movie queries in year-first order and removes duplicates', () => {
        const item = {
            id: 603,
            title: 'Матрица',
            original_title: 'The Matrix',
            release_date: '1999-03-31',
            media_type: 'movie'
        }

        expect(buildMovieTorrentQueries(item)).toEqual([
            'The Matrix 1999',
            'Матрица 1999',
            'The Matrix',
            'Матрица'
        ])
    })

    it('deduplicates repeated movie titles', () => {
        const item = {
            id: 13,
            title: 'Fight Club',
            original_title: 'Fight Club',
            release_date: '1999-10-15',
            media_type: 'movie'
        }

        expect(buildMovieTorrentQueries(item)).toEqual([
            'Fight Club 1999',
            'Fight Club'
        ])
    })

    it('builds TV season-pack oriented queries', () => {
        const item = {
            id: 1399,
            name: 'Игра престолов',
            original_name: 'Game of Thrones',
            first_air_date: '2011-04-17',
            media_type: 'tv'
        }

        expect(buildMovieTorrentQueries(item)).toEqual([
            'Game of Thrones',
            'Игра престолов',
            'Game of Thrones season 1',
            'Игра престолов season 1',
            'Game of Thrones s01',
            'Игра престолов s01'
        ])
    })
})

describe('shouldStopMovieTorrentPreload', () => {
    it('stops when there are enough total results', () => {
        const items = Array.from({ length: 5 }, (_, index) => ({
            id: `result-${index}`,
            seeders: 0
        }))

        expect(shouldStopMovieTorrentPreload(items)).toBe(true)
    })

    it('stops when there are at least two seeded results', () => {
        const items = [
            { id: 'a', seeders: 12 },
            { id: 'b', seeders: 3 }
        ]

        expect(shouldStopMovieTorrentPreload(items)).toBe(true)
    })

    it('continues when results are too weak', () => {
        const items = [
            { id: 'a', seeders: 1 },
            { id: 'b', seeders: 0 },
            { id: 'c', seeders: 0 }
        ]

        expect(shouldStopMovieTorrentPreload(items)).toBe(false)
    })
})

describe('getMovieTorrentSummary', () => {
    it('returns compact summary data for the strongest result', () => {
        const summary = getMovieTorrentSummary([
            { id: 'one', seeders: 18, tags: ['720p'] },
            { id: 'two', seeders: 245, tags: ['1080p', 'hdr'] },
            { id: 'three', seeders: 80, tags: ['2160p', 'hevc'] }
        ])

        expect(summary).toEqual({
            count: 3,
            bestSeeders: 245,
            bestQuality: '1080p',
            label: 'Найдено 3 · лучший 1080p · 245 сидов'
        })
    })

    it('returns empty summary for no results', () => {
        expect(getMovieTorrentSummary([])).toEqual({
            count: 0,
            bestSeeders: 0,
            bestQuality: null,
            label: 'Ничего не найдено'
        })
    })
})
