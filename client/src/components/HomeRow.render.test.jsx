import { render } from '@testing-library/react'
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
