import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: () => false },
    CapacitorHttp: { request: vi.fn() }
}))

import { useQualityBadges } from './useQualityBadges.js'

const item = (key, title) => ({ key, title, original_title: `${title} EN`, year: '2024', is_serial: '1' })

function mockServer(answer) {
    const bodies = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        const body = JSON.parse(init.body)
        bodies.push(body)
        return { ok: true, json: async () => answer(body) }
    })
    return bodies
}

describe('useQualityBadges', () => {
    beforeEach(() => {
        localStorage.clear()
        localStorage.setItem('serverUrl', 'http://nas:3000')
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('asks for films, not titles, and returns badges by poster key', async () => {
        const bodies = mockServer(({ items }) => Object.fromEntries(items.map(i => [i.key, ['4K']])))
        const items = [item('movie:1', 'Дюна')]

        const { result } = renderHook(() => useQualityBadges(items))

        await waitFor(() => expect(result.current.badges['movie:1']).toEqual(['4K']))
        expect(bodies[0]).toEqual({ items })
    })

    it('fetches in the order it is given: the focused poster first', async () => {
        const bodies = mockServer(({ items }) => Object.fromEntries(items.map(i => [i.key, ['1080p']])))
        const items = ['f', 'a', 'b', 'c', 'd'].map(k => item(`movie:${k}`, k))

        const { result } = renderHook(() => useQualityBadges(items))

        await waitFor(() => expect(Object.keys(result.current.badges)).toHaveLength(5))
        expect(bodies.flatMap(b => b.items.map(i => i.key)))
            .toEqual(['movie:f', 'movie:a', 'movie:b', 'movie:c', 'movie:d'])
    })

    it('keeps going when focus moves before the queue starts', async () => {
        const bodies = mockServer(({ items }) => Object.fromEntries(items.map(i => [i.key, ['4K']])))
        const first = [item('movie:a', 'a'), item('movie:b', 'b')]
        const moved = [item('movie:b', 'b'), item('movie:a', 'a')]

        const { result, rerender } = renderHook(({ items }) => useQualityBadges(items), {
            initialProps: { items: first }
        })
        rerender({ items: moved })

        await waitFor(() => expect(Object.keys(result.current.badges)).toHaveLength(2))
        expect(bodies.flatMap(b => b.items.map(i => i.key))).toEqual(['movie:b', 'movie:a'])
    })

    it('remembers found badges for a day and does not ask again', async () => {
        const bodies = mockServer(({ items }) => Object.fromEntries(items.map(i => [i.key, ['4K']])))
        const items = [item('movie:1', 'Дюна')]

        const first = renderHook(() => useQualityBadges(items))
        await waitFor(() => expect(first.result.current.badges['movie:1']).toEqual(['4K']))
        first.unmount()

        const now = Date.now()
        vi.spyOn(Date, 'now').mockReturnValue(now + 23 * 3600 * 1000)
        const second = renderHook(() => useQualityBadges(items))
        expect(second.result.current.badges['movie:1']).toEqual(['4K'])
        await new Promise(resolve => setTimeout(resolve, 700))
        expect(bodies).toHaveLength(1)
    })

    it('asks again once a day has passed', async () => {
        const bodies = mockServer(({ items }) => Object.fromEntries(items.map(i => [i.key, ['4K']])))
        const items = [item('movie:1', 'Дюна')]

        const first = renderHook(() => useQualityBadges(items))
        await waitFor(() => expect(bodies).toHaveLength(1))
        first.unmount()

        const now = Date.now()
        vi.spyOn(Date, 'now').mockReturnValue(now + 25 * 3600 * 1000)
        const second = renderHook(() => useQualityBadges(items))
        expect(second.result.current.badges['movie:1']).toBeUndefined()
        await waitFor(() => expect(bodies).toHaveLength(2))
    })
})
