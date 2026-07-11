// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import EditorialRow from './EditorialRow'

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

it('renders editorial metadata, source, quality, and watched state', () => {
    const item = {
        id: 11,
        title: 'Дюна: Часть вторая',
        overview: 'Пол Атрейдес объединяется с фрименами и выбирает путь сквозь пустыню.',
        release_date: '2024-02-27',
        media_type: 'movie',
        vote_average: 8.4,
        backdrop_path: '/dune.jpg'
    }

    render(
        <EditorialRow
            id="editorial"
            title="Выбор редакции"
            items={[item]}
            isActive
            qualityBadges={{ 'Дюна: Часть вторая': ['4K'] }}
            watchedIds={new Set([11])}
        />
    )

    expect(screen.getByText(item.overview)).toBeTruthy()
    expect(screen.getByText(/2024/)).toBeTruthy()
    expect(screen.getByText(/8\.4/)).toBeTruthy()
    expect(screen.getByText('Фильм')).toBeTruthy()
    expect(screen.getByText('TMDB')).toBeTruthy()
    expect(screen.getByText('4K')).toBeTruthy()
    expect(screen.getByLabelText('Просмотрено')).toBeTruthy()
})

it('advances the image fallback chain and ends with a readable title card', () => {
    imageFallback.getNextImageUrl
        .mockReturnValueOnce('https://fallback.example/dune.jpg')
        .mockReturnValueOnce(null)
    const item = { id: 12, title: 'Дюна', backdrop_path: '/dune.jpg' }
    const view = render(<EditorialRow id="fallback" title="Редакция" items={[item]} isActive />)
    const initialImage = view.container.querySelector('img')
    const initialSrc = initialImage.src

    fireEvent.error(initialImage)

    expect(imageFallback.reportBrokenImage).toHaveBeenCalledWith(initialSrc)
    expect(view.container.querySelector('img').src).toBe('https://fallback.example/dune.jpg')

    fireEvent.error(view.container.querySelector('img'))

    expect(imageFallback.reportBrokenImage).toHaveBeenLastCalledWith('https://fallback.example/dune.jpg')
    expect(view.container.querySelector('img')).toBeNull()
    expect(screen.getAllByText('Дюна').length).toBeGreaterThan(1)
})

it('keeps editorial cards fixed and adds shadow to the focused signature', () => {
    const view = render(
        <EditorialRow id="size" title="Редакция" items={[{ id: 13, name: 'Сериал', backdrop_path: '/tv.jpg' }]} isActive />
    )
    const cardClasses = view.container.querySelector('article').className

    expect(cardClasses).toContain('w-[31vw]')
    expect(cardClasses).toContain('h-[220px]')
    expect(cardClasses).toContain('border-[#63F5C7]')
    expect(cardClasses).toContain('scale-105')
    expect(cardClasses).toMatch(/shadow/)
    expect(screen.getByText('Сериал', { selector: 'span' })).toBeTruthy()
})
