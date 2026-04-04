import { test, expect } from './test-runner.js'

test('getTorrentMaxRequests uses the tuned default and respects env override', async () => {
    const { getTorrentMaxRequests } = await import('../torrentStreamRuntime.js')

    expect(getTorrentMaxRequests({})).toBe(32)
    expect(getTorrentMaxRequests({ TORRENT_MAX_REQUESTS: '48' })).toBe(48)
    expect(getTorrentMaxRequests({ TORRENT_MAX_REQUESTS: 'bad' })).toBe(32)
})

test('patchTorrentStreamSource raises MAX_REQUESTS when configured', async () => {
    const { patchTorrentStreamSource } = await import('../torrentStreamRuntime.js')

    const source = `
var MAX_REQUESTS = 5
var swarm = pws(infoHash, opts.id, { size: (opts.connections || opts.size), speed: 10 })
var CHOKE_TIMEOUT = 5000
`

    const patched = patchTorrentStreamSource(source, {})

    expect(patched).toContain('var MAX_REQUESTS = 32')
    expect(patched).toContain('utp: opts.utp')
    expect(patched).toContain('var CHOKE_TIMEOUT = 5000')
})

test('patchTorrentStreamSource leaves stock source unchanged when explicitly pinned to 5', async () => {
    const { patchTorrentStreamSource } = await import('../torrentStreamRuntime.js')

    const source = 'var MAX_REQUESTS = 5\nvar swarm = pws(infoHash, opts.id, { size: (opts.connections || opts.size), speed: 10 })'
    const patched = patchTorrentStreamSource(source, { TORRENT_MAX_REQUESTS: '5' })

    expect(patched).toContain('var MAX_REQUESTS = 5')
    expect(patched).toContain('utp: opts.utp')
})
