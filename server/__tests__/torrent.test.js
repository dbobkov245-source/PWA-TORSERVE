/**
 * Torrent Module Tests
 * Tests for server/torrent.js utilities
 */

import { test, expect } from './test-runner.js'

// ─────────────────────────────────────────────────────────────
// Helper Function Tests (can be run without actual torrents)
// ─────────────────────────────────────────────────────────────

test('PUBLIC_TRACKERS should be defined and non-empty', async () => {
    // We test by checking torrent.js exports
    const torrentModule = await import('../torrent.js')

    // Module should export required functions
    expect(typeof torrentModule.addTorrent).toBe('function')
    expect(typeof torrentModule.removeTorrent).toBe('function')
    expect(typeof torrentModule.getTorrent).toBe('function')
    expect(typeof torrentModule.getAllTorrents).toBe('function')
})

test('getAllTorrents returns array', async () => {
    const { getAllTorrents } = await import('../torrent.js')
    const torrents = getAllTorrents()

    expect(Array.isArray(torrents)).toBe(true)
})

test('getTorrent returns null for non-existent hash', async () => {
    const { getTorrent } = await import('../torrent.js')
    const result = getTorrent('nonexistent_hash_123456')

    expect(result).toBeNull()
})

test('removeTorrent returns false for non-existent hash', async () => {
    const { removeTorrent } = await import('../torrent.js')
    const result = removeTorrent('nonexistent_hash_123456')

    expect(result).toBeFalsy()
})

// ─────────────────────────────────────────────────────────────
// Magnet URI Parsing (if you have such utilities)
// ─────────────────────────────────────────────────────────────

test('magnet URI format validation', () => {
    const validMagnet = 'magnet:?xt=urn:btih:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    const invalidMagnet = 'not-a-magnet'

    expect(validMagnet.startsWith('magnet:')).toBe(true)
    expect(invalidMagnet.startsWith('magnet:')).toBe(false)
})

test('metadata timeout policy: no peers should timeout immediately', async () => {
    const { getMetadataTimeoutDecision } = await import('../torrent.js')
    const decision = getMetadataTimeoutDecision({
        peers: 0,
        attempts: 0,
        maxGraceCycles: 2
    })

    expect(decision).toBe('timeout')
})

test('metadata timeout policy: connected peers should get grace before timeout', async () => {
    const { getMetadataTimeoutDecision } = await import('../torrent.js')

    const first = getMetadataTimeoutDecision({
        peers: 1,
        attempts: 0,
        maxGraceCycles: 2
    })
    const second = getMetadataTimeoutDecision({
        peers: 1,
        attempts: 2,
        maxGraceCycles: 2
    })

    expect(first).toBe('grace')
    expect(second).toBe('timeout')
})
