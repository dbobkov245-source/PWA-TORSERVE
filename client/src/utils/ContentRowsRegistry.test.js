import { describe, expect, it } from 'vitest'
import { ContentRowsRegistry, normalizeRow } from './ContentRowsRegistry'

describe('ContentRowsRegistry', () => {
    const fetcher = async () => ({ results: [] })
    const validRow = { id: 'x', title: 'X', fetcher }

    it('normalizes required hybrid fields', () => {
        expect(normalizeRow(validRow)).toMatchObject({
            id: 'x', title: 'X', layout: 'poster', source: 'tmdb', tier: 3, order: 100
        })
    })

    it('uses defaults when optional fields are explicitly undefined', () => {
        expect(normalizeRow({
            ...validRow,
            icon: undefined,
            layout: undefined,
            source: undefined,
            tier: undefined,
            order: undefined,
            cacheTTL: undefined
        })).toMatchObject({
            icon: '🎬',
            layout: 'poster',
            source: 'tmdb',
            tier: 3,
            order: 100,
            cacheTTL: 60 * 60 * 1000
        })
    })

    it('accepts valid numeric boundary values', () => {
        expect(normalizeRow({ ...validRow, tier: 1, order: -10, cacheTTL: 0 })).toMatchObject({
            tier: 1,
            order: -10,
            cacheTTL: 0
        })
    })

    it.each([
        ['missing id', { id: undefined }, 'Row id must be a non-empty string'],
        ['null id', { id: null }, 'Row id must be a non-empty string'],
        ['empty id', { id: '' }, 'Row id must be a non-empty string'],
        ['whitespace-only id', { id: '   ' }, 'Row id must be a non-empty string'],
        ['non-string id', { id: 1 }, 'Row id must be a non-empty string'],
        ['missing title', { title: undefined }, 'Row title must be a non-empty string'],
        ['null title', { title: null }, 'Row title must be a non-empty string'],
        ['empty title', { title: '' }, 'Row title must be a non-empty string'],
        ['whitespace-only title', { title: '   ' }, 'Row title must be a non-empty string'],
        ['non-string title', { title: 1 }, 'Row title must be a non-empty string'],
        ['missing fetcher', { fetcher: undefined }, 'Row fetcher must be a function'],
        ['null fetcher', { fetcher: null }, 'Row fetcher must be a function'],
        ['non-function fetcher', { fetcher: {} }, 'Row fetcher must be a function']
    ])('rejects %s', (_label, override, message) => {
        expect(() => normalizeRow({ ...validRow, ...override })).toThrow(message)
    })

    it.each([
        ['empty source', ''],
        ['whitespace-only source', '   '],
        ['non-string source', 1],
        ['null source', null]
    ])('rejects %s', (_label, source) => {
        expect(() => normalizeRow({ ...validRow, source }))
            .toThrow('Row source must be a non-empty string')
    })

    it('orders rows and overwrites by id', () => {
        const registry = new ContentRowsRegistry()
        registry.add([{ id: 'b', title: 'B', order: 20, fetcher }, { id: 'a', title: 'A', order: 10, fetcher }])
        registry.add({ id: 'a', title: 'A2', order: 30, fetcher })
        expect(registry.getAll().map(x => x.title)).toEqual(['B', 'A2'])
    })

    it('reset clears registered rows and initialization state', () => {
        const registry = new ContentRowsRegistry()
        registry.add(validRow)
        registry.initialized = true

        registry.reset()

        expect(registry.getAll()).toEqual([])
        expect(registry.initialized).toBe(false)
    })

    it('rejects unsupported layouts', () => {
        expect(() => normalizeRow({ ...validRow, layout: 'grid' }))
            .toThrow('Unsupported row layout: grid')
    })

    it.each([
        ['empty string', ''],
        ['null', null],
        ['false', false],
        ['zero', 0]
    ])('rejects explicitly supplied %s layout', (_label, layout) => {
        expect(() => normalizeRow({ ...validRow, layout }))
            .toThrow(`Unsupported row layout: ${layout}`)
    })

    it.each([
        ['below range', 0],
        ['above range', 4],
        ['fractional', 1.5],
        ['non-finite', Number.POSITIVE_INFINITY],
        ['non-number', '1'],
        ['null', null]
    ])('rejects %s tier', (_label, tier) => {
        expect(() => normalizeRow({ ...validRow, tier }))
            .toThrow('Row tier must be an integer from 1 to 3')
    })

    it.each([
        ['NaN', Number.NaN],
        ['positive infinity', Number.POSITIVE_INFINITY],
        ['negative infinity', Number.NEGATIVE_INFINITY],
        ['non-number', '10'],
        ['null', null]
    ])('rejects %s order', (_label, order) => {
        expect(() => normalizeRow({ ...validRow, order }))
            .toThrow('Row order must be a finite number')
    })

    it.each([
        ['negative', -1],
        ['NaN', Number.NaN],
        ['infinity', Number.POSITIVE_INFINITY],
        ['non-number', '1000'],
        ['null', null]
    ])('rejects %s cacheTTL', (_label, cacheTTL) => {
        expect(() => normalizeRow({ ...validRow, cacheTTL }))
            .toThrow('Row cacheTTL must be a finite non-negative number')
    })

    it('preserves legacy discovery metadata as poster rows', () => {
        const registry = new ContentRowsRegistry()

        registry.init([{
            id: 'legacy',
            name: 'Legacy',
            icon: '🎬',
            source: 'tmdb',
            tier: 1,
            cacheTTL: 600_000,
            fetcher
        }])

        expect(registry.get('legacy')).toMatchObject({
            id: 'legacy',
            title: 'Legacy',
            icon: '🎬',
            layout: 'poster',
            source: 'tmdb',
            tier: 1,
            cacheTTL: 600_000,
            fetcher
        })
    })

    it('applies hybrid defaults to legacy discovery rows without metadata', () => {
        const registry = new ContentRowsRegistry()

        registry.init([{ id: 'legacy', name: 'Legacy', icon: '🎬', fetcher }])

        expect(registry.get('legacy')).toMatchObject({
            layout: 'poster',
            source: 'tmdb',
            tier: 3,
            cacheTTL: 60 * 60 * 1000
        })
    })

    it.each([
        ['null source', { source: null }, 'Row source must be a non-empty string'],
        ['null tier', { tier: null }, 'Row tier must be an integer from 1 to 3'],
        ['null cacheTTL', { cacheTTL: null }, 'Row cacheTTL must be a finite non-negative number']
    ])('does not mask %s in legacy discovery rows', (_label, override, message) => {
        const registry = new ContentRowsRegistry()
        const category = { id: 'legacy', name: 'Legacy', fetcher, ...override }

        expect(() => registry.init([category])).toThrow(message)
    })
})
