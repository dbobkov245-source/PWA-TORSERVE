import { test, expect } from './test-runner.js'
import {
    evaluateDownloadFailover,
    buildTsStreamUrl,
    pickVideoFiles,
    computeResumeOffset,
    mapJobToStatusItem,
    getTsConfig
} from '../tsDownload.js'

const config = {
    enabled: true,
    graceMs: 90000,
    minSpeedBps: 800 * 1024,
    url: 'http://172.17.0.1:8090',
    checkIntervalMs: 30000,
    maxConcurrentJobs: 2,
    zeroPeerGraceMs: 30000,
    maxProgress: 0.5
}

function makeItem(overrides = {}) {
    return {
        infoHash: 'abc123',
        progress: 0.01,
        isReady: false,
        totalSize: 5 * 1024 ** 3,
        downloadSpeed: 100 * 1024,
        ageMs: 120000,
        ...overrides
    }
}

test('evaluateDownloadFailover triggers on slow old download', () => {
    expect(evaluateDownloadFailover(makeItem(), config)).toBe(true)
})

test('evaluateDownloadFailover respects grace period', () => {
    expect(evaluateDownloadFailover(makeItem({ ageMs: 30000 }), config)).toBe(false)
})

test('evaluateDownloadFailover skips fast downloads', () => {
    expect(evaluateDownloadFailover(makeItem({ downloadSpeed: 5 * 1024 * 1024 }), config)).toBe(false)
})

test('evaluateDownloadFailover skips completed and metadata-less torrents', () => {
    expect(evaluateDownloadFailover(makeItem({ isReady: true }), config)).toBe(false)
    expect(evaluateDownloadFailover(makeItem({ totalSize: 0 }), config)).toBe(false)
})

test('evaluateDownloadFailover disabled by config', () => {
    expect(evaluateDownloadFailover(makeItem(), { ...config, enabled: false })).toBe(false)
})

test('buildTsStreamUrl builds play url with index', () => {
    expect(buildTsStreamUrl('http://172.17.0.1:8090/', 'deadbeef', 2))
        .toBe('http://172.17.0.1:8090/stream/file?link=deadbeef&index=2&play')
})

test('pickVideoFiles keeps only video extensions', () => {
    const files = pickVideoFiles([
        { id: 1, path: 'Movie/movie.mkv', length: 100 },
        { id: 2, path: 'Movie/sample.txt', length: 10 },
        { id: 3, path: 'Movie/cover.jpg', length: 5 },
        { id: 4, path: 'Movie/extra.MP4', length: 50 },
        { id: 5, path: 'Movie/empty.mkv', length: 0 }
    ])
    expect(files.map(f => f.id)).toEqual([1, 4])
})

test('computeResumeOffset resumes from sequential prefix', () => {
    expect(computeResumeOffset(0, 1000)).toBe(0)
    expect(computeResumeOffset(500, 1000)).toBe(500)
    expect(computeResumeOffset(1500, 1000)).toBe(1000)
    expect(computeResumeOffset(NaN, 1000)).toBe(0)
})

test('mapJobToStatusItem produces status-compatible shape', () => {
    const item = mapJobToStatusItem({
        infoHash: 'abc',
        name: 'Movie',
        totalSize: 1000,
        written: 250,
        speedBps: 1024,
        peers: 7,
        status: 'downloading',
        files: [{ path: 'Movie/m.mkv', length: 1000, tsId: 1 }]
    })
    expect(item.progress).toBe(0.25)
    expect(item.isReady).toBe(false)
    expect(item.downloadSpeed).toBe(1024)
    expect(item.numPeers).toBe(7)
    expect(item.backend).toBe('torrserve')
    expect(item.files[0].index).toBe(0)
})

test('mapJobToStatusItem marks done jobs ready with zero speed', () => {
    const item = mapJobToStatusItem({
        infoHash: 'abc',
        name: 'Movie',
        totalSize: 1000,
        written: 1000,
        speedBps: 999,
        status: 'done',
        files: []
    })
    expect(item.isReady).toBe(true)
    expect(item.downloadSpeed).toBe(0)
})

test('getTsConfig reads env overrides', () => {
    const cfg = getTsConfig({
        TS_URL: 'http://10.0.0.5:9000/',
        TS_FAILOVER: '0',
        TS_FAILOVER_MIN_SPEED_BPS: '102400'
    })
    expect(cfg.url).toBe('http://10.0.0.5:9000')
    expect(cfg.enabled).toBe(false)
    expect(cfg.minSpeedBps).toBe(102400)
})

test('extractMagnetHash extracts lowercase hex hash', async () => {
    const { extractMagnetHash } = await import('../tsDownload.js')
    expect(extractMagnetHash('magnet:?xt=urn:btih:9BE5DFC1419F64C1E3A67666C1035397EDCB6EC2&tr=x'))
        .toBe('9be5dfc1419f64c1e3a67666c1035397edcb6ec2')
    expect(extractMagnetHash('magnet:?xt=urn:btih:notahash')).toBe(null)
    expect(extractMagnetHash(null)).toBe(null)
})

test('buildPublicTsStreamUrl uses client-reachable host, not docker bridge', async () => {
    const { buildPublicTsStreamUrl } = await import('../tsDownload.js')
    const url = buildPublicTsStreamUrl({ hostname: '192.168.1.79' }, 'deadbeef', 2, {})
    expect(url).toBe('http://192.168.1.79:8090/stream/file?link=deadbeef&index=2&play')
    const custom = buildPublicTsStreamUrl({ hostname: 'nas.local' }, 'abc', 1, { TS_PUBLIC_PORT: '9999' })
    expect(custom).toBe('http://nas.local:9999/stream/file?link=abc&index=1&play')
})

test('startDirectTsDownload explains why it cannot take over', async () => {
    const { startDirectTsDownload } = await import('../tsDownload.js')
    const magnet = 'magnet:?xt=urn:btih:9be5dfc1419f64c1e3a67666c1035397edcb6ec2'

    // Returning null made /api/add answer with a bare native-engine error,
    // hiding the fact that the whole TorrServer safety net was down.
    let disabledErr = null
    try {
        await startDirectTsDownload(magnet, { ...config, enabled: false })
    } catch (err) {
        disabledErr = err
    }
    expect(disabledErr?.message).toContain('TS_FAILOVER=0')

    let magnetErr = null
    try {
        await startDirectTsDownload('magnet:?xt=urn:btih:notahash', config)
    } catch (err) {
        magnetErr = err
    }
    expect(magnetErr?.message).toContain('infoHash')

    let unreachableErr = null
    try {
        // Reserved TEST-NET-1 address — never routable, fails fast.
        await startDirectTsDownload(magnet, { ...config, url: 'http://192.0.2.1:8090' })
    } catch (err) {
        unreachableErr = err
    }
    expect(unreachableErr?.message).toContain('192.0.2.1:8090')
})

// Migration discards the native engine's sparse files, so a slow tail must never
// throw away most of a film. Measured 2026-09-24: the native engine routinely sits
// at 0 connected peers of 77 known while TorrServer reaches 23 on the same swarm.

test('evaluateDownloadFailover keeps a download that is already half done', () => {
    expect(evaluateDownloadFailover(makeItem({ progress: 0.5 }), config)).toBe(false)
    expect(evaluateDownloadFailover(makeItem({ progress: 0.995 }), config)).toBe(false)
    expect(evaluateDownloadFailover(makeItem({ progress: 0.49 }), config)).toBe(true)
})

test('evaluateDownloadFailover never migrates a torrent that is being watched', () => {
    expect(evaluateDownloadFailover(makeItem({ streaming: true }), config)).toBe(false)
})

test('evaluateDownloadFailover moves a swarm with zero connected peers after the short grace', () => {
    const stuck = { connectedPeers: 0, downloadSpeed: 0 }
    expect(evaluateDownloadFailover(makeItem({ ...stuck, ageMs: 30000 }), config)).toBe(true)
    expect(evaluateDownloadFailover(makeItem({ ...stuck, ageMs: 10000 }), config)).toBe(false)
    // Connected but slow still waits out the normal grace period.
    expect(evaluateDownloadFailover(makeItem({ connectedPeers: 3, downloadSpeed: 0, ageMs: 30000 }), config)).toBe(false)
})

test('getTsConfig defaults the zero-peer grace and progress ceiling', () => {
    const cfg = getTsConfig({})
    expect(cfg.zeroPeerGraceMs).toBe(30000)
    expect(cfg.maxProgress).toBe(0.5)
    const tuned = getTsConfig({ TS_FAILOVER_ZERO_PEER_GRACE_MS: '45000', TS_FAILOVER_MAX_PROGRESS: '0.3' })
    expect(tuned.zeroPeerGraceMs).toBe(45000)
    expect(tuned.maxProgress).toBe(0.3)
})

test('getTsJobDiskEntries lists each top-level entry of a job once', async () => {
    const { getTsJobDiskEntries } = await import('../tsDownload.js')
    const single = { files: [{ path: 'The.Fix.2026.mkv' }] }
    expect(getTsJobDiskEntries(single, '/downloads')).toEqual([
        { name: 'The.Fix.2026.mkv', absPath: '/downloads/The.Fix.2026.mkv' }
    ])
    const season = { files: [{ path: 'Show.S02/E01.mkv' }, { path: 'Show.S02/E02.mkv' }] }
    expect(getTsJobDiskEntries(season, '/downloads')).toEqual([
        { name: 'Show.S02', absPath: '/downloads/Show.S02' }
    ])
    expect(getTsJobDiskEntries({ files: [{ path: '../../etc/passwd' }] }, '/downloads')).toEqual([])
    expect(getTsJobDiskEntries(null, '/downloads')).toEqual([])
})

test('withoutTorrentRows drops only rows for the given hash', async () => {
    const { withoutTorrentRows } = await import('../tsDownload.js')
    const hash = 'c5ba12cf189575f8403131d4f8329b2bafcc1e63'
    const rows = [
        { magnet: `magnet:?xt=urn:btih:${hash.toUpperCase()}&dn=Oak`, name: 'Oak' },
        { magnet: 'magnet:?xt=urn:btih:84bcdde207bd8fd6d6aec86cf77ff1a8fa0e3f23&tr=' + hash, name: 'Other' }
    ]
    expect(withoutTorrentRows(rows, hash).map(r => r.name)).toEqual(['Other'])
})

test('the delete route cleans up a TorrServer download without a native engine', async () => {
    const { readFileSync } = await import('fs')
    const { fileURLToPath } = await import('url')
    const { dirname, join } = await import('path')
    const here = dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(join(here, '..', 'index.js'), 'utf8')
    // A TS job never has a native engine, so getTorrent() is null and the old
    // route skipped the files and the DB row: the card stayed until a second delete.
    expect(src).toContain('getTsJobDiskEntries(tsJobRemoved')
    expect(src).toContain('withoutTorrentRows(')
})

test('the failover watchdog tells evaluateDownloadFailover about active playback', async () => {
    const { readFileSync } = await import('fs')
    const { fileURLToPath } = await import('url')
    const { dirname, join } = await import('path')
    const here = dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(join(here, '..', 'tsDownload.js'), 'utf8')
    expect(src).toContain('streaming: isStreamActive(hash)')
})
