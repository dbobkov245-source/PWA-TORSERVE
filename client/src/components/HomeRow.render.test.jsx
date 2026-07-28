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

it('stays reachable by the D-Pad while unfocused', () => {
    // The highlight and the tab stop are different things. Driving both off
    // one prop made every card tabIndex=-1 once the focus left the row, so
    // vertical navigation could never come back into it — rows with small
    // posters became unreachable and only the big-poster rows paged.
    const items = [
        { id: 1, title: 'Первый', poster_path: '/a.jpg' },
        { id: 2, title: 'Второй', poster_path: '/b.jpg' }
    ]
    const view = render(<HomeRow title="Ряд" items={items} categoryId="row" initialIndex={0} isActive />)
    const container = view.container.querySelector('.snap-container')

    fireEvent.blur(container, { relatedTarget: document.body })

    // The container itself is always a tab stop; what matters is that a
    // card inside it still is too.
    const cardTabStops = [...container.querySelectorAll('[tabindex="0"]')]
    expect(cardTabStops.length).toBe(1)
    // ...and it is still not painted as focused.
    expect(view.container.querySelectorAll('.border-\\[\\#63F5C7\\]').length).toBe(0)
})
