import { render, act, cleanup } from '@testing-library/react'
import { afterEach, it, expect, vi } from 'vitest'
import Poster from './Poster'
import { getMetadata, resolveMetadata } from '../utils/tmdbClient'
vi.mock('../hooks/useSpatialNavigation', () => ({ useSpatialItem: () => null }))
vi.mock('../utils/tmdbClient', () => ({ getMetadata: vi.fn(), resolveMetadata: vi.fn(), getNextImageUrl: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('never displays the previous film poster after its name changes', async () => {
    let finishOld
    getMetadata.mockReturnValueOnce(null)
    resolveMetadata.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
        .mockResolvedValueOnce({ poster: '/new.jpg' })
    const { rerender, container } = render(<Poster name="Old" progress={0} />)
    getMetadata.mockReturnValue({ poster: '/new.jpg' })
    await act(async () => { rerender(<Poster name="New" progress={0} />) })
    await act(async () => { finishOld({ poster: '/old.jpg' }) })
    expect(container.querySelector('img').getAttribute('src')).toBe('/new.jpg')
    getMetadata.mockReturnValue(null)
    resolveMetadata.mockReturnValue(new Promise(() => {}))
    rerender(<Poster name="Missing" progress={0} />)
    expect(container.querySelector('img')).toBeNull()
})

it('renders a card whose name is still unknown instead of crashing', () => {
    getMetadata.mockReturnValue(null)
    resolveMetadata.mockReturnValue(new Promise(() => {}))
    expect(() => render(<Poster name={null} progress={0} />)).not.toThrow()
})
