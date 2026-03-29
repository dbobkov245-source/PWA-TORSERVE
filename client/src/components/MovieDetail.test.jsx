import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import MovieDetail from './MovieDetail.jsx'

const { addFavoriteMock } = vi.hoisted(() => ({
    addFavoriteMock: vi.fn(async () => ({}))
}))

vi.mock('@capacitor/app', () => ({
    App: {
        addListener: vi.fn(async () => ({ remove: vi.fn() }))
    }
}))

vi.mock('@capacitor/browser', () => ({
    Browser: {
        open: vi.fn()
    }
}))

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => false
    }
}))

vi.mock('../hooks/useSpatialNavigation', () => ({
    useSpatialItem: () => ({ current: null })
}))

vi.mock('../utils/genres', () => ({
    getGenreObjectsForItem: () => []
}))

vi.mock('../utils/discover', () => ({
    getBackdropUrl: () => null,
    getPosterUrl: () => null,
    getTitle: (item) => item.title || item.name || 'Без названия',
    getYear: (item) => (item.release_date || item.first_air_date || '').slice(0, 4) || null,
    getSearchQuery: (item) => item.title || item.name || '',
    getImageUrl: () => null
}))

vi.mock('../utils/tmdbClient', () => ({
    reportBrokenImage: vi.fn(),
    getCredits: vi.fn(async () => ({ crew: [], cast: [] })),
    getVideos: vi.fn(async () => ({ results: [] })),
    getDetails: vi.fn(async () => ({ seasons: [] })),
    getSeasonDetails: vi.fn(async () => ({ episodes: [] })),
    getRecommendations: vi.fn(async () => ({ results: [] })),
    getCollection: vi.fn(async () => ({ parts: [] })),
    getKeywords: vi.fn(async () => ({ keywords: [] })),
    getDiscoverByKeywords: vi.fn(async () => ({ results: [] }))
}))

vi.mock('../utils/serverApi', () => ({
    getFavorites: vi.fn(async () => []),
    addFavorite: addFavoriteMock,
    removeFavorite: vi.fn(async () => ({})),
    recordHistory: vi.fn(async () => ({}))
}))

describe('MovieDetail action row', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('keeps manual torrent search and adds the preloaded torrents action', async () => {
        const onSearch = vi.fn()
        const onOpenMovieTorrents = vi.fn()

        render(
            <MovieDetail
                item={{
                    id: 603,
                    title: 'The Matrix',
                    release_date: '1999-03-31',
                    media_type: 'movie',
                    vote_average: 8.7,
                    overview: 'Neo chooses.'
                }}
                torrentSession={{
                    status: 'ready',
                    items: [{ id: 'one', seeders: 12, tags: ['1080p'] }]
                }}
                onOpenMovieTorrents={onOpenMovieTorrents}
                onSearch={onSearch}
                onBack={() => {}}
                onSelect={() => {}}
                onSelectPerson={() => {}}
                onSelectGenre={() => {}}
            />
        )

        await act(async () => {
            vi.advanceTimersByTime(600)
            await Promise.resolve()
        })

        fireEvent.click(screen.getByRole('button', { name: /Торренты · 1/ }))
        fireEvent.click(screen.getByRole('button', { name: '🔍 Найти торренты' }))

        expect(onOpenMovieTorrents).toHaveBeenCalledTimes(1)
        expect(onSearch).toHaveBeenCalledWith('The Matrix')
    })

    it('renders primary actions with favorite inside the main TV action row', async () => {
        render(
            <MovieDetail
                item={{
                    id: 603,
                    title: 'The Matrix',
                    release_date: '1999-03-31',
                    media_type: 'movie',
                    vote_average: 8.7,
                    overview: 'Neo chooses.'
                }}
                torrentSession={{
                    status: 'ready',
                    items: [{ id: 'one', seeders: 12, tags: ['1080p'] }]
                }}
                onOpenMovieTorrents={() => {}}
                onSearch={() => {}}
                onBack={() => {}}
                onSelect={() => {}}
                onSelectPerson={() => {}}
                onSelectGenre={() => {}}
            />
        )

        await act(async () => {
            vi.advanceTimersByTime(600)
            await Promise.resolve()
        })

        const primaryActions = screen.getByTestId('movie-primary-actions')
        const favoriteButton = screen.getByRole('button', { name: '🤍 Избранное' })

        expect(primaryActions.className).toContain('grid')
        expect(primaryActions.className).toContain('sm:grid-cols-4')
        expect(screen.getByRole('button', { name: /Торренты · 1/ }).className).toContain('w-full')
        expect(screen.getByRole('button', { name: '🔍 Найти торренты' }).className).toContain('w-full')
        expect(screen.getByRole('button', { name: '⬅️ Назад' }).className).toContain('w-full')
        expect(favoriteButton.className).toContain('w-full')
        expect(within(primaryActions).getByRole('button', { name: '🤍 Избранное' })).toBe(favoriteButton)
    })

    it('toggles favorite from the primary action row after interaction delay', async () => {
        render(
            <MovieDetail
                item={{
                    id: 603,
                    title: 'The Matrix',
                    release_date: '1999-03-31',
                    media_type: 'movie',
                    vote_average: 8.7,
                    overview: 'Neo chooses.'
                }}
                torrentSession={{
                    status: 'ready',
                    items: [{ id: 'one', seeders: 12, tags: ['1080p'] }]
                }}
                onOpenMovieTorrents={() => {}}
                onSearch={() => {}}
                onBack={() => {}}
                onSelect={() => {}}
                onSelectPerson={() => {}}
                onSelectGenre={() => {}}
            />
        )

        await act(async () => {
            vi.advanceTimersByTime(600)
            await Promise.resolve()
        })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: '🤍 Избранное' }))
            await Promise.resolve()
        })

        expect(addFavoriteMock).toHaveBeenCalledTimes(1)
    })
})
