// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
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

it('shows source, start shortcut, and show-all action', () => {
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
    expect(document.activeElement.getAttribute('aria-label')).toBe('Первый')

    fireEvent.click(screen.getByText('Показать все'))
    expect(onMoreClick).toHaveBeenCalledWith('g')
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
