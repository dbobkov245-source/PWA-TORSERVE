import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const discoverMocks = vi.hoisted(() => ({
    getPosterUrl: vi.fn(() => '/poster.jpg')
}))

vi.mock('../utils/discover', () => ({
    getPosterUrl: discoverMocks.getPosterUrl,
    getBackdropUrl: discoverMocks.getPosterUrl,
    getTitle: (item) => item.title,
    getYear: () => ''
}))

vi.mock('../utils/tmdbClient', () => ({
    reportBrokenImage: vi.fn(),
    getNextImageUrl: vi.fn(() => null)
}))

vi.mock('../hooks/useSpatialNavigation', () => ({
    useSpatialItem: () => vi.fn()
}))

vi.mock('../hooks/useQualityBadges', () => ({
    getBadgeStyle: () => ''
}))

import HomeRow from './HomeRow.jsx'

describe('HomeRow render regressions', () => {
    beforeEach(() => {
        discoverMocks.getPosterUrl.mockClear()
    })

    it('skips card renders when the parent rerenders with unchanged row props', () => {
        const items = [{ id: 1, title: 'Movie', vote_average: 7 }]
        const onItemClick = vi.fn()
        const onFocusChange = vi.fn()
        const watchedIds = new Set()

        const { rerender } = render(
            <HomeRow
                title="Row"
                items={items}
                onItemClick={onItemClick}
                onFocusChange={onFocusChange}
                watchedIds={watchedIds}
            />
        )

        rerender(
            <HomeRow
                title="Row"
                items={items}
                onItemClick={onItemClick}
                onFocusChange={onFocusChange}
                watchedIds={watchedIds}
            />
        )

        expect(discoverMocks.getPosterUrl).toHaveBeenCalledTimes(1)
    })
})

it('drops the card highlight while the sidebar holds the D-Pad', () => {
    const items = [
        { id: 1, title: 'Первый', poster_path: '/a.jpg' },
        { id: 2, title: 'Второй', poster_path: '/b.jpg' }
    ]
    const props = { title: 'Ряд', items, categoryId: 'row', initialIndex: 0 }

    const view = render(<HomeRow {...props} isActive />)
    const litWhileActive = view.container.querySelectorAll('.border-\\[\\#63F5C7\\]').length
    expect(litWhileActive).toBeGreaterThan(0)

    view.rerender(<HomeRow {...props} isActive={false} />)

    expect(view.container.querySelectorAll('.border-\\[\\#63F5C7\\]').length).toBe(0)
})

it('only highlights a card while the focus sits in this row', () => {
    const items = [
        { id: 1, title: 'Первый', poster_path: '/a.jpg' },
        { id: 2, title: 'Второй', poster_path: '/b.jpg' }
    ]
    const view = render(<HomeRow title="Ряд" items={items} categoryId="row" initialIndex={0} isActive />)
    const container = view.container.querySelector('.snap-container')
    const lit = () => view.container.querySelectorAll('.border-\\[\\#63F5C7\\]').length

    fireEvent.focus(container)
    expect(lit()).toBeGreaterThan(0)

    // D-Pad moves to a different row; this one must stop glowing.
    fireEvent.blur(container, { relatedTarget: document.body })
    expect(lit()).toBe(0)

    fireEvent.focus(container)
    expect(lit()).toBeGreaterThan(0)
})
