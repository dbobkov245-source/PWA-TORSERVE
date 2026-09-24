import assert from 'node:assert/strict'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { test } from './test-runner.js'
import { loadRoute, responseStream, tick } from './route-harness.js'
import { shouldCreateStreamBody } from '../streamSource.js'
import { parseRange } from '../utils/range.js'
import { createRequire } from 'node:module'
import { pipePlaybackStream } from '../streamLifecycle.js'

test('actual torrent-stream FileStream closes a stalled response despite its legacy destroy method', async () => {
    const require = createRequire(import.meta.url)
    const FileStream = require('torrent-stream/lib/file-stream')
    const stream = new FileStream({ torrent: { pieceLength: 1024 }, bitfield: { get: () => false }, critical() {} }, { offset: 0, length: 100 })
    const res = responseStream()
    let closed = 0
    pipePlaybackStream({ stream, res, infoHash: 'fixture', file: { name: 'fixture.mkv', length: 100 }, fromDisk: false,
        monitor: { openStream() {}, closeStream() {}, recordBytes() {}, recordStall() {} },
        stallTimeoutMs: 10, onClose: () => closed++ })
    await new Promise(resolve => setTimeout(resolve, 30))
    assert.equal(res.destroyed, true)
    assert.equal(closed, 1)
})

async function setup(range, { fromDisk = false, stallMs = 20 } = {}) {
    const source = new PassThrough()
    source.on('error', () => {})
    const res = responseStream()
    const metrics = { opens: 0, closes: 0, bytes: 0, stalls: 0 }
    const file = { name: 'fixture.mkv', path: 'fixture.mkv', length: 100, createReadStream: () => source }
    let lifecycle = {}
    try { lifecycle = await import('../streamLifecycle.js') } catch (err) { if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err }
    const { handler, context } = await loadRoute('../index.js', "app.get('/stream/:infoHash/:fileIndex'", {
        ...lifecycle, path, parseRange, shouldCreateStreamBody,
        getActiveTsJob: () => null, getRawTorrent: () => ({ files: [file] }),
        boostTorrent() {}, prioritizeFile() {}, markTorrentFilesSeen() {}, readahead() {},
        fsPromises: { stat: async () => { if (!fromDisk) throw new Error('ENOENT'); return { size: 100 } } },
        fs: { createReadStream: () => source }, shouldServeFileFromDisk: () => true,
        getAllocatedSizeBytes: () => 100, mimeMap: { '.mkv': 'video/x-matroska' },
        db: { data: { progress: {} } }, safeWrite: () => Promise.resolve(), activeStreams: 0,
        process: { env: { STREAM_STALL_TIMEOUT_MS: String(stallMs) } },
        streamMonitor: {
            openStream: () => metrics.opens++, closeStream: () => metrics.closes++,
            recordBytes: (hash, bytes) => { metrics.bytes += bytes }, recordStall: () => metrics.stalls++
        }
    })
    await handler({ params: { infoHash: 'fixturehash', fileIndex: '0' }, headers: range ? { range } : {}, query: {} }, res)
    return { source, res, metrics, context }
}

for (const range of [undefined, 'bytes=0-99']) {
    const label = range ? 'range' : 'full'
    test(`${label} stream destroys source on client disconnect and closes metrics once`, async () => {
        const { source, res, metrics, context } = await setup(range)
        try {
            res.destroy()
            await tick()
            assert.equal(source.destroyed, true, 'disconnect must release torrent source')
            assert.equal(metrics.closes, 1)
            assert.equal(context.activeStreams, 0)
        } finally { source.destroy(); res.destroy() }
    })
    test(`${label} stream source failure after headers destroys response`, async () => {
        const { source, res, metrics, context } = await setup(range)
        try {
            source.destroy(new Error('disk read failed'))
            await tick()
            assert.equal(res.destroyed, true, 'failed response must not remain open')
            assert.equal(metrics.closes, 1)
            assert.equal(context.activeStreams, 0)
        } finally { source.destroy(); res.destroy() }
    })
    test(`${label} stream response error counts closure only once`, async () => {
        const { source, res, metrics, context } = await setup(range)
        try {
            res.destroy(new Error('connection reset'))
            await tick()
            assert.equal(metrics.closes, 1)
            assert.equal(context.activeStreams, 0)
        } finally { source.destroy(); res.destroy() }
    })
    test(`${label} torrent stream times out before first byte`, async () => {
        const { source, res, metrics } = await setup(range)
        try {
            await new Promise(resolve => setTimeout(resolve, 40))
            assert.equal(res.destroyed, true)
            assert.equal(source.destroyed, true)
            assert.equal(metrics.stalls, 1)
            assert.equal(metrics.closes, 1)
        } finally { source.destroy(); res.destroy() }
    })
    test(`${label} stream sends actual bytes and clears startup watchdog`, async () => {
        const { source, res, metrics, context } = await setup(range)
        try {
            source.write('real payload')
            await new Promise(resolve => setTimeout(resolve, 40))
            assert.equal(res.destroyed, false)
            source.end(' finished')
            await tick()
            assert.equal(res.body(), 'real payload finished')
            assert.equal(metrics.bytes, Buffer.byteLength(res.body()))
            assert.equal(metrics.stalls, 0)
            assert.equal(metrics.closes, 1)
            assert.equal(context.activeStreams, 0)
        } finally { source.destroy(); res.destroy() }
    })
}
