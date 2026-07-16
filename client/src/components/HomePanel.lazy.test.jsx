import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const discoverMocks = vi.hoisted(() => ({
    categories: [
        { id: 'tier-1', name: 'Tier 1', icon: '1', tier: 1 },
        { id: 'tier-3', name: 'Tier 3', icon: '3', tier: 3 }
    ],
    fetchCategoryWithPages: vi.fn(async category => ({
        ...category,
        items: [{ id: `${category.id}-movie`, title: category.name }]
    }))
}))

vi.mock('../utils/discover', () => ({
    DISCOVERY_CATEGORIES: discoverMocks.categories,
    fetchCategoryWithPages: discoverMocks.fetchCategoryWithPages,
    getBackdropUrl: () => null
}))

vi.mock('../utils/tmdbClient', () => ({
    default: vi.fn(),
    getDiscoverByGenre: vi.fn()
}))

vi.mock('../utils/serverApi', () => ({
    getFavorites: vi.fn(async () => []),
    getHistory: vi.fn(async () => []),
    getAIPicks: vi.fn(async () => []),
    toTmdbItem: value => value
}))

vi.mock('../utils/traktApi', () => ({
    getTraktSynced: vi.fn(async () => ({ watched: [], watchlist: [] }))
}))

vi.mock('../hooks/useSpatialNavigation', () => ({
    useSpatialItem: () => vi.fn()
}))

vi.mock('../hooks/useQualityBadges', () => ({
    useQualityBadges: () => ({ badges: {}, debug: null })
}))

vi.mock('./HomeRow', () => ({
    default: ({ title }) => <div data-testid="loaded-row">{title}</div>
}))
vi.mock('./ContinueWatchingRow', () => ({ default: () => null }))
vi.mock('./CategoryPage', () => ({ default: () => null }))
vi.mock('./MovieDetail', () => ({ default: () => null }))
vi.mock('./PersonDetail', () => ({ default: () => null }))
vi.mock('./Sidebar', () => {
    const Sidebar = () => null
    Sidebar.getItemsCount = () => 0
    return { default: Sidebar }
})

import HomePanel from './HomePanel.jsx'

describe('HomePanel tier-3 lazy loading', () => {
    it('waits for real vertical movement before loading a tier-3 row', async () => {
        discoverMocks.fetchCategoryWithPages.mockClear()
        const { container } = render(
            <HomePanel
                activeMovie={null}
                setActiveMovie={vi.fn()}
                activePerson={null}
                setActivePerson={vi.fn()}
                activeCategory={null}
                setActiveCategory={vi.fn()}
                showSidebar={false}
                setShowSidebar={vi.fn()}
            />
        )

        await waitFor(() => expect(discoverMocks.fetchCategoryWithPages).toHaveBeenCalled())
        await act(() => new Promise(resolve => setTimeout(resolve, 30)))

        expect(discoverMocks.fetchCategoryWithPages.mock.calls.map(([category]) => category.id))
            .toEqual(['tier-1'])

        const scroller = container.querySelector('.custom-scrollbar')
        Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 100 })
        fireEvent.scroll(scroller)

        await waitFor(() => {
            expect(discoverMocks.fetchCategoryWithPages.mock.calls.map(([category]) => category.id))
                .toEqual(['tier-1', 'tier-3'])
        })
    })
})
