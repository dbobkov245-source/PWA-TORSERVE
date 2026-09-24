/** Real TCP download smoke test. Synthetic 1 MiB payload; no public peers or trackers. */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { once } from 'node:events'
import net from 'node:net'
import { getTorrentStream } from '../server/torrentStreamRuntime.js'

const require = createRequire(import.meta.url)
const torrentRequire = createRequire(require.resolve('torrent-stream'))
const bencode = torrentRequire('bncode')
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pwa-download-smoke-'))
const active = new Set()
const payload = crypto.randomBytes(1024 * 1024)
const pieceLength = 64 * 1024
const pieces = []
for (let i = 0; i < payload.length; i += pieceLength) {
    pieces.push(crypto.createHash('sha1').update(payload.subarray(i, i + pieceLength)).digest())
}
const torrent = bencode.encode({ info: { name: 'fixture.mkv', length: payload.length, 'piece length': pieceLength, pieces: Buffer.concat(pieces) } })
const torrentStream = getTorrentStream()
const waitReady = engine => once(engine, 'ready')
const waitForDisk = async expected => {
    // ImmediateChunkStore can serve RAM before its asynchronous disk write finishes.
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
        const bytes = await fs.readFile(path.join(root, 'download', 'fixture.mkv')).catch(() => Buffer.alloc(0))
        if (bytes.subarray(0, expected.length).equals(expected)) return
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    assert.fail('Downloaded bytes did not reach disk within five seconds')
}
const stop = async engine => {
    if (!active.delete(engine)) return
    await new Promise(resolve => engine.destroy(resolve))
}
const start = async (folder, verify) => {
    const location = path.join(root, folder)
    await fs.mkdir(location, { recursive: true })
    const engine = torrentStream(torrent, { path: location, tmp: root, tracker: false, dht: false, utp: false, verify })
    active.add(engine)
    await waitReady(engine)
    return engine
}
const deadline = setTimeout(async () => {
    console.error('Torrent download smoke test exceeded 60 seconds')
    await Promise.all([...active].map(stop))
    await fs.rm(root, { recursive: true, force: true })
    process.exit(1)
}, 60000)

try {
    await fs.mkdir(path.join(root, 'seed'))
    await fs.writeFile(path.join(root, 'seed', 'fixture.mkv'), payload)
    const seed = await start('seed', true)
    // torrent-stream retains 0 in engine.port even when the OS chose a port.
    // Reserve an ephemeral port first so the peer gets the actual port number.
    const reservation = net.createServer()
    await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve) })
    const port = reservation.address().port
    await new Promise(resolve => reservation.close(resolve))
    await new Promise(resolve => seed.listen(port, resolve))
    let download = await start('download', false)
    // Transfer an actual first piece, then restart with a partial file on disk.
    download.connect(`127.0.0.1:${seed.port}`)
    const first = []
    for await (const chunk of download.files[0].createReadStream({ start: 0, end: pieceLength - 1 })) first.push(chunk)
    assert.deepEqual(Buffer.concat(first), payload.subarray(0, pieceLength))
    await waitForDisk(payload.subarray(0, pieceLength))
    await stop(download)

    download = await start('download', true)
    console.log('Partial file verified after restart')
    const piecesRecognizedAfterRestart = pieces.filter((_, i) => download.bitfield.get(i)).length
    assert.ok(piecesRecognizedAfterRestart > 0, 'Saved pieces must survive restart')
    download.connect(`127.0.0.1:${seed.port}`)
    const received = []
    for await (const chunk of download.files[0].createReadStream()) received.push(chunk)
    assert.deepEqual(Buffer.concat(received), payload)
    await waitForDisk(payload)
    await stop(download)
    console.log('Full download saved; checking corrupt-piece recovery')
    // A corrupt local piece must be rejected, while every other piece stays reusable.
    const handle = await fs.open(path.join(root, 'download', 'fixture.mkv'), 'r+')
    await handle.write(Buffer.alloc(pieceLength), 0, pieceLength, 0)
    await handle.close()
    download = await start('download', true)
    assert.equal(download.bitfield.get(0), false)
    assert.equal(pieces.filter((_, i) => download.bitfield.get(i)).length, pieces.length - 1)
    let downloadedPieces = 0
    download.on('download', () => { downloadedPieces++ })
    download.connect(`127.0.0.1:${seed.port}`)
    const repaired = []
    for await (const chunk of download.files[0].createReadStream()) repaired.push(chunk)
    assert.deepEqual(Buffer.concat(repaired), payload)
    assert.equal(downloadedPieces, 1, 'Only the corrupt piece should be downloaded again')
    await waitForDisk(payload)
    await stop(download)
    const diskBytes = await fs.readFile(path.join(root, 'download', 'fixture.mkv'))
    assert.deepEqual(diskBytes, payload)
    console.log(JSON.stringify({
        result: 'PASS', bytes: diskBytes.length, sha256: crypto.createHash('sha256').update(diskBytes).digest('hex'),
        transport: 'local TCP', partialRestart: 'PASS', piecesRecognizedAfterRestart,
        corruptPieceRepair: 'PASS', downloadedPiecesAfterCorruption: downloadedPieces
    }, null, 2))
} finally {
    clearTimeout(deadline)
    await Promise.all([...active].map(stop))
    await fs.rm(root, { recursive: true, force: true })
}
