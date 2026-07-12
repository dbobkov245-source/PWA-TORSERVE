// @vitest-environment happy-dom

import React from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    addFavorite: vi.fn(async () => ({})),
    createHybridRows: vi.fn(),
    enrichRankedItems: vi.fn(async items => items),
    filterPersonalItems: vi.fn((items, watchedIds, excludedIds) => (
        items.filter(item => !watchedIds.has(item.id) && !excludedIds.has(item.id))
    )),
    softDedupeRows: vi.fn(rows => {
        const seen = new Set()
        return rows.map(row => ({
            ...row,
            items: row.items.filter(item => !seen.has(item.id) && seen.add(item.id))
        }))
    }),
    buildSwipeCandidates: vi.fn(rows => rows.flatMap(row => row.items).slice(0, 30)),
    readHomeSnapshot: vi.fn(() => null),
    writeHomeSnapshot: vi.fn(),
    readHomeFocus: vi.fn(() => null),
    writeHomeFocus: vi.fn(),
    registryReset: vi.fn(),
    registryAdd: vi.fn(),
    useQualityBadges: vi.fn(() => ({ badges: {}, debug: {} })),
    getHistory: vi.fn(async () => []),
    getTraktSynced: vi.fn(async () => ({ watched: [], watchlist: [] })),
}))

const RowMock = ({ id, items = [], source, isActive, onSelect, onFocusChange, onNearEnd, testId }) => (
    <section data-testid={testId} data-row-id={id} data-source={source} data-active={String(isActive)}>
        <div className="snap-container">
            {items.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    data-item-id={item.id}
                    onFocus={() => onFocusChange?.(item, index)}
                    onClick={() => onSelect?.(item)}
                >
                    {item.title || item.name || item.id}
                </button>
            ))}
        </div>
        {onNearEnd && <button type="button" onClick={onNearEnd}>near-end-{id}</button>}
    </section>
)

vi.mock('../utils/homeRows.js', () => ({
    createHybridRows: mocks.createHybridRows,
    enrichRankedItems: mocks.enrichRankedItems,
    filterPersonalItems: mocks.filterPersonalItems,
    softDedupeRows: mocks.softDedupeRows,
    buildSwipeCandidates: mocks.buildSwipeCandidates,
}))
vi.mock('../utils/homeSnapshot.js', () => ({
    readHomeSnapshot: mocks.readHomeSnapshot,
    writeHomeSnapshot: mocks.writeHomeSnapshot,
    readHomeFocus: mocks.readHomeFocus,
    writeHomeFocus: mocks.writeHomeFocus,
}))
vi.mock('../utils/ContentRowsRegistry.js', () => ({
    contentRowsRegistry: {
        reset: mocks.registryReset,
        add: mocks.registryAdd,
    }
}))
vi.mock('../utils/discover', () => ({
    DISCOVERY_CATEGORIES: [],
    getBackdropUrl: vi.fn(() => null),
}))
vi.mock('../utils/tmdbClient', () => ({
    default: vi.fn(async () => ({})),
    getDiscoverByGenre: vi.fn(),
}))
vi.mock('../utils/serverApi', () => ({
    addFavorite: mocks.addFavorite,
    getFavorites: vi.fn(async () => []),
    getHistory: mocks.getHistory,
    getAIPicks: vi.fn(async () => []),
    toTmdbItem: vi.fn(item => item),
}))
vi.mock('../utils/traktApi', () => ({ getTraktSynced: mocks.getTraktSynced }))
vi.mock('../hooks/useQualityBadges', () => ({ useQualityBadges: mocks.useQualityBadges }))
vi.mock('../hooks/useSpatialNavigation', () => ({ useSpatialItem: () => vi.fn() }))
vi.mock('./HomeRow', () => ({
    default: props => <RowMock {...props} id={props.categoryId} onSelect={props.onItemClick} testId="poster-row" />
}))
vi.mock('./EditorialRow', () => ({ default: props => <RowMock {...props} testId="editorial-row" /> }))
vi.mock('./RankedRow', () => ({ default: props => <RowMock {...props} testId="ranked-row" /> }))
vi.mock('./SwipeHero', () => ({
    default: ({ onOpen, isActive }) => (
        <button type="button" data-testid="swipe-hero" data-active={String(isActive)} onClick={onOpen}>picker</button>
    )
}))
vi.mock('./SwipePicker', () => ({
    default: ({ items, onFavorite, onOpenItem, onClose }) => (
        <div role="dialog" data-candidates={items.map(item => item.id).join(',')}>
            <button type="button" onClick={() => onFavorite(items[0])}>favorite</button>
            <button type="button" onClick={() => onOpenItem(items[0])}>open</button>
            <button type="button" onClick={onClose}>close-picker</button>
        </div>
    )
}))
vi.mock('./ContinueWatchingRow', () => ({ default: () => <div data-testid="continue-row" /> }))
vi.mock('./CategoryPage', () => ({ default: () => <div data-testid="category-page" /> }))
vi.mock('./PersonDetail', () => ({ default: () => <div data-testid="person-detail" /> }))
vi.mock('./MovieDetail', () => ({
    default: ({ onBack }) => <button type="button" onClick={onBack}>back-from-detail</button>
}))
vi.mock('./Sidebar', () => ({
    default: Object.assign(
        () => <div data-testid="sidebar" />,
        { getItemsCount: () => 10 }
    ),
}))

import HomePanel from './HomePanel'

const item = (id, extra = {}) => ({ id, title: `Item ${id}`, ...extra })
const row = (id, layout = 'poster', extra = {}) => ({
    id,
    title: id,
    icon: '🎬',
    layout,
    source: 'tmdb',
    tier: 1,
    order: 10,
    fetcher: vi.fn(async () => ({ results: [item(1)] })),
    ...extra,
})

const baseProps = {
    activeMovie: null,
    setActiveMovie: vi.fn(),
    activePerson: null,
    setActivePerson: vi.fn(),
    activeCategory: null,
    setActiveCategory: vi.fn(),
    showSidebar: false,
    setShowSidebar: vi.fn(),
    onSearch: vi.fn(),
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    mocks.createHybridRows.mockReturnValue([])
    mocks.readHomeSnapshot.mockReturnValue(null)
    mocks.readHomeFocus.mockReturnValue(null)
    mocks.getHistory.mockResolvedValue([])
    mocks.getTraktSynced.mockResolvedValue({ watched: [], watchlist: [] })
    mocks.useQualityBadges.mockReturnValue({ badges: {}, debug: {} })
})

describe('hybrid row orchestration', () => {
    it.each([
        ['editorial', 'editorial-row'],
        ['ranked', 'ranked-row'],
        ['poster', 'poster-row'],
    ])('renders %s rows with matching component', async (layout, testId) => {
        mocks.createHybridRows.mockReturnValue([row('x', layout)])

        const view = render(<HomePanel {...baseProps} />)

        expect(await view.findByTestId(testId)).toBeTruthy()
        expect(mocks.registryReset).toHaveBeenCalledOnce()
        expect(mocks.registryAdd).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ id: 'x', layout })
        ]))
        const persistedRow = mocks.writeHomeSnapshot.mock.calls.at(-1)[0][0]
        expect(persistedRow).not.toHaveProperty('fetcher')
        expect(persistedRow).not.toHaveProperty('results')
        expect(() => JSON.stringify(persistedRow)).not.toThrow()
    })

    it('renders a cached row before its network fetch settles', () => {
        const fetcher = vi.fn(() => new Promise(() => {}))
        mocks.getHistory.mockReturnValue(new Promise(() => {}))
        mocks.getTraktSynced.mockReturnValue(new Promise(() => {}))
        mocks.createHybridRows.mockReturnValue([row('cached', 'poster', { fetcher })])
        mocks.readHomeSnapshot.mockReturnValue({
            rows: [{ ...row('cached', 'poster'), fetcher: undefined, items: [item(9)] }],
            savedAt: 1,
        })

        const view = render(<HomePanel {...baseProps} />)

        expect(view.getByText('Item 9')).toBeTruthy()
    })

    it('keeps registry order, filters personal rows, and softly dedupes lower rows', async () => {
        mocks.createHybridRows.mockReturnValue([
            row('editorial', 'editorial', { order: 10, fetcher: vi.fn(async () => ({ results: [item(1), item(2)] })) }),
            row('ranked', 'ranked', { order: 20, fetcher: vi.fn(async () => ({ results: [item(2), item(3)] })) }),
            row('for_you', 'personal', { tier: 2, order: 30, fetcher: vi.fn(async () => ({ results: [item(1), item(4)] })) }),
        ])

        const view = render(<HomePanel {...baseProps} />)
        await view.findByText('Item 3')
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 2100)) })

        const renderedRows = [...view.container.querySelectorAll('.custom-scrollbar > [data-row-id]')]
        expect(renderedRows.map(node => node.dataset.rowId)).toEqual(['editorial', 'ranked', 'for_you'])
        expect(renderedRows.map(node => [...node.querySelectorAll('[data-item-id]')].map(x => Number(x.dataset.itemId))))
            .toEqual([[1, 2], [3], [4]])
        expect(mocks.filterPersonalItems).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 4 })]),
            expect.any(Set),
            new Set([1, 2, 3])
        )
    })

    it('caps quality discovery titles and passes source and active state to rows', async () => {
        mocks.createHybridRows.mockReturnValue([row('x', 'editorial', {
            source: 'trakt',
            fetcher: vi.fn(async () => ({
                results: Array.from({ length: 20 }, (_, index) => item(index + 1, {
                    original_title: index === 1 ? 'Original 1' : `Original ${index + 1}`
                }))
            }))
        })])

        const view = render(<HomePanel {...baseProps} showSidebar />)
        const rendered = await view.findByTestId('editorial-row')

        expect(rendered.dataset.source).toBe('trakt')
        expect(rendered.dataset.active).toBe('false')
        expect(mocks.useQualityBadges.mock.calls.at(-1)[0]).toHaveLength(12)
    })
})

describe('picker, enrichment, and focus persistence', () => {
    it('opens the picker with unwatched candidates and wires favorite/open/close actions', async () => {
        mocks.getTraktSynced.mockResolvedValue({ watched: [2], watchlist: [] })
        mocks.buildSwipeCandidates.mockReturnValue([item(1)])
        mocks.createHybridRows.mockReturnValue([row('x', 'poster', {
            fetcher: vi.fn(async () => ({ results: [item(1), item(2)] }))
        })])

        const view = render(<HomePanel {...baseProps} />)
        await view.findByText('Item 1')
        fireEvent.click(view.getByTestId('swipe-hero'))

        const dialog = view.getByRole('dialog')
        expect(dialog.dataset.candidates).toBe('1')
        expect(view.getByTestId('poster-row').dataset.active).toBe('false')
        fireEvent.click(view.getByText('close-picker'))
        expect(view.queryByRole('dialog')).toBeNull()
        fireEvent.click(view.getByTestId('swipe-hero'))
        fireEvent.click(view.getByText('favorite'))
        expect(mocks.addFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
        fireEvent.click(view.getByText('open'))
        expect(baseProps.setActiveMovie).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
        expect(view.queryByRole('dialog')).toBeNull()
    })

    it('enriches the first missing ranked batch and persists the replacement row', async () => {
        const rankedItems = [item(1, { backdrop_path: '/1.jpg' }), item(2), item(3), item(4)]
        const enriched = rankedItems.map(value => ({ ...value, backdrop_path: value.backdrop_path || `/${value.id}.jpg` }))
        mocks.enrichRankedItems.mockResolvedValue(enriched)
        mocks.createHybridRows.mockReturnValue([row('ranked', 'ranked', {
            fetcher: vi.fn(async () => ({ results: rankedItems }))
        })])

        const view = render(<HomePanel {...baseProps} />)
        await view.findByText('Item 4')
        fireEvent.click(view.getByText('near-end-ranked'))

        await waitFor(() => expect(mocks.enrichRankedItems).toHaveBeenCalledWith(rankedItems, 1, 3))
        expect(mocks.writeHomeSnapshot).toHaveBeenLastCalledWith([
            expect.objectContaining({ id: 'ranked', items: enriched })
        ])
    })

    it('records row/item/scroll focus and restores it after returning from detail', async () => {
        mocks.readHomeFocus.mockReturnValue({
            rowId: 'x', itemIndex: 1, verticalScroll: 55, horizontalScroll: 77,
        })
        mocks.createHybridRows.mockReturnValue([row('x', 'poster', {
            fetcher: vi.fn(async () => ({ results: [item(1), item(2)] }))
        })])

        const Harness = () => {
            const [activeMovie, setActiveMovie] = React.useState(null)
            return <HomePanel {...baseProps} activeMovie={activeMovie} setActiveMovie={setActiveMovie} />
        }
        const view = render(<Harness />)
        const second = await view.findByText('Item 2')
        const scroller = second.closest('.snap-container')
        const homeScroller = view.container.querySelector('.custom-scrollbar')
        scroller.scrollLeft = 77
        homeScroller.scrollTop = 55

        second.focus()
        expect(mocks.writeHomeFocus).toHaveBeenLastCalledWith({
            rowId: 'x', itemIndex: 1, verticalScroll: 55, horizontalScroll: 77,
        })
        fireEvent.click(second)
        fireEvent.click(await view.findByText('back-from-detail'))

        await waitFor(() => expect(document.activeElement?.textContent).toBe('Item 2'))
        expect(view.container.querySelector('.custom-scrollbar').scrollTop).toBe(55)
        expect(view.container.querySelector('[data-row-id="x"] .snap-container').scrollLeft).toBe(77)
    })
})

describe('bounded loading', () => {
    it('keeps tier-three timer fallback serial when observers and scroll proximity do not fire', async () => {
        vi.useFakeTimers()
        vi.stubGlobal('IntersectionObserver', class {
            observe() {}
            disconnect() {}
        })
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect() {
            return this.hasAttribute('data-category-id') ? { top: 10_000 } : { bottom: 100 }
        })
        let active = 0
        let maximum = 0
        const resolvers = []
        mocks.createHybridRows.mockReturnValue([0, 1].map(index => row(`lazy-${index}`, 'poster', {
            tier: 3,
            fetcher: vi.fn(() => new Promise(resolve => {
                active++
                maximum = Math.max(maximum, active)
                resolvers.push(() => { active--; resolve({ results: [item(index + 1)] }) })
            }))
        })))

        const view = render(<HomePanel {...baseProps} />)
        await act(async () => { await vi.advanceTimersByTimeAsync(1599) })
        expect(resolvers).toHaveLength(0)
        await act(async () => { await vi.advanceTimersByTimeAsync(1) })
        expect(resolvers).toHaveLength(1)
        await act(async () => {
            resolvers.shift()()
            await Promise.resolve()
            await vi.advanceTimersByTimeAsync(1600)
        })
        expect(resolvers).toHaveLength(1)
        expect(maximum).toBe(1)

        view.unmount()
        resolvers.splice(0).forEach(resolve => resolve())
    })

    it('limits tier-one fetches to three concurrent requests', async () => {
        let active = 0
        let maximum = 0
        const resolvers = []
        mocks.createHybridRows.mockReturnValue(Array.from({ length: 5 }, (_, index) => row(`r${index}`, 'poster', {
            fetcher: vi.fn(() => new Promise(resolve => {
                active++
                maximum = Math.max(maximum, active)
                resolvers.push(() => { active--; resolve({ results: [item(index + 1)] }) })
            }))
        })))

        const view = render(<HomePanel {...baseProps} />)
        await waitFor(() => expect(resolvers).toHaveLength(3))
        await act(async () => {
            resolvers.shift()()
            await Promise.resolve()
        })
        await waitFor(() => expect(resolvers).toHaveLength(3))

        expect(maximum).toBe(3)
        view.unmount()
        resolvers.splice(0).forEach(resolve => resolve())
    })

    it('retries a failed row exactly once after one second', async () => {
        vi.useFakeTimers()
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const fetcher = vi.fn()
            .mockRejectedValueOnce(new Error('temporary'))
            .mockResolvedValueOnce({ results: [item(1)] })
        mocks.createHybridRows.mockReturnValue([row('retry', 'poster', { fetcher })])

        render(<HomePanel {...baseProps} />)
        await act(async () => { await Promise.resolve(); await Promise.resolve() })
        expect(fetcher).toHaveBeenCalledOnce()

        await act(async () => { await vi.advanceTimersByTimeAsync(999) })
        expect(fetcher).toHaveBeenCalledOnce()
        await act(async () => { await vi.advanceTimersByTimeAsync(1) })
        expect(fetcher).toHaveBeenCalledTimes(2)
        expect(fetcher).toHaveBeenCalledTimes(2)
    })
})
