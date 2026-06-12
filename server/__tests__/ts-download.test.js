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
    maxConcurrentJobs: 2
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
    expect(evaluateDownloadFailover(makeItem({ progress: 0.995 }), config)).toBe(false)
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
