import { describe, it, expect } from 'vitest'
import { describeAddTorrentError } from './addTorrentError'

describe('describeAddTorrentError', () => {
    it('prefers the server error over the bare status code', () => {
        expect(describeAddTorrentError(500, { error: 'Invalid magnet link' }))
            .toBe('Invalid magnet link')
    })

    it('appends why the TorrServer fallback did not catch the failure', () => {
        // The native timeout alone is not actionable — the useful half is
        // that the sidecar meant to rescue it was unreachable.
        expect(describeAddTorrentError(503, {
            error: 'Torrent timeout: no peers found in 90s — swarm unreachable',
            fallbackError: 'TorrServer unreachable at http://172.17.0.1:8090 — check that its port is published'
        })).toBe(
            'Torrent timeout: no peers found in 90s — swarm unreachable\n' +
            'TorrServer: TorrServer unreachable at http://172.17.0.1:8090 — check that its port is published'
        )
    })

    it('falls back to the status code when the body carries no reason', () => {
        expect(describeAddTorrentError(500, {})).toBe('HTTP 500')
        expect(describeAddTorrentError(502, null)).toBe('HTTP 502')
    })
})
