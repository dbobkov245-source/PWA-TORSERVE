// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import HomeRow from './HomeRow'

const imageFallback = vi.hoisted(() => ({
    getNextImageUrl: vi.fn(),
    reportBrokenImage: vi.fn()
}))

vi.mock('../utils/tmdbClient', async importOriginal => ({
    ...await importOriginal(),
    ...imageFallback
}))

const items = [
    { id: 1, title: 'Первый', poster_path: '/one.jpg', vote_average: 8.2 },
    { id: 2, title: 'Второй', poster_path: '/two.jpg', vote_average: 6.4 }
]

beforeEach(() => {
    imageFallback.getNextImageUrl.mockReset()
    imageFallback.reportBrokenImage.mockReset()
})

it('adds two inert edge spacers around focusable row content', () => {
    const view = render(<HomeRow title="Center" items={items} isActive />)
    const scroller = view.container.querySelector('.snap-container')
    const spacers = scroller.querySelectorAll('.tv-row-edge-spacer')

    expect(spacers).toHaveLength(2)
    expect(scroller.firstElementChild).toBe(spacers[0])
    expect(scroller.lastElementChild).toBe(spacers[1])
    expect(spacers[0].classList.contains('tv-row-leading-spacer')).toBe(true)
    expect(spacers[1].classList.contains('tv-row-trailing-spacer')).toBe(true)
    expect([...spacers].every(node => node.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect([...spacers].every(node => !node.hasAttribute('tabindex'))).toBe(true)
    expect(scroller.style.getPropertyValue('--tv-row-card-width')).toBe('130px')
    expect(scroller.style.getPropertyValue('--tv-row-card-half-width')).toBe('65px')
})

it('uses backdrop width for fixed-center edge geometry', () => {
    const view = render(<HomeRow title="Wide" layout="backdrop_below" items={items} isActive />)
    const scroller = view.container.querySelector('.snap-container')

    expect(scroller.style.getPropertyValue('--tv-row-card-width')).toBe('240px')
    expect(scroller.style.getPropertyValue('--tv-row-card-half-width')).toBe('120px')
})

it('shows source, start shortcut, and show-all action', async () => {
    const onMoreClick = vi.fn()
    const view = render(
        <HomeRow
            title="Жанр"
            source="TMDB"
            categoryId="g"
            items={items}
            onItemClick={vi.fn()}
            onMoreClick={onMoreClick}
            isActive
        />
    )
    const scroller = view.container.querySelector('.snap-container')
    Object.defineProperty(scroller, 'clientWidth', { value: 500 })

    expect(screen.getByText('TMDB')).toBeTruthy()
    expect(screen.queryByText('В начало')).toBeNull()
    expect(screen.getByText('Показать все')).toBeTruthy()

    scroller.scrollLeft = 600
    fireEvent.scroll(scroller)
    fireEvent.click(screen.getByText('В начало'))

    expect(scroller.scrollLeft).toBe(0)
    expect(screen.queryByText('В начало')).toBeNull()
    await waitFor(() => expect(document.activeElement.getAttribute('aria-label')).toBe('Первый'))

    fireEvent.click(screen.getByText('Показать все'))
    expect(onMoreClick).toHaveBeenCalledWith('g')
})

it('keeps the start shortcut visible until scroll returns exactly to zero', () => {
    const view = render(
        <HomeRow
            title="Жанр"
            items={items}
            onItemClick={vi.fn()}
            onMoreClick={vi.fn()}
            isActive
        />
    )
    const scroller = view.container.querySelector('.snap-container')
    Object.defineProperty(scroller, 'clientWidth', { value: 500 })

    scroller.scrollLeft = 501
    fireEvent.scroll(scroller)
    expect(screen.getByText('В начало')).toBeTruthy()

    scroller.scrollLeft = 500
    fireEvent.scroll(scroller)
    expect(screen.getByText('В начало')).toBeTruthy()

    scroller.scrollLeft = 1
    fireEvent.scroll(scroller)
    expect(screen.getByText('В начало')).toBeTruthy()

    scroller.scrollLeft = 0
    fireEvent.scroll(scroller)
    expect(screen.queryByText('В начало')).toBeNull()
})

it('uses one horizontal navigation index for media and the final action', () => {
    const onMoreClick = vi.fn()
    const view = render(
        <HomeRow
            title="Жанр"
            categoryId="g"
            items={items}
            onItemClick={vi.fn()}
            onMoreClick={onMoreClick}
            initialIndex={1}
            isActive
        />
    )
    const scroller = view.container.querySelector('.snap-container')

    expect(document.activeElement.getAttribute('aria-label')).toBe('Второй')
    expect(fireEvent.keyDown(scroller, { key: 'ArrowDown' })).toBe(true)
    expect(fireEvent.keyDown(scroller, { key: 'ArrowUp' })).toBe(true)

    fireEvent.keyDown(scroller, { key: 'ArrowRight' })
    expect(document.activeElement.textContent).toContain('Показать все')
    fireEvent.keyDown(scroller, { key: 'Enter' })

    expect(onMoreClick).toHaveBeenCalledWith('g')
})

it('ignores row navigation while inactive', () => {
    const view = render(
        <HomeRow
            title="Жанр"
            items={items}
            onItemClick={vi.fn()}
            initialIndex={0}
            isActive={false}
        />
    )
    const scroller = view.container.querySelector('.snap-container')
    const firstCard = screen.getByRole('button', { name: /^Первый/ })

    expect(document.activeElement).toBe(firstCard)
    expect(fireEvent.keyDown(scroller, { key: 'ArrowRight' })).toBe(true)
    expect(document.activeElement).toBe(firstCard)
})

it('leaves inactive Enter and Space untouched for parent navigation', () => {
    const onItemClick = vi.fn()
    const onMoreClick = vi.fn()
    const parentKeyDown = vi.fn()
    document.addEventListener('keydown', parentKeyDown)

    const view = render(
        <HomeRow
            title="Жанр"
            categoryId="g"
            items={items}
            onItemClick={onItemClick}
            onMoreClick={onMoreClick}
            initialIndex={0}
            isActive={false}
        />
    )
    const scroller = view.container.querySelector('.snap-container')

    expect(fireEvent.keyDown(scroller, { key: 'Enter' })).toBe(true)
    expect(fireEvent.keyDown(scroller, { key: ' ' })).toBe(true)

    document.removeEventListener('keydown', parentKeyDown)
    expect(parentKeyDown).toHaveBeenCalledTimes(2)
    expect(onItemClick).not.toHaveBeenCalled()
    expect(onMoreClick).not.toHaveBeenCalled()
})

it('preserves image fallback, badges, watched state, and touch scrolling', () => {
    imageFallback.getNextImageUrl.mockReturnValueOnce('https://fallback.example/one.jpg')
    const onItemClick = vi.fn()
    const view = render(
        <HomeRow
            title="Жанр"
            items={items}
            onItemClick={onItemClick}
            qualityBadges={{ 'Первый': ['4K'] }}
            watchedIds={new Set([1])}
            isActive
        />
    )
    const scroller = view.container.querySelector('.snap-container')
    const image = view.container.querySelector('img')

    expect(screen.getByText('4K')).toBeTruthy()
    expect(screen.getByText('✓')).toBeTruthy()
    expect(image.className).toContain('opacity-60')
    fireEvent.error(image)
    expect(imageFallback.reportBrokenImage).toHaveBeenCalled()
    expect(view.container.querySelector('img').src).toBe('https://fallback.example/one.jpg')

    scroller.scrollLeft = 40
    fireEvent.touchStart(scroller, { touches: [{ clientX: 100 }] })
    fireEvent.touchMove(scroller, { touches: [{ clientX: 70 }] })
    expect(scroller.scrollLeft).toBe(70)

    fireEvent.click(screen.getByRole('button', { name: /^Первый/ }))
    expect(onItemClick).toHaveBeenCalledWith(items[0])
})

it('reports the displayed media index, row id, and current horizontal offset directly', () => {
    const onFocusChange = vi.fn()
    const view = render(
        <HomeRow title="Focus" categoryId="focus-row" items={items} onFocusChange={onFocusChange} isActive />
    )
    const scroller = view.container.querySelector('.snap-container')
    scroller.scrollLeft = 88

    fireEvent.focus(screen.getByRole('button', { name: /^Второй/ }))

    expect(onFocusChange).toHaveBeenLastCalledWith(items[1], 1, 'focus-row', 88)
})

it('renders the start shortcut before media while preserving media D-Pad selection', () => {
    const onItemClick = vi.fn()
    const view = render(
        <HomeRow title="Leading" items={items} onItemClick={onItemClick} initialIndex={1} isActive />
    )
    const scroller = view.container.querySelector('.snap-container')
    Object.defineProperty(scroller, 'clientWidth', { value: 100 })
    scroller.scrollLeft = 200
    fireEvent.scroll(scroller)

    expect(scroller.firstElementChild.nextElementSibling.textContent).toContain('В начало')
    expect(screen.getByRole('button', { name: /^Второй/ }).className).toContain('focused')
    fireEvent.keyDown(scroller, { key: 'Enter' })
    expect(onItemClick).toHaveBeenCalledWith(items[1])
})
