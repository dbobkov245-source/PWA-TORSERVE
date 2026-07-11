// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import RankedRow from './RankedRow'

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
