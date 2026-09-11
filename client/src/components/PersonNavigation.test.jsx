import { act, fireEvent, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import PersonDetail from './PersonDetail'
import SpatialEngine from '../hooks/useSpatialNavigation'
vi.mock('../utils/tmdbClient', () => ({
    getImageUrl: () => '', handleImageErrorFallback: vi.fn(),
    getPersonDetails: async () => ({ name: 'Actor' }),
    getPersonCredits: async () => ({ cast: [], crew: [] }),
    getPersonImages: async () => ({ profiles: [] })
}))
vi.mock('../utils/discover', () => ({ getPosterUrl: () => '' }))
it('does not jump to Back after an earlier spatial handler moved up', async () => {
    const from = document.createElement('button'), to = document.createElement('button')
    document.body.append(from, to)
    const move = event => { if (event.key === 'ArrowUp') to.focus() }
    window.addEventListener('keydown', move)
    SpatialEngine.activeZone = 'person'
    try {
        await act(async () => { render(<PersonDetail personId={1} onBack={vi.fn()} />) })
        from.focus()
        fireEvent.keyDown(from, { key: 'ArrowUp' })
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
        expect(document.activeElement).toBe(to)
    } finally {
        window.removeEventListener('keydown', move)
        from.remove(); to.remove()
        SpatialEngine.activeZone = 'main'
    }
})
