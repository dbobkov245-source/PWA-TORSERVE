/**
 * The "ускорить через TorrServer" gap.
 *
 * startFailover registers the job as 'downloading' immediately, but its file
 * list only arrives once TorrServer resolves metadata (polled every 3s, up to
 * 90s). Until then the stream route found an "active" job with no files and
 * answered 404 — while the native engine, which runJob releases only after
 * metadata, could still serve the bytes. Seen live: F1 (ecd3bde5) got a manual
 * migration, TorrServer never reported files, Vimu errored, the user deleted it.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { test } from './test-runner.js'
import { safeJoinDownloadPath } from '../utils/filePath.js'

async function fixture(fetchImpl) {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pwa-ts-gap-'))
    const original = await fs.promises.readFile(new URL('../tsDownload.js', import.meta.url), 'utf8')
    const context = vm.createContext({
        fs, path, Readable, Transform, pipeline, Buffer, AbortController, AbortSignal, Response,
        setInterval, clearInterval, setTimeout, clearTimeout,
        process: { env: { DOWNLOAD_PATH: directory } },
        logger: { child: () => ({ info() {}, warn() {}, error() {}, debug() {} }) },
        db: { data: { torrents: [], tsDownloads: [] } }, safeWrite: async () => {},
        safeJoinDownloadPath, fetch: fetchImpl,
        getAllTorrents: () => [], removeTorrent: () => true, notifyTorrentsChanged() {}
    })
    vm.runInContext(original.slice(original.indexOf('const log =')).replace(/^export /gm, ''), context)
    const api = vm.runInContext('({ jobs, getTsConfig, startFailover, removeTsJob, getActiveTsJob, isTsJobPending })', context)
    return { ...api, dispose: () => fs.promises.rm(directory, { recursive: true, force: true }) }
}

const hash = 'ecd3bde52e03912e330011374e00a8cc1b56bf1c'
const magnet = `magnet:?xt=urn:btih:${hash}`

test('a migration still waiting for TorrServer metadata does not hijack the stream', async () => {
    // TorrServer accepts the add but never reports files — the F1 case.
    const f = await fixture(async () => new Response('{}'))
    try {
        await f.startFailover({ infoHash: hash, magnet }, f.getTsConfig())

        assert.equal(f.getActiveTsJob(hash), null)
        assert.equal(f.isTsJobPending(hash), true)
    } finally {
        f.removeTsJob(hash)
        await f.dispose()
    }
})

test('a migration with a known file list redirects the stream to TorrServer', async () => {
    const f = await fixture(async () => new Response('{}'))
    try {
        f.jobs.set(hash, {
            infoHash: hash, magnet, status: 'downloading', written: 0,
            files: [{ path: 'F1.mkv', length: 10, tsId: 1 }]
        })

        assert.equal(f.getActiveTsJob(hash)?.infoHash, hash)
        assert.equal(f.isTsJobPending(hash), false)
    } finally {
        f.jobs.delete(hash)
        await f.dispose()
    }
})

test('the stream route asks the player to retry while a migration has no engine and no files', async () => {
    const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8')
    const pendingAt = src.indexOf('isTsJobPending(infoHash)')
    const notFoundAt = src.indexOf("res.status(404).send('Torrent not found')")

    assert.ok(pendingAt > -1, 'stream route must check isTsJobPending')
    assert.ok(pendingAt < notFoundAt, 'pending check must come before the 404')
})

test('a torrent that still has a native engine shows one card, not a TorrServer twin', async () => {
    const { withoutShadowedTsItems } = await import('../tsDownload.js')
    const native = [{ infoHash: hash, name: 'F1.mkv', backend: 'native', progress: 0.3 }]
    const ts = [
        { infoHash: hash, name: 'F1.mkv', backend: 'torrserve', progress: 0 },
        { infoHash: 'b'.repeat(40), name: 'Other.mkv', backend: 'torrserve', progress: 0.5 }
    ]

    const items = withoutShadowedTsItems(native, ts)

    assert.deepEqual(items.map(i => [i.infoHash, i.backend]), [
        [hash, 'native'],
        ['b'.repeat(40), 'torrserve']
    ])
})

test('the status payload goes through the TorrServer twin filter', async () => {
    const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8')
    assert.ok(src.includes('withoutShadowedTsItems(getAllTorrents(), getTsDownloadStatusItems())'))
})
