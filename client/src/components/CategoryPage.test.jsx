import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CategoryPage from './CategoryPage.jsx'

vi.mock('../hooks/useSpatialNavigation', () => ({
    useSpatialItem: () => ({ current: null })
}))

vi.mock('../utils/discover', () => ({
    DISCOVERY_CATEGORIES: [],
    getPosterUrl: () => '',
    getTitle: (item) => item.title || item.name || 'Без названия',
    getYear: (item) => (item.release_date || item.first_air_date || '').slice(0, 4) || null
}))

vi.mock('../utils/tmdbClient', () => ({
    filterDiscoveryResults: (items) => items,
    getNextImageUrl: () => null,
    reportBrokenImage: vi.fn()
}))

describe('CategoryPage loading', () => {
    beforeEach(() => {
        globalThis.IntersectionObserver = class {
            observe() {}
            disconnect() {}
        }
    })

    it('reloads when custom category id and fetcher change even if the title is reused', async () => {
        const fetch2025 = vi.fn(async () => ({
            results: [{ id: 1, title: 'Movie 2025', poster_path: '/2025.jpg', release_date: '2025-01-01' }],
            total_pages: 1
        }))
        const fetch2024 = vi.fn(async () => ({
            results: [{ id: 2, title: 'Movie 2024', poster_path: '/2024.jpg', release_date: '2024-01-01' }],
            total_pages: 1
        }))

        const { rerender } = render(
            <CategoryPage
                customCategory={{ id: 'year_2025', name: 'Год', icon: '📅', fetcher: fetch2025 }}
                onItemClick={() => {}}
            />
        )

        expect(await screen.findByText('Movie 2025')).toBeTruthy()

        rerender(
            <CategoryPage
                customCategory={{ id: 'year_2024', name: 'Год', icon: '📅', fetcher: fetch2024 }}
                onItemClick={() => {}}
            />
        )

        await waitFor(() => expect(fetch2024).toHaveBeenCalledWith(1))
        expect(await screen.findByText('Movie 2024')).toBeTruthy()
    })
})
