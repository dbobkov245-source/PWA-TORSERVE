import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pullResume, pushResumeChange } from './resumeSync.js'
import { getResumePosition } from './watchHistory.js'

const HASH = 'b'.repeat(40)
const KEY = `${HASH}:0`
const entry = { infoHash: HASH, fileIndex: 0, position: 2400000, duration: 7200000, updatedAt: 5000 }

describe('resumeSync', () => {
    beforeEach(() => localStorage.clear())
    afterEach(() => vi.unstubAllGlobals())

    it('pulls the other TV\'s positions into this TV', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ entries: [entry], tombstones: {} }))))
        expect(await pullResume('http://nas:3000')).toBe(true)
        expect(getResumePosition(HASH, 0)).toBe(2400000)
        expect(fetch).toHaveBeenCalledWith('http://nas:3000/api/resume', expect.anything())
    })

    it('a slow or dead server never blocks playback', async () => {
        vi.stubGlobal('fetch', vi.fn((url, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        })))
        await expect(pullResume('http://nas:3000', { timeoutMs: 20 })).resolves.toBe(false)
    })

    it('pushes a change, and keeps it for later when the server is unreachable', async () => {
        const fetchMock = vi.fn(async () => { throw new TypeError('Failed to fetch') })
        vi.stubGlobal('fetch', fetchMock)
        await pushResumeChange('http://nas:3000', { key: KEY, entry })

        fetchMock.mockImplementation(async (url) => new Response(JSON.stringify(
            url.endsWith('/api/resume') ? { entries: [], tombstones: {} } : { changed: true }
        )))
        await pullResume('http://nas:3000')

        const posted = fetchMock.mock.calls.filter(([url, init]) => url === `http://nas:3000/api/resume/${KEY}` && init?.method === 'POST')
        expect(posted).toHaveLength(2) // the failed attempt, then the retry flushed before the pull
        expect(JSON.parse(posted[1][1].body)).toEqual({ entry })
    })
})
