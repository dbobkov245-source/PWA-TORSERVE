import { describe, expect, it } from 'vitest'
import { ContentRowsRegistry, normalizeRow } from './ContentRowsRegistry'

describe('ContentRowsRegistry', () => {
    it('normalizes required hybrid fields', () => {
        const fetcher = async () => ({ results: [] })
        expect(normalizeRow({ id: 'x', title: 'X', fetcher })).toMatchObject({
            id: 'x', title: 'X', layout: 'poster', source: 'tmdb', tier: 3, order: 100
        })
    })

    it('orders rows and overwrites by id', () => {
        const registry = new ContentRowsRegistry()
        const fetcher = async () => ({ results: [] })
        registry.add([{ id: 'b', title: 'B', order: 20, fetcher }, { id: 'a', title: 'A', order: 10, fetcher }])
        registry.add({ id: 'a', title: 'A2', order: 30, fetcher })
        expect(registry.getAll().map(x => x.title)).toEqual(['B', 'A2'])
    })

    it('rejects unsupported layouts', () => {
        expect(() => normalizeRow({ id: 'x', title: 'X', layout: 'grid', fetcher: async () => ({}) }))
            .toThrow('Unsupported row layout: grid')
    })

    it('preserves legacy discovery metadata as poster rows', () => {
        const registry = new ContentRowsRegistry()
        const fetcher = async () => ({ results: [] })

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
        const fetcher = async () => ({ results: [] })

        registry.init([{ id: 'legacy', name: 'Legacy', icon: '🎬', fetcher }])

        expect(registry.get('legacy')).toMatchObject({
            layout: 'poster',
            source: 'tmdb',
            tier: 3,
            cacheTTL: 60 * 60 * 1000
        })
    })
})
