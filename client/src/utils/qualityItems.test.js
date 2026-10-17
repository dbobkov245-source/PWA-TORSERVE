import { describe, it, expect } from 'vitest'
import {
    buildQualityRequestItem,
    getItemBadges,
    qualityItemKey,
    selectQualityItems
} from './qualityItems.js'

const movie = (id, title, extra = {}) => ({ id, title, original_title: `${title} (en)`, release_date: '2024-01-01', media_type: 'movie', ...extra })
const row = (id, count, prefix = id) => ({ id, items: Array.from({ length: count }, (_, i) => movie(`${prefix}${i}`, `${prefix} ${i}`)) })
const keys = (items) => items.map(qualityItemKey)

describe('qualityItemKey', () => {
    it('keys a poster by its TMDB identity, not its title', () => {
        expect(qualityItemKey({ id: 438631, title: 'Дюна', media_type: 'movie' })).toBe('movie:438631')
        expect(qualityItemKey({ id: 83867, name: 'Андор' })).toBe('tv:83867')
        expect(qualityItemKey({ title: 'Без id' })).toBeNull()
    })
})

describe('buildQualityRequestItem', () => {
    it('describes the film the way jac.red matches it', () => {
        expect(buildQualityRequestItem({
            id: 438631, title: 'Дюна', original_title: 'Dune', release_date: '2021-09-15', media_type: 'movie'
        })).toEqual({ key: 'movie:438631', title: 'Дюна', original_title: 'Dune', year: '2021', is_serial: '1' })
    })

    it('gives up on a poster without an id or a title', () => {
        expect(buildQualityRequestItem({ title: 'Без id' })).toBeNull()
        expect(buildQualityRequestItem({ id: 1, media_type: 'movie' })).toBeNull()
    })
})

describe('getItemBadges', () => {
    const dune = { id: 438631, title: 'Дюна', original_title: 'Dune', media_type: 'movie' }

    it('reads badges by the poster key', () => {
        expect(getItemBadges({ 'movie:438631': ['4K', 'HDR'], 'Дюна': ['720p'] }, dune)).toEqual(['4K', 'HDR'])
    })

    it('falls back to title keys from older answers', () => {
        expect(getItemBadges({ 'Дюна': ['1080p'] }, dune)).toEqual(['1080p'])
        expect(getItemBadges({ 'Dune': ['4K'] }, dune)).toEqual(['4K'])
        expect(getItemBadges({}, dune)).toEqual([])
        expect(getItemBadges(null, dune)).toEqual([])
    })
})

describe('selectQualityItems', () => {
    it('starts with the focused poster, then the visible part of its row', () => {
        const rows = [row('top', 10), row('focus', 20), row('low', 10)]
        const selected = selectQualityItems({
            rows,
            focusedItem: rows[1].items[8],
            focusedRowId: 'focus',
            focusedIndex: 8,
            max: 10
        })

        expect(keys(selected)).toEqual([
            'movie:focus8',
            'movie:focus7', 'movie:focus9', 'movie:focus10', 'movie:focus11',
            'movie:focus12', 'movie:focus13', 'movie:focus14', 'movie:focus15',
            'movie:top0'
        ])
    })

    it('fills the rest from the first posters of every row, top to bottom', () => {
        const rows = [row('a', 10), row('b', 10)]
        const selected = selectQualityItems({ rows, focusedItem: null, focusedRowId: null, focusedIndex: -1, max: 40 })

        expect(keys(selected)).toEqual([
            ...[0, 1, 2, 3, 4, 5, 6].map(i => `movie:a${i}`),
            ...[0, 1, 2, 3, 4, 5, 6].map(i => `movie:b${i}`)
        ])
    })

    it('lists each film once and skips posters without an id', () => {
        const shared = movie('same', 'Общий')
        const rows = [
            { id: 'a', items: [shared, { title: 'Без id' }] },
            { id: 'b', items: [shared] }
        ]
        const selected = selectQualityItems({ rows, focusedItem: shared, focusedRowId: 'b', focusedIndex: 0, max: 10 })

        expect(keys(selected)).toEqual(['movie:same'])
    })

    it('stops at the cap', () => {
        const rows = [row('a', 30)]
        expect(selectQualityItems({ rows, focusedItem: rows[0].items[0], focusedRowId: 'a', focusedIndex: 0, max: 5 }))
            .toHaveLength(5)
    })
})
