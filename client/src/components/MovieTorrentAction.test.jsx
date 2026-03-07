import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MovieTorrentAction from './MovieTorrentAction.jsx'

describe('MovieTorrentAction', () => {
    it('renders loading state label', () => {
        render(
            <MovieTorrentAction
                session={{ status: 'loading', items: [] }}
                onOpen={() => {}}
            />
        )

        expect(screen.getByRole('button', { name: 'Торренты · поиск...' })).not.toBeNull()
    })

    it('renders ready count and compact summary', () => {
        render(
            <MovieTorrentAction
                session={{
                    status: 'ready',
                    items: [
                        { id: 'one', seeders: 245, tags: ['1080p', 'hdr'] },
                        { id: 'two', seeders: 17, tags: ['720p'] }
                    ]
                }}
                onOpen={() => {}}
            />
        )

        expect(screen.getByRole('button', { name: 'Торренты · 2' })).not.toBeNull()
        expect(screen.getByText('Найдено 2 · лучший 1080p · 245 сидов')).not.toBeNull()
    })

    it('renders empty and error states', () => {
        const { rerender } = render(
            <MovieTorrentAction
                session={{ status: 'empty', items: [] }}
                onOpen={() => {}}
            />
        )

        expect(screen.getByRole('button', { name: 'Торренты · 0' })).not.toBeNull()
        expect(screen.getByText('Ничего не найдено')).not.toBeNull()

        rerender(
            <MovieTorrentAction
                session={{ status: 'error', items: [], error: 'Network' }}
                onOpen={() => {}}
            />
        )

        expect(screen.getByRole('button', { name: 'Торренты · ошибка' })).not.toBeNull()
        expect(screen.getByText('Ошибка поиска')).not.toBeNull()
    })

    it('calls onOpen when the button is clicked', () => {
        const onOpen = vi.fn()

        render(
            <MovieTorrentAction
                session={{ status: 'ready', items: [{ id: 'one', seeders: 12, tags: ['1080p'] }] }}
                onOpen={onOpen}
            />
        )

        fireEvent.click(screen.getByRole('button', { name: 'Торренты · 1' }))
        expect(onOpen).toHaveBeenCalledTimes(1)
    })
})
