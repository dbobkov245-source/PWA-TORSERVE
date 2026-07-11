// @vitest-environment happy-dom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SwipeHero from './SwipeHero'
import SwipePicker from './SwipePicker'

describe('SwipeHero', () => {
    it('opens from Enter only while active', () => {
        const onOpen = vi.fn()
        const view = render(<SwipeHero onOpen={onOpen} isActive />)
        const hero = view.getByRole('button')

        fireEvent.keyDown(hero, { key: 'Enter' })
        expect(onOpen).toHaveBeenCalledOnce()
        expect(hero.tabIndex).toBe(0)

        view.rerender(<SwipeHero onOpen={onOpen} isActive={false} />)
        fireEvent.keyDown(hero, { key: 'Enter' })
        fireEvent.click(hero)
        expect(onOpen).toHaveBeenCalledOnce()
        expect(hero.tabIndex).toBe(-1)
    })
})

describe('SwipePicker', () => {
    const items = [
        { id: 1, title: 'Один', poster: '/one.jpg' },
        { id: 2, title: 'Два', poster: '/two.jpg' },
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
        expect(view.getByText('Два')).toBeTruthy()

        fireEvent.keyDown(dialog, { key: 'Enter' })
        expect(onOpenItem).toHaveBeenCalledWith(items[1])

        fireEvent.keyDown(dialog, { key: 'ArrowRight' })
        expect(onFavorite).toHaveBeenCalledWith(items[1])
        await waitFor(() => expect(view.getByText('Один')).toBeTruthy())

        fireEvent.keyDown(dialog, { key: 'Escape' })
        fireEvent.keyDown(dialog, { key: 'Backspace' })
        expect(onClose).toHaveBeenCalledTimes(2)
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
