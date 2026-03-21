/**
 * DB torrent deletion safety tests.
 *
 * Protects DELETE /api/db/torrents/:hash from accidentally removing
 * unrelated torrents when the hash string appears in a tracker URL
 * or elsewhere in the magnet URI.
 */

import { test, expect } from './test-runner.js'

test('extractBtihFromMagnet returns the infoHash from a valid magnet', async () => {
    const { extractBtihFromMagnet } = await import('../utils/magnetHash.js')

    const hash = extractBtihFromMagnet(
        'magnet:?xt=urn:btih:aabbccdd11223344aabbccdd11223344aabbccdd&dn=Movie&tr=udp%3A%2F%2Fopen.stealth.si%3A80'
    )

    expect(hash).toBe('aabbccdd11223344aabbccdd11223344aabbccdd')
})

test('extractBtihFromMagnet is case-insensitive and normalises to lowercase', async () => {
    const { extractBtihFromMagnet } = await import('../utils/magnetHash.js')

    const hash = extractBtihFromMagnet(
        'magnet:?xt=urn:btih:AABBCCDD11223344AABBCCDD11223344AABBCCDD&dn=Movie'
    )

    expect(hash).toBe('aabbccdd11223344aabbccdd11223344aabbccdd')
})

test('extractBtihFromMagnet returns null for a non-magnet string', async () => {
    const { extractBtihFromMagnet } = await import('../utils/magnetHash.js')

    expect(extractBtihFromMagnet('not-a-magnet')).toBeNull()
    expect(extractBtihFromMagnet('')).toBeNull()
})

test('isMagnetHashMatch matches full hash', async () => {
    const { isMagnetHashMatch } = await import('../utils/magnetHash.js')

    const magnet = 'magnet:?xt=urn:btih:aabbccdd11223344aabbccdd11223344aabbccdd&dn=Movie'

    expect(isMagnetHashMatch(magnet, 'aabbccdd11223344aabbccdd11223344aabbccdd')).toBe(true)
})

test('isMagnetHashMatch matches prefix of hash (partial lookup support)', async () => {
    const { isMagnetHashMatch } = await import('../utils/magnetHash.js')

    const magnet = 'magnet:?xt=urn:btih:aabbccdd11223344aabbccdd11223344aabbccdd&dn=Movie'

    expect(isMagnetHashMatch(magnet, 'aabbccdd')).toBe(true)
})

test('isMagnetHashMatch does NOT match hash appearing only in tracker URL', async () => {
    const { isMagnetHashMatch } = await import('../utils/magnetHash.js')

    // tracker URL contains "aabb" but the infoHash is totally different
    const magnet = 'magnet:?xt=urn:btih:1111111111111111111111111111111111111111&tr=udp%3A%2F%2Faabbtracker.example.com'

    expect(isMagnetHashMatch(magnet, 'aabb')).toBe(false)
})

test('isMagnetHashMatch returns false for null/empty inputs', async () => {
    const { isMagnetHashMatch } = await import('../utils/magnetHash.js')

    expect(isMagnetHashMatch('', 'aabb')).toBe(false)
    expect(isMagnetHashMatch('magnet:?xt=urn:btih:abc', '')).toBe(false)
})
