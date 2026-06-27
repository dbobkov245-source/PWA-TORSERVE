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
