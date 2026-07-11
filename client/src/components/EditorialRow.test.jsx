// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import EditorialRow from './EditorialRow'

it('renders editorial metadata, source, quality, and watched state', () => {
    const item = {
        id: 11,
        title: 'Дюна: Часть вторая',
        overview: 'Пол Атрейдес объединяется с фрименами и выбирает путь сквозь пустыню.',
        release_date: '2024-02-27',
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
    expect(screen.getByText('TMDB')).toBeTruthy()
    expect(screen.getByText('4K')).toBeTruthy()
    expect(screen.getByLabelText('Просмотрено')).toBeTruthy()
})
