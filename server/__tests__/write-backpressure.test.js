/**
 * Write backpressure in the native engine.
 *
 * torrent-stream hands every verified piece to ImmediateChunkStore, which keeps
 * the buffer in memory until the disk write completes — and never slows the
 * swarm down. When the network outpaces the disk, the queue grows without bound.
 * Lab (8MB pieces, disk 20MB/s): 183 pieces / 1.46GB queued after 9s. On the NAS
 * (768MB cgroup) a fast swarm restored on boot OOM-killed the server every
 * minute (2026-10-11, F1 1080p, ~32MB/s).
 */

import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { test } from './test-runner.js'

const require = createRequire(import.meta.url)
const PIECE = 1048576
const PIECES = 48

function buildTorrent(file) {
    const bncode = require('bncode')
    const data = fs.readFileSync(file)
    const hashes = []
    for (let off = 0; off < data.length; off += PIECE) {
        hashes.push(crypto.createHash('sha1').update(data.subarray(off, off + PIECE)).digest())
    }
    return bncode.encode({ info: { length: data.length, name: Buffer.from('movie.mkv'), 'piece length': PIECE, pieces: Buffer.concat(hashes) } })
}

function slowStorage(FSChunkStore, bytesPerSec) {
    return (chunkLength, opts) => {
        const inner = FSChunkStore(chunkLength, opts)
        let busyUntil = Date.now()
        return {
            chunkLength: inner.chunkLength,
            get: (...a) => inner.get(...a),
            close: (cb) => inner.close(cb),
            destroy: (cb) => inner.destroy(cb),
            put(index, buf, cb) {
                busyUntil = Math.max(Date.now(), busyUntil) + (buf.length / bytesPerSec) * 1000
                setTimeout(() => inner.put(index, buf, cb), busyUntil - Date.now())
            }
        }
    }
}

test('a disk slower than the swarm does not queue more than the write budget in memory', async () => {
    const { getTorrentStream } = await import('../torrentStreamRuntime.js')
    const FSChunkStore = createRequire(require.resolve('torrent-stream'))('fs-chunk-store')
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pwa-backpressure-'))
    const seedDir = path.join(dir, 'seed')
    const leechDir = path.join(dir, 'leech')
    fs.mkdirSync(seedDir)
    fs.mkdirSync(leechDir)
    fs.writeFileSync(path.join(seedDir, 'movie.mkv'), crypto.randomBytes(PIECE * PIECES))
    const torrent = buildTorrent(path.join(seedDir, 'movie.mkv'))

    const torrentStream = getTorrentStream({ TORRENT_MAX_REQUESTS: '32', TORRENT_MAX_PENDING_WRITE_MB: '4' })
    const port = 20000 + Math.floor(Math.random() * 20000)
    const seeder = torrentStream(torrent, { path: seedDir, verify: true, dht: false, tracker: false, uploads: 10 })
    const leecher = torrentStream(torrent, {
        path: leechDir, verify: true, dht: false, tracker: false, connections: 55,
        storage: slowStorage(FSChunkStore, 8 * PIECE) // 8MB/s disk vs loopback network
    })
    // Small local torrents are ready within milliseconds: subscribe before awaiting either.
    const seederReady = new Promise((resolve) => seeder.once('ready', resolve))
    const leecherReady = new Promise((resolve) => leecher.once('ready', resolve))

    let peakQueued = 0
    try {
        await seederReady
        seeder.listen(port)
        await leecherReady
        leecher.files.forEach((f) => f.select())
        leecher.connect(`127.0.0.1:${port}`)

        await new Promise((resolve, reject) => {
            const deadline = setTimeout(() => reject(new Error('download did not finish')), 30000)
            const sample = setInterval(() => {
                let queued = 0
                for (const buf of leecher.store.mem) if (buf) queued += buf.length
                peakQueued = Math.max(peakQueued, queued)
                if (leecher.bitfield && Array.from({ length: PIECES }, (_, i) => leecher.bitfield.get(i)).every(Boolean) && queued === 0) {
                    clearInterval(sample); clearTimeout(deadline); resolve()
                }
            }, 20)
        })
    } finally {
        await new Promise((resolve) => leecher.destroy(resolve))
        await new Promise((resolve) => seeder.destroy(resolve))
        await fs.promises.rm(dir, { recursive: true, force: true })
    }

    // Budget 4MB; in-flight requests may land a few more pieces before the gate bites.
    assert.ok(peakQueued <= 12 * PIECE, `queued ${peakQueued / PIECE} pieces in memory, budget is 4`)
})

test('the pending-write budget defaults to 64MB and reads TORRENT_MAX_PENDING_WRITE_MB', async () => {
    const { getTorrentMaxPendingWriteBytes } = await import('../torrentStreamRuntime.js')
    assert.equal(getTorrentMaxPendingWriteBytes({}), 64 * 1048576)
    assert.equal(getTorrentMaxPendingWriteBytes({ TORRENT_MAX_PENDING_WRITE_MB: '16' }), 16 * 1048576)
    assert.equal(getTorrentMaxPendingWriteBytes({ TORRENT_MAX_PENDING_WRITE_MB: 'junk' }), 64 * 1048576)
})
