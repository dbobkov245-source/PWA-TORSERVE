// @vitest-environment happy-dom
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SwipeHero from './SwipeHero'
import SwipePicker from './SwipePicker'

const imageMocks = vi.hoisted(() => ({
    getPosterUrl: vi.fn(item => item?.poster_path ? `https://images.test${item.poster_path}` : null),
    getBackdropUrl: vi.fn(item => item?.backdrop_path ? `https://images.test${item.backdrop_path}` : null),
    getNextImageUrl: vi.fn(),
    reportBrokenImage: vi.fn(),
}))

vi.mock('../utils/discover', () => ({
    getPosterUrl: imageMocks.getPosterUrl,
    getBackdropUrl: imageMocks.getBackdropUrl,
}))
vi.mock('../utils/tmdbClient', () => ({
    getNextImageUrl: imageMocks.getNextImageUrl,
    reportBrokenImage: imageMocks.reportBrokenImage,
}))

beforeEach(() => {
    imageMocks.getNextImageUrl.mockReset()
    imageMocks.reportBrokenImage.mockReset()
})

describe('SwipeHero', () => {
    it('renders a compact bounded CTA aligned to the home grid', () => {
        const view = render(<SwipeHero onOpen={() => {}} isActive />)
        const hero = view.getByRole('button', { name: /не знаете, что посмотреть/i })

        expect(hero.className).toContain('max-w-[560px]')
        expect(hero.className).toContain('w-[calc(100%-64px)]')
        expect(hero.className).toContain('h-20')
        expect(hero.className).toContain('ml-8')
    })

    it('opens from Enter only while active', () => {
        const onOpen = vi.fn()
        const view = render(<SwipeHero onOpen={onOpen} isActive />)
        const hero = view.getByRole('button')

        expect(fireEvent.keyDown(hero, { key: 'Enter' })).toBe(false)
        expect(onOpen).toHaveBeenCalledOnce()
        expect(hero.tabIndex).toBe(0)

        view.rerender(<SwipeHero onOpen={onOpen} isActive={false} />)
        fireEvent.keyDown(hero, { key: 'Enter' })
        fireEvent.click(hero)
        expect(onOpen).toHaveBeenCalledOnce()
        expect(hero.tabIndex).toBe(-1)
    })

    it('contains Enter inside the CTA and opens once', () => {
        const onOpen = vi.fn()
        const outside = vi.fn()
        window.addEventListener('keydown', outside)
        const view = render(<SwipeHero onOpen={onOpen} isActive />)

        fireEvent.keyDown(view.getByRole('button'), { key: 'Enter' })

        window.removeEventListener('keydown', outside)
        expect(onOpen).toHaveBeenCalledOnce()
        expect(outside).not.toHaveBeenCalled()
    })
})

describe('SwipePicker', () => {
    const items = [
        { id: 1, title: 'Один', poster_path: '/one.jpg' },
        { id: 2, title: 'Два', backdrop_path: '/two.jpg' },
    ]

    it('returns nothing for an empty collection', () => {
        const view = render(<SwipePicker items={[]} />)
        expect(view.container.firstChild).toBeNull()
    })

    it('focuses the dialog when mounted', () => {
        const view = render(<SwipePicker items={items} />)
        expect(view.getByRole('dialog')).toBe(document.activeElement)
    })

    it('focuses the dialog when items arrive after an empty render', () => {
        const view = render(<SwipePicker items={[]} />)

        view.rerender(<SwipePicker items={items} />)

        expect(view.getByRole('dialog')).toBe(document.activeElement)
    })

    it('maps remote keys to picker actions', async () => {
        const onSkip = vi.fn()
        const onFavorite = vi.fn().mockResolvedValue(undefined)
        const onOpenItem = vi.fn()
        const onClose = vi.fn()
        const view = render(
            <SwipePicker {...{ items, onSkip, onFavorite, onOpenItem, onClose }} />,
        )
        const dialog = view.getByRole('dialog')

        fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
        expect(onSkip).toHaveBeenCalledWith(items[0])
        expect(view.getByText('Один')).toBeTruthy()

        fireEvent.keyDown(dialog, { key: 'Enter' })
        expect(onOpenItem).toHaveBeenCalledWith(items[0])

        fireEvent.keyDown(dialog, { key: 'ArrowRight' })
        expect(onFavorite).toHaveBeenCalledWith(items[0])
        await waitFor(() => expect(view.getByText('Два')).toBeTruthy())

        fireEvent.keyDown(dialog, { key: 'Escape' })
        fireEvent.keyDown(dialog, { key: 'Backspace' })
        expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('shows the immediate successor when the parent rejects the skipped item', () => {
        const deck = [...items, { id: 3, title: 'Три', poster_path: '/three.jpg' }]
        const Harness = () => {
            const [visibleItems, setVisibleItems] = useState(deck)
            return (
                <SwipePicker
                    items={visibleItems}
                    onSkip={skipped => setVisibleItems(current => current.filter(item => item.id !== skipped.id))}
                />
            )
        }
        const view = render(<Harness />)

        fireEvent.keyDown(view.getByRole('dialog'), { key: 'ArrowLeft' })

        expect(view.getByText('Два')).toBeTruthy()
        expect(view.queryByText('Три')).toBeNull()
    })

    it.each(['ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace'])(
        'isolates handled %s from underlying window navigation',
        async (key) => {
            const globalKeyDown = vi.fn()
            const onClose = vi.fn()
            window.addEventListener('keydown', globalKeyDown)
            const view = render(<SwipePicker items={items} onClose={onClose} />)

            await act(async () => {
                fireEvent.keyDown(view.getByRole('dialog'), { key })
                await Promise.resolve()
            })

            window.removeEventListener('keydown', globalKeyDown)
            expect(globalKeyDown).not.toHaveBeenCalled()
            if (key === 'Escape' || key === 'Backspace') expect(onClose).toHaveBeenCalledOnce()
        }
    )

    it('uses normalized TMDB images and advances the shared fallback chain', () => {
        imageMocks.getNextImageUrl.mockReturnValueOnce('https://fallback.test/one.jpg')
        const view = render(<SwipePicker items={items} />)
        const image = view.container.querySelector('img')

        expect(image.src).toBe('https://images.test/one.jpg')
        fireEvent.error(image)

        expect(imageMocks.reportBrokenImage).toHaveBeenCalledWith('https://images.test/one.jpg')
        expect(view.container.querySelector('img').src).toBe('https://fallback.test/one.jpg')
    })

    it('waits for favorite completion before advancing', async () => {
        let resolveFavorite
        const onFavorite = vi.fn(() => new Promise((resolve) => { resolveFavorite = resolve }))
        const view = render(<SwipePicker items={items} onFavorite={onFavorite} />)

        fireEvent.keyDown(view.getByRole('dialog'), { key: 'ArrowRight' })
        expect(view.getByText('Один')).toBeTruthy()

        resolveFavorite()
        await waitFor(() => expect(view.getByText('Два')).toBeTruthy())
    })
})
