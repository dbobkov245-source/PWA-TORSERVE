// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import RankedRow from './RankedRow'

const imageFallback = vi.hoisted(() => ({
    getNextImageUrl: vi.fn(),
    reportBrokenImage: vi.fn()
}))

vi.mock('../utils/tmdbClient', async importOriginal => ({
    ...await importOriginal(),
    ...imageFallback
}))

beforeEach(() => {
    imageFallback.getNextImageUrl.mockReset()
    imageFallback.reportBrokenImage.mockReset()
})

it('renders real ordering, source, quality, and watched state', () => {
    const items = [
        { id: 21, title: 'Первый фильм', rank: 7, vote_average: 7.8, backdrop_path: '/one.jpg' },
        { id: 22, title: 'Второй фильм', vote_average: 6.2, backdrop_path: '/two.jpg' }
    ]

    render(
        <RankedRow
            id="ranked"
            title="В тренде у зрителей"
            items={items}
            isActive
            qualityBadges={{ 'Первый фильм': ['HDR'] }}
            watchedIds={new Set([22])}
        />
    )

    expect(screen.getByLabelText('Место 7').textContent).toBe('7')
    expect(screen.getByLabelText('Место 2').textContent).toBe('2')
    expect(screen.getByText('Trakt')).toBeTruthy()
    expect(screen.getByText('HDR')).toBeTruthy()
    expect(screen.getByLabelText('Просмотрено')).toBeTruthy()
})

it('advances the image fallback chain and ends with a readable title card', () => {
    imageFallback.getNextImageUrl
        .mockReturnValueOnce('https://fallback.example/ranked.jpg')
        .mockReturnValueOnce(null)
    const item = { id: 23, title: 'Лидер', backdrop_path: '/leader.jpg' }
    const view = render(<RankedRow id="fallback" title="Рейтинг" items={[item]} isActive />)
    const initialImage = view.container.querySelector('img')
    const initialSrc = initialImage.src

    fireEvent.error(initialImage)

    expect(imageFallback.reportBrokenImage).toHaveBeenCalledWith(initialSrc)
    expect(view.container.querySelector('img').src).toBe('https://fallback.example/ranked.jpg')

    fireEvent.error(view.container.querySelector('img'))

    expect(imageFallback.reportBrokenImage).toHaveBeenLastCalledWith('https://fallback.example/ranked.jpg')
    expect(view.container.querySelector('img')).toBeNull()
    expect(screen.getAllByText('Лидер').length).toBeGreaterThan(1)
})

it('keeps ranked cards fixed and adds shadow to the focused signature', () => {
    const view = render(
        <RankedRow id="size" title="Рейтинг" items={[{ id: 24, title: 'Лидер' }]} isActive />
    )
    const articleClasses = view.container.querySelector('article').className
    const backdropClasses = view.container.querySelector('article > div').className

    expect(articleClasses).toContain('w-[300px]')
    expect(articleClasses).toContain('h-[180px]')
    expect(backdropClasses).toContain('border-[#63F5C7]')
    expect(backdropClasses).toContain('scale-105')
    expect(backdropClasses).toMatch(/shadow/)
})

it('restores a non-zero initial item and selects it before moving right', () => {
    const items = [{ id: 41, title: 'Zero' }, { id: 42, title: 'Saved' }, { id: 43, title: 'Next' }]
    const onFocusChange = vi.fn()
    const onSelect = vi.fn()

    const view = render(
        <RankedRow
            id="restored-ranked"
            title="Restored ranked"
            items={items}
            initialIndex={1}
            isActive
            onFocusChange={onFocusChange}
            onSelect={onSelect}
        />
    )

    expect(onFocusChange.mock.calls[0]).toEqual([items[1], 1])
    expect(onFocusChange).not.toHaveBeenCalledWith(items[0], 0)
    const row = view.getByRole('group', { name: 'Restored ranked' })
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(items[1])
    fireEvent.keyDown(row, { key: 'ArrowRight' })
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(items[2])
})
