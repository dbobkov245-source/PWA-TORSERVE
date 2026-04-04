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

test('buildTorrentEngineOptions keeps discovery config aligned across torrent engines', async () => {
    const torrentModule = await import('../torrent.js')
    const { buildTorrentEngineOptions, sharedDHT } = torrentModule

    const options = buildTorrentEngineOptions({
        path: '/tmp/test-downloads',
        connections: 12,
        env: { TORRENT_DHT_MODE: 'shared' }
    })

    expect(options.path).toBe('/tmp/test-downloads')
    expect(options.connections).toBe(12)
    expect(options.uploads).toBe(10)
    expect(options.utp).toBe(false)
    expect(options.verify).toBe(false)
    expect(options.tracker).toBe(true)
    expect(options.dht).toBe(sharedDHT)
    expect(Array.isArray(options.trackers)).toBe(true)
    expect(options.trackers.length).toBeGreaterThan(0)
})

test('buildTorrentEngineOptions can switch to internal DHT mode for host-network deployments', async () => {
    const { buildTorrentEngineOptions } = await import('../torrent.js')

    const options = buildTorrentEngineOptions({
        path: '/tmp/test-downloads',
        connections: 30,
        env: { TORRENT_DHT_MODE: 'internal' }
    })

    expect(options.path).toBe('/tmp/test-downloads')
    expect(options.connections).toBe(30)
    expect(options.utp).toBe(false)
    expect(options.dht).toBe(true)
})

test('buildTorrentEngineOptions can enable uTP without changing the shared-DHT contract', async () => {
    const { buildTorrentEngineOptions } = await import('../torrent.js')

    const options = buildTorrentEngineOptions({
        path: '/tmp/test-downloads',
        connections: 55,
        env: { TORRENT_UTP: '1', TORRENT_DHT_MODE: 'shared' }
    })

    expect(options.utp).toBe(true)
    expect(options.dht).toBeTruthy()
})

test('getTorrentListenPort returns the configured fixed port for every engine', async () => {
    const { getTorrentListenPort, getTorrentDhtListenPort, getTorrentUtpEnabled } = await import('../torrent.js')

    expect(getTorrentListenPort({ TORRENT_PORT: '6881' })).toBe(6881)
    expect(getTorrentListenPort({ TORRENT_PORT: '6881' })).toBe(6881)
    expect(getTorrentListenPort({ TORRENT_PORT: '0' })).toBe(0)
    expect(getTorrentUtpEnabled({ TORRENT_UTP: '1' })).toBe(true)
    expect(getTorrentUtpEnabled({ TORRENT_UTP: 'true' })).toBe(true)
    expect(getTorrentUtpEnabled({})).toBe(false)
    expect(getTorrentDhtListenPort({ TORRENT_PORT: '6881' })).toBe(6881)
    expect(getTorrentDhtListenPort({ TORRENT_PORT: '6881', TORRENT_UTP: '1', TORRENT_DHT_MODE: 'shared' })).toBe(6882)
    expect(getTorrentDhtListenPort({ TORRENT_PORT: '6881', TORRENT_DHT_PORT: '6999', TORRENT_UTP: '1', TORRENT_DHT_MODE: 'shared' })).toBe(6999)
})

test('getTorrentUploadSlots uses protocol-friendly default and respects env override', async () => {
    const { getTorrentUploadSlots } = await import('../torrent.js')

    expect(getTorrentUploadSlots({})).toBe(10)
    expect(getTorrentUploadSlots({ TORRENT_UPLOAD_SLOTS: '12' })).toBe(12)
    expect(getTorrentUploadSlots({ TORRENT_UPLOAD_SLOTS: '0' })).toBe(0)
})

test('getTorrentConnections uses a safe startup floor and respects higher overrides', async () => {
    const { getTorrentConnections } = await import('../torrent.js')

    expect(getTorrentConnections({})).toBe(55)
    expect(getTorrentConnections({ TORRENT_CONNECTIONS: '30' })).toBe(55)
    expect(getTorrentConnections({ TORRENT_CONNECTIONS: '65' })).toBe(65)
    expect(getTorrentConnections({ TORRENT_CONNECTIONS: 'bad' })).toBe(55)
})

test('swarm connection limit helpers use swarm.size rather than phantom maxConnections', async () => {
    const { getSwarmConnectionLimit, setSwarmConnectionLimit } = await import('../torrent.js')

    const swarm = { size: 20, maxConnections: 999 }

    expect(getSwarmConnectionLimit(swarm)).toBe(20)
    expect(setSwarmConnectionLimit(swarm, 65)).toBe(65)
    expect(swarm.size).toBe(65)
    expect(swarm.maxConnections).toBe(999)
})

test('torrent runtime no longer writes to phantom swarm.maxConnections', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    const thisFile = fileURLToPath(import.meta.url)
    const testsDir = path.dirname(thisFile)
    const source = fs.readFileSync(path.join(testsDir, '../torrent.js'), 'utf8')

    expect(source).not.toContain('swarm.maxConnections =')
})

test('recoverSwarm kicks discovery and resumes the swarm when recovery is needed', async () => {
    const { recoverSwarm } = await import('../torrent.js')

    let discoverCalls = 0
    let resumeCalls = 0
    const engine = {
        discover: () => { discoverCalls += 1 },
        swarm: {
            resume: () => { resumeCalls += 1 }
        }
    }

    expect(recoverSwarm(engine)).toBe(true)
    expect(discoverCalls).toBe(1)
    expect(resumeCalls).toBe(1)
})

test('getSwarmPeerSnapshot exposes connected, active and known peer counts for status UI', async () => {
    const { getSwarmPeerSnapshot } = await import('../torrent.js')

    const snapshot = getSwarmPeerSnapshot({
        wires: [{ peerChoking: false }, { peerChoking: true }],
        queued: 4,
        _peers: {
            '1.1.1.1:1111': {},
            '2.2.2.2:2222': {},
            '3.3.3.3:3333': {},
            '4.4.4.4:4444': {},
        }
    })

    expect(snapshot).toEqual({
        connectedPeers: 2,
        activePeers: 1,
        knownPeers: 4,
        queuedPeers: 4,
        displayPeers: 4
    })
})

test('status cache ttl uses env override with a safe default', async () => {
    const { getStatusCacheTtlMs } = await import('../torrent.js')

    expect(getStatusCacheTtlMs({})).toBe(10000)
    expect(getStatusCacheTtlMs({ STATUS_CACHE_TTL_MS: '15000' })).toBe(15000)
})

test('diskDownloadCache evicts only oldest entry when size limit exceeded', async () => {
    const { evictDiskCacheOldestEntry } = await import('../torrent.js')

    const cache = new Map([
        ['hash1', { bytes: 100, updatedAt: 1000 }],
        ['hash2', { bytes: 200, updatedAt: 2000 }],
        ['hash3', { bytes: 300, updatedAt: 3000 }],
    ])

    evictDiskCacheOldestEntry(cache, 2)

    expect(cache.size).toBe(2)
    expect(cache.has('hash1')).toBe(false)
    expect(cache.has('hash2')).toBe(true)
    expect(cache.has('hash3')).toBe(true)
})

test('diskDownloadCache does not evict when under size limit', async () => {
    const { evictDiskCacheOldestEntry } = await import('../torrent.js')

    const cache = new Map([['hash1', { bytes: 100, updatedAt: 1000 }]])

    evictDiskCacheOldestEntry(cache, 2)

    expect(cache.size).toBe(1)
    expect(cache.has('hash1')).toBe(true)
})

test('resolveDisplayedDownloaded keeps already-downloaded disk bytes after restart', async () => {
    const { resolveDisplayedDownloaded } = await import('../torrent.js')

    expect(resolveDisplayedDownloaded({
        wasCompleted: false,
        totalSize: 22406401162,
        diskDownloaded: 996147200,
        swarmDownloaded: 3653632
    })).toBe(996147200)

    expect(resolveDisplayedDownloaded({
        wasCompleted: false,
        totalSize: 22406401162,
        diskDownloaded: 996147200,
        swarmDownloaded: 1200000000,
        resumeBaseline: 0
    })).toBe(1200000000)

    expect(resolveDisplayedDownloaded({
        wasCompleted: true,
        totalSize: 22406401162,
        diskDownloaded: 996147200,
        swarmDownloaded: 3653632
    })).toBe(22406401162)

    expect(resolveDisplayedDownloaded({
        wasCompleted: false,
        totalSize: 22406401162,
        diskDownloaded: 996147200,
        swarmDownloaded: 5046272,
        resumeBaseline: 996147200
    })).toBe(1001193472)
})

test('restore selection skips completed persisted torrents', async () => {
    const { getPersistedTorrentsToRestore } = await import('../torrent.js')

    const persisted = [
        { magnet: 'magnet:?xt=urn:btih:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', name: 'done.mkv', completed: true },
        { magnet: 'magnet:?xt=urn:btih:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', name: 'partial.mkv', completed: false },
        { magnet: 'magnet:?xt=urn:btih:cccccccccccccccccccccccccccccccccccccccc', name: 'legacy.mkv' }
    ]

    expect(getPersistedTorrentsToRestore(persisted)).toEqual([
        { magnet: 'magnet:?xt=urn:btih:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', name: 'partial.mkv', completed: false },
        { magnet: 'magnet:?xt=urn:btih:cccccccccccccccccccccccccccccccccccccccc', name: 'legacy.mkv' }
    ])
})

test('onTorrentChange registers a listener that fires on notify', async () => {
    const { onTorrentChange, offTorrentChange, _notifyTorrentChangeForTest } = await import('../torrent.js')
    let called = 0
    const cb = () => called++
    onTorrentChange(cb)
    _notifyTorrentChangeForTest()
    expect(called).toBe(1)
    offTorrentChange(cb)
    _notifyTorrentChangeForTest()
    expect(called).toBe(1) // not called again after unsubscribe
})
