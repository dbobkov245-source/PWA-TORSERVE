import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    recordPlaybackResult,
    getResumePosition,
    getResumeItems,
    getResumeEntry,
    removeResumeEntries,
    isFinishedResult
} from './watchHistory.js'

const base = {
    infoHash: 'ABCDEF1234',
    fileIndex: 0,
    fileName: 'movie.mkv',
    torrentName: 'Movie.2026.2160p'
}

describe('watchHistory', () => {
    beforeEach(() => localStorage.clear())

    it('stores an unfinished session and returns resume position', () => {
        recordPlaybackResult({ ...base, result: { position: 600000, duration: 7200000, finished: false } })
        expect(getResumePosition('abcdef1234', 0)).toBe(600000)
        expect(getResumeItems()).toHaveLength(1)
        expect(getResumeItems()[0].torrentName).toBe('Movie.2026.2160p')
    })

    it('finished session clears the entry', () => {
        recordPlaybackResult({ ...base, result: { position: 600000, duration: 7200000, finished: false } })
        recordPlaybackResult({ ...base, result: { position: 7100000, duration: 7200000, finished: true } })
        expect(getResumePosition('abcdef1234', 0)).toBe(0)
        expect(getResumeItems()).toHaveLength(0)
    })

    it.each([
        undefined, null, {}, { position: -1 }, { position: null },
        { position: '600000' }, { position: 'invalid' }, { position: NaN },
        { position: Infinity }, { position: -Infinity }
    ])('preserves the existing entry when player progress is unavailable: %j', (result) => {
        recordPlaybackResult({ ...base, tmdbId: 603, result: { position: 600000, duration: 7200000 } })
        const previous = getResumeEntry(base.infoHash, 0)
        recordPlaybackResult({ ...base, result })
        expect(getResumeEntry(base.infoHash, 0)).toEqual(previous)
    })

    it('clears explicit completion even when the player has no position', () => {
        recordPlaybackResult({ ...base, result: { position: 600000, duration: 7200000 } })
        recordPlaybackResult({ ...base, result: { position: -1, finished: true } })
        expect(getResumeEntry(base.infoHash, 0)).toBeNull()
    })

    it('clears a prior entry when the player explicitly reports restarting near the beginning', () => {
        recordPlaybackResult({ ...base, result: { position: 600000, duration: 7200000 } })
        recordPlaybackResult({ ...base, result: { position: 0 } })
        expect(getResumeEntry(base.infoHash, 0)).toBeNull()
    })

    it.each(['7200000', Infinity, NaN, -1])('does not store malformed duration %j', (duration) => {
        recordPlaybackResult({ ...base, result: { position: 600000, duration } })
        expect(getResumeEntry(base.infoHash, 0).duration).toBe(0)
    })

    it.each([
        { position: Infinity, duration: 7200000 },
        { position: '7200000', duration: 7200000 },
        { position: 7200000, duration: '7200000' },
        { position: -1, finished: 'false' },
        null
    ])('does not infer completion from malformed result %j', (result) => {
        expect(isFinishedResult(result)).toBe(false)
    })

    it('95% watched counts as finished even without the flag', () => {
        expect(isFinishedResult({ position: 6900000, duration: 7200000 })).toBe(true)
        recordPlaybackResult({ ...base, result: { position: 6900000, duration: 7200000, finished: false } })
        expect(getResumeItems()).toHaveLength(0)
    })

    it('short sessions (<2min) are not stored', () => {
        recordPlaybackResult({ ...base, result: { position: 60000, duration: 7200000, finished: false } })
        expect(getResumeItems()).toHaveLength(0)
    })

    it('removeResumeEntries drops all files of a torrent', () => {
        recordPlaybackResult({ ...base, result: { position: 600000, duration: 0, finished: false } })
        recordPlaybackResult({ ...base, fileIndex: 1, result: { position: 900000, duration: 0, finished: false } })
        removeResumeEntries('ABCDEF1234')
        expect(getResumeItems()).toHaveLength(0)
    })

    it('carries tmdbId/mediaType and preserves them across updates', () => {
        recordPlaybackResult({ ...base, tmdbId: 603, mediaType: 'movie', result: { position: 600000, duration: 7200000 } })
        expect(getResumeEntry('abcdef1234', 0)).toMatchObject({ tmdbId: 603, mediaType: 'movie' })
        // A later update without an id (e.g. resume from home) keeps the stored id.
        recordPlaybackResult({ ...base, result: { position: 800000, duration: 7200000 } })
        expect(getResumeEntry('abcdef1234', 0)).toMatchObject({ tmdbId: 603, position: 800000 })
    })

    it('newest entries come first', () => {
        vi.useFakeTimers()
        vi.setSystemTime(1000000)
        recordPlaybackResult({ ...base, result: { position: 600000, duration: 0 } })
        vi.setSystemTime(2000000)
        recordPlaybackResult({ ...base, infoHash: 'ffff00', torrentName: 'Newer', result: { position: 700000, duration: 0 } })
        vi.useRealTimers()
        const items = getResumeItems()
        expect(items[0].torrentName).toBe('Newer')
    })
})

describe('watchHistory sync with the server (resume on another TV)', () => {
    beforeEach(() => localStorage.clear())
    const HASH = 'a'.repeat(40)
    const remoteEntry = (position, updatedAt) => ({
        infoHash: HASH, fileIndex: 0, fileName: 'Runner.mkv', torrentName: 'Runner',
        tmdbId: 1, mediaType: 'movie', position, duration: 7200000, updatedAt
    })

    it('reports what changed so it can be pushed to the server', async () => {
        const { recordPlaybackResult } = await import('./watchHistory.js')
        const saved = recordPlaybackResult({ infoHash: HASH, fileIndex: 0, result: { position: 600000, duration: 7200000 } })
        expect(saved.key).toBe(`${HASH}:0`)
        expect(saved.entry.position).toBe(600000)

        const finished = recordPlaybackResult({ infoHash: HASH, fileIndex: 0, result: { position: 7100000, duration: 7200000, finished: true } })
        expect(finished.key).toBe(`${HASH}:0`)
        expect(finished.deletedAt).toBeGreaterThan(0)
    })

    it('takes a newer position from the other TV and ignores an older one', async () => {
        const { mergeRemoteResume, getResumePosition } = await import('./watchHistory.js')
        expect(mergeRemoteResume({ entries: [remoteEntry(1800000, 2000)], tombstones: {} })).toBe(true)
        expect(getResumePosition(HASH, 0)).toBe(1800000)

        expect(mergeRemoteResume({ entries: [remoteEntry(300000, 1000)], tombstones: {} })).toBe(false)
        expect(getResumePosition(HASH, 0)).toBe(1800000)
    })

    it('drops a film the other TV finished, unless this TV watched it later', async () => {
        const { mergeRemoteResume, getResumePosition } = await import('./watchHistory.js')
        mergeRemoteResume({ entries: [remoteEntry(1800000, 2000)], tombstones: {} })

        mergeRemoteResume({ entries: [], tombstones: { [`${HASH}:0`]: 1500 } })
        expect(getResumePosition(HASH, 0)).toBe(1800000)

        mergeRemoteResume({ entries: [], tombstones: { [`${HASH}:0`]: 3000 } })
        expect(getResumePosition(HASH, 0)).toBe(0)
    })

    it('finishing a film started on the other TV still tells the server', async () => {
        const { recordPlaybackResult } = await import('./watchHistory.js')
        const change = recordPlaybackResult({ infoHash: HASH, fileIndex: 0, result: { position: 7100000, duration: 7200000, finished: true } })
        expect(change?.deletedAt).toBeGreaterThan(0)
    })

    it('a stale copy cannot come back after this TV finished the film', async () => {
        const { recordPlaybackResult, mergeRemoteResume, getResumePosition } = await import('./watchHistory.js')
        recordPlaybackResult({ infoHash: HASH, fileIndex: 0, result: { position: 600000, duration: 7200000 } })
        recordPlaybackResult({ infoHash: HASH, fileIndex: 0, result: { position: 7100000, duration: 7200000, finished: true } })

        mergeRemoteResume({ entries: [remoteEntry(600000, 1)], tombstones: {} })
        expect(getResumePosition(HASH, 0)).toBe(0)
    })
})
