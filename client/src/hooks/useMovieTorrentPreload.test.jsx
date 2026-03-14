import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useMovieTorrentPreload } from './useMovieTorrentPreload.js'

function createDeferred() {
    let resolve
    let reject

    const promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
    })

    return { promise, resolve, reject }
}

describe('useMovieTorrentPreload', () => {
    it('waits for the current preload query before starting the next one', async () => {
        const firstDeferred = createDeferred()
        const searchTorrents = vi.fn()
            .mockImplementationOnce(() => firstDeferred.promise)
            .mockResolvedValueOnce({
                items: [{ id: 'a', seeders: 22, tags: ['1080p'] }, { id: 'b', seeders: 15, tags: ['1080p'] }],
                meta: { providers: { jacred: { status: 'ok', count: 2 } } }
            })

        const item = {
            id: 603,
            title: 'Матрица',
            original_title: 'The Matrix',
            release_date: '1999-03-31',
            media_type: 'movie'
        }

        renderHook(() =>
            useMovieTorrentPreload({ item, searchTorrents })
        )

        expect(searchTorrents).toHaveBeenCalledTimes(1)
        expect(searchTorrents).toHaveBeenNthCalledWith(1, 'The Matrix 1999', expect.objectContaining({
            forceFresh: false,
            limit: 100,
            signal: expect.any(AbortSignal)
        }))

        await act(async () => {
            firstDeferred.resolve({
                items: [{ id: 'weak', seeders: 1, tags: ['1080p'] }],
                meta: { providers: { jacred: { status: 'ok', count: 1 } } }
            })
            await Promise.resolve()
        })

        await waitFor(() => {
            expect(searchTorrents).toHaveBeenCalledTimes(2)
        })

        expect(searchTorrents).toHaveBeenNthCalledWith(2, 'Матрица 1999', expect.objectContaining({
            forceFresh: false,
            limit: 100,
            signal: expect.any(AbortSignal)
        }))
    })

    it('runs candidate queries in order until stop condition is met', async () => {
        const item = {
            id: 603,
            title: 'Матрица',
            original_title: 'The Matrix',
            release_date: '1999-03-31',
            media_type: 'movie'
        }

        const searchTorrents = vi.fn()
            .mockResolvedValueOnce({
                items: [{ id: 'weak', seeders: 1, tags: ['1080p'] }],
                meta: { providers: { jacred: { status: 'ok', count: 1 } } }
            })
            .mockResolvedValueOnce({
                items: [
                    { id: 'a', seeders: 25, tags: ['1080p'] },
                    { id: 'b', seeders: 14, tags: ['1080p'] },
                    { id: 'c', seeders: 11, tags: ['720p'] }
                ],
                meta: { providers: { jacred: { status: 'ok', count: 2 } } }
            })

        const { result } = renderHook(() =>
            useMovieTorrentPreload({ item, searchTorrents })
        )

        await waitFor(() => {
            expect(result.current.session?.status).toBe('ready')
        })

        expect(searchTorrents).toHaveBeenCalledTimes(2)
        expect(searchTorrents).toHaveBeenNthCalledWith(1, 'The Matrix 1999', expect.objectContaining({
            forceFresh: false,
            limit: 100,
            signal: expect.any(AbortSignal)
        }))
        expect(searchTorrents).toHaveBeenNthCalledWith(2, 'Матрица 1999', expect.objectContaining({
            forceFresh: false,
            limit: 100,
            signal: expect.any(AbortSignal)
        }))
        expect(result.current.session?.items).toHaveLength(4)
        expect(result.current.session?.query).toBe('Матрица 1999')
    })

    it('reuses cached results for the same title key within ttl', async () => {
        const item = {
            id: 13,
            title: 'Fight Club',
            original_title: 'Fight Club',
            release_date: '1999-10-15',
            media_type: 'movie'
        }

        const searchTorrents = vi.fn().mockResolvedValue({
            items: [
                { id: 'one', seeders: 55, tags: ['1080p'] },
                { id: 'two', seeders: 21, tags: ['1080p'] },
                { id: 'three', seeders: 12, tags: ['720p'] }
            ],
            meta: { providers: { jacred: { status: 'ok', count: 2 } } }
        })

        const { result, rerender } = renderHook(
            ({ currentItem }) => useMovieTorrentPreload({ item: currentItem, searchTorrents }),
            { initialProps: { currentItem: item } }
        )

        await waitFor(() => {
            expect(result.current.session?.status).toBe('ready')
        })

        rerender({ currentItem: null })
        rerender({ currentItem: item })

        await waitFor(() => {
            expect(result.current.session?.status).toBe('ready')
        })

        expect(searchTorrents).toHaveBeenCalledTimes(1)
        expect(result.current.session?.fromCache).toBe(true)
    })

    it('does not cache empty preload state when all candidate queries fail', async () => {
        const item = {
            id: 13,
            title: 'Fight Club',
            original_title: 'Fight Club',
            release_date: '1999-10-15',
            media_type: 'movie'
        }

        const searchTorrents = vi.fn().mockRejectedValue(new Error('Search failed'))

        const { result, rerender } = renderHook(
            ({ currentItem }) => useMovieTorrentPreload({ item: currentItem, searchTorrents }),
            { initialProps: { currentItem: item } }
        )

        await waitFor(() => {
            expect(result.current.session?.status).toBe('error')
        })

        rerender({ currentItem: null })
        rerender({ currentItem: item })

        await waitFor(() => {
            expect(searchTorrents).toHaveBeenCalledTimes(4)
        })
    })

    it('refresh bypasses cache and reloads the current title', async () => {
        const item = {
            id: 550,
            title: 'Fight Club',
            original_title: 'Fight Club',
            release_date: '1999-10-15',
            media_type: 'movie'
        }

        const searchTorrents = vi.fn()
            .mockResolvedValueOnce({
                items: [
                    { id: 'one', seeders: 55, tags: ['1080p'] },
                    { id: 'one-b', seeders: 21, tags: ['1080p'] },
                    { id: 'one-c', seeders: 18, tags: ['720p'] }
                ],
                meta: { providers: { jacred: { status: 'ok', count: 2 } } }
            })
            .mockResolvedValueOnce({
                items: [
                    { id: 'two', seeders: 99, tags: ['2160p'] },
                    { id: 'two-b', seeders: 48, tags: ['1080p'] },
                    { id: 'two-c', seeders: 17, tags: ['720p'] }
                ],
                meta: { providers: { jacred: { status: 'ok', count: 2 } } }
            })

        const { result } = renderHook(() =>
            useMovieTorrentPreload({ item, searchTorrents })
        )

        await waitFor(() => {
            expect(result.current.session?.status).toBe('ready')
        })

        await act(async () => {
            await result.current.refresh()
        })

        await waitFor(() => {
            expect(result.current.session?.items?.[0]?.id).toBe('two')
        })

        expect(searchTorrents).toHaveBeenCalledTimes(2)
        expect(searchTorrents).toHaveBeenLastCalledWith('Fight Club 1999', expect.objectContaining({
            forceFresh: true,
            limit: 100,
            signal: expect.any(AbortSignal)
        }))
        expect(result.current.session?.fromCache).toBe(false)
    })

    it('ignores stale responses after the active item changes', async () => {
        const firstDeferred = createDeferred()
        const secondDeferred = createDeferred()

        const searchTorrents = vi.fn()
            .mockImplementationOnce(() => firstDeferred.promise)
            .mockImplementationOnce(() => secondDeferred.promise)

        const firstItem = {
            id: 603,
            title: 'Матрица',
            original_title: 'The Matrix',
            release_date: '1999-03-31',
            media_type: 'movie'
        }

        const secondItem = {
            id: 550,
            title: 'Бойцовский клуб',
            original_title: 'Fight Club',
            release_date: '1999-10-15',
            media_type: 'movie'
        }

        const { result, rerender } = renderHook(
            ({ currentItem }) => useMovieTorrentPreload({ item: currentItem, searchTorrents }),
            { initialProps: { currentItem: firstItem } }
        )

        rerender({ currentItem: secondItem })

        await act(async () => {
            secondDeferred.resolve({
                items: [
                    { id: 'fight', seeders: 88, tags: ['1080p'] },
                    { id: 'fight-two', seeders: 34, tags: ['1080p'] },
                    { id: 'fight-three', seeders: 16, tags: ['720p'] }
                ],
                meta: { providers: { jacred: { status: 'ok', count: 2 } } }
            })
            await Promise.resolve()
        })

        await waitFor(() => {
            expect(result.current.session?.key).toBe('movie:550')
        })

        await act(async () => {
            firstDeferred.resolve({
                items: [{ id: 'matrix', seeders: 120, tags: ['2160p'] }],
                meta: { providers: { jacred: { status: 'ok', count: 1 } } }
            })
            await Promise.resolve()
        })

        expect(result.current.session?.key).toBe('movie:550')
        expect(result.current.session?.items?.[0]?.id).toBe('fight')
    })

    it('aborts the previous preload request when the active item changes', async () => {
        const firstDeferred = createDeferred()
        const secondDeferred = createDeferred()
        const capturedSignals = []

        const searchTorrents = vi.fn()
            .mockImplementationOnce((_, options) => {
                capturedSignals.push(options?.signal ?? null)
                return firstDeferred.promise
            })
            .mockImplementationOnce((_, options) => {
                capturedSignals.push(options?.signal ?? null)
                return secondDeferred.promise
            })

        const firstItem = {
            id: 603,
            title: 'Матрица',
            original_title: 'The Matrix',
            release_date: '1999-03-31',
            media_type: 'movie'
        }

        const secondItem = {
            id: 550,
            title: 'Бойцовский клуб',
            original_title: 'Fight Club',
            release_date: '1999-10-15',
            media_type: 'movie'
        }

        const { rerender } = renderHook(
            ({ currentItem }) => useMovieTorrentPreload({ item: currentItem, searchTorrents }),
            { initialProps: { currentItem: firstItem } }
        )

        expect(capturedSignals[0]).toBeInstanceOf(AbortSignal)
        expect(capturedSignals[0].aborted).toBe(false)

        rerender({ currentItem: secondItem })

        expect(capturedSignals[0].aborted).toBe(true)
        expect(capturedSignals[1]).toBeInstanceOf(AbortSignal)
        expect(capturedSignals[1].aborted).toBe(false)

        await act(async () => {
            secondDeferred.resolve({
                items: [
                    { id: 'fight', seeders: 88, tags: ['1080p'] },
                    { id: 'fight-two', seeders: 34, tags: ['1080p'] },
                    { id: 'fight-three', seeders: 16, tags: ['720p'] }
                ],
                meta: { providers: { jacred: { status: 'ok', count: 2 } } }
            })
            await Promise.resolve()
        })
    })
})
