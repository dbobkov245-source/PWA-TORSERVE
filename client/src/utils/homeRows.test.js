import { beforeEach, describe, expect, it, vi } from 'vitest'

const tmdbMocks = vi.hoisted(() => ({
    fetchTraktDiscovery: vi.fn(),
    getDetails: vi.fn(),
    getRecommendations: vi.fn(),
    getTrending: vi.fn()
}))

vi.mock('./tmdbClient.js', () => tmdbMocks)
vi.mock('./discover.js', () => ({
    DISCOVERY_CATEGORIES: [
        { id: 'legacy', name: 'Legacy row', icon: '🎬', tier: 3, fetcher: vi.fn(), cacheTTL: 123 }
    ]
}))

import {
    buildSwipeCandidates,
    createHybridRows,
    enrichRankedItems,
    filterPersonalItems,
    softDedupeRows
} from './homeRows.js'

describe('home row item helpers', () => {
    it('dedupes only lower-priority discovery rows while preserving row order', () => {
        const rows = [
            { id: 'a', items: [{ id: 1 }, { id: 2 }] },
            { id: 'b', items: [{ id: 2 }, { id: 3 }] }
        ]

        expect(softDedupeRows(rows).map(row => row.items.map(item => item.id))).toEqual([[1, 2], [3]])
    })

    it('excludes watched and duplicate items from swipe candidates', () => {
        const rows = [
            { items: [{ id: 1 }, { id: 2 }] },
            { items: [{ id: 2 }, { id: 3 }] }
        ]

        expect(buildSwipeCandidates(rows, new Set([1])).map(item => item.id)).toEqual([2, 3])
    })

    it('limits swipe candidates to thirty items', () => {
        const rows = [{ items: Array.from({ length: 35 }, (_, index) => ({ id: index + 1 })) }]

        expect(buildSwipeCandidates(rows)).toHaveLength(30)
    })

    it('removes watched and earlier-row items from personal results', () => {
        const result = filterPersonalItems(
            [{ id: 1 }, { id: 2 }, { id: 3 }],
            new Set([1]),
            new Set([2])
        )

        expect(result.map(item => item.id)).toEqual([3])
    })
})

describe('ranked detail enrichment', () => {
    it('enriches the selected ranked slice with at most two requests in flight', async () => {
        let active = 0
        let max = 0
        const getDetailsImpl = async (id) => {
            active++
            max = Math.max(max, active)
            await new Promise(resolve => setTimeout(resolve, 5))
            active--
            return { id, rank: 999, backdrop_path: `/${id}.jpg` }
        }

        const result = await enrichRankedItems(
            [1, 2, 3, 4].map((id, index) => ({ id, rank: index + 1, media_type: 'movie' })),
            0,
            4,
            getDetailsImpl
        )

        expect(max).toBe(2)
        expect(result.map(item => item.rank)).toEqual([1, 2, 3, 4])
        expect(result[3].backdrop_path).toBe('/4.jpg')
    })

    it('preserves input order when detail calls resolve out of order', async () => {
        const result = await enrichRankedItems(
            [1, 2, 3].map(id => ({ id, rank: id, media_type: 'movie' })),
            0,
            3,
            async id => {
                await new Promise(resolve => setTimeout(resolve, (4 - id) * 2))
                return { id, title: `Movie ${id}` }
            }
        )

        expect(result.map(item => item.id)).toEqual([1, 2, 3])
    })
})

describe('hybrid row factory', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        tmdbMocks.fetchTraktDiscovery.mockResolvedValue({ results: [] })
        tmdbMocks.getTrending.mockResolvedValue({ results: [{ id: 7 }], method: 'worker' })
        tmdbMocks.getRecommendations.mockResolvedValue({ results: [{ id: 8 }] })
    })

    it('falls back from empty Trakt discovery to TMDB with a stable source', async () => {
        const rows = createHybridRows({ getHistory: vi.fn().mockResolvedValue([]) })
        const result = await rows.find(row => row.id === 'trakt_trending').fetcher()

        expect(tmdbMocks.getTrending).toHaveBeenCalledWith('day')
        expect(result).toEqual(expect.objectContaining({ results: [{ id: 7 }], source: 'tmdb' }))
    })

    it('uses the first history item with a TMDB id as the personal seed', async () => {
        const getHistory = vi.fn().mockResolvedValue([
            { title: 'unmapped' },
            { tmdbId: 42, mediaType: 'tv' },
            { tmdbId: 99, mediaType: 'movie' }
        ])
        const rows = createHybridRows({ getHistory })

        await rows.find(row => row.id === 'for_you').fetcher()

        expect(tmdbMocks.getRecommendations).toHaveBeenCalledWith(42, 'tv', 21600000)
    })

    it('adapts legacy discovery categories without mutating their fetchers', () => {
        const rows = createHybridRows({ getHistory: vi.fn().mockResolvedValue([]) })
        const legacy = rows.find(row => row.id === 'legacy')

        expect(legacy).toEqual(expect.objectContaining({
            title: 'Legacy row',
            layout: 'poster',
            source: 'tmdb',
            order: 100
        }))
    })
})
