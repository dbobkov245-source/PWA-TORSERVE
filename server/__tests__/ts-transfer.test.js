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
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pwa-ts-transfer-'))
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
    const api = vm.runInContext('({ downloadFileFromTs, watchdogTick, jobs, getTsConfig, startFailover, removeTsJob })', context)
    return { ...api, directory, dispose: () => fs.promises.rm(directory, { recursive: true, force: true }) }
}

const file = { path: 'movie.mkv', length: 10, tsId: 1 }
const job = () => ({ infoHash: 'a'.repeat(40), fresh: false, written: 0 })

test('TorrServer resume handles ignored Range without duplicating the prefix', async () => {
    const f = await fixture(async () => new Response('0123456789', { status: 200 }))
    try {
        await fs.promises.writeFile(path.join(f.directory, file.path), '0123')
        const current = job()
        await f.downloadFileFromTs(f.getTsConfig(), current, file)
        assert.equal(await fs.promises.readFile(path.join(f.directory, file.path), 'utf8'), '0123456789')
        assert.equal(current.written, 10)
    } finally { await f.dispose() }
})

test('TorrServer resume validates Content-Range before appending', async () => {
    const f = await fixture(async () => new Response('56789', { status: 206, headers: { 'Content-Range': 'bytes 5-9/10' } }))
    try {
        await fs.promises.writeFile(path.join(f.directory, file.path), '0123')
        await assert.rejects(f.downloadFileFromTs(f.getTsConfig(), job(), file), /range/i)
        assert.equal(await fs.promises.readFile(path.join(f.directory, file.path), 'utf8'), '0123')
    } finally { await f.dispose() }
})

test('TorrServer transfer rejects truncated bodies rather than marking them complete', async () => {
    const f = await fixture(async () => new Response('0123', { status: 200 }))
    try {
        await assert.rejects(f.downloadFileFromTs(f.getTsConfig(), job(), file), /incomplete|length|bytes/i)
    } finally { await f.dispose() }
})

test('TorrServer timeout covers waiting for response headers', async () => {
    const f = await fixture((url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    }))
    try {
        await assert.rejects(f.downloadFileFromTs({ ...f.getTsConfig(), stallTimeoutMs: 20 }, job(), file), /stalled/)
    } finally { await f.dispose() }
})

test('TorrServer disk write errors reject the transfer without an unhandled stream error', async () => {
    const f = await fixture(async () => new Response('0123456789'))
    try {
        await fs.promises.mkdir(path.join(f.directory, file.path))
        await assert.rejects(f.downloadFileFromTs(f.getTsConfig(), job(), file), { code: 'EISDIR' })
    } finally { await f.dispose() }
})

test('TorrServer writes exact resumed bytes and preserves the existing prefix', async () => {
    const f = await fixture(async (url, options) => {
        assert.equal(options.headers.Range, 'bytes=4-')
        return new Response('456789', { status: 206, headers: { 'Content-Range': 'bytes 4-9/10' } })
    })
    try {
        await fs.promises.writeFile(path.join(f.directory, file.path), '0123')
        const current = job()
        await f.downloadFileFromTs(f.getTsConfig(), current, file)
        assert.equal(await fs.promises.readFile(path.join(f.directory, file.path), 'utf8'), '0123456789')
        assert.equal(current.written, 10)
    } finally { await f.dispose() }
})

test('TorrServer watchdog retries failed migrated jobs without a native engine', async () => {
    let attempts = 0
    const f = await fixture(async (url, options) => {
        if (url.endsWith('/echo')) return new Response('MatriX')
        const action = JSON.parse(options.body).action
        if (action === 'add') attempts++
        if (action === 'get') return new Response(JSON.stringify({ file_stats: [{ path: 'movie.mkv', length: 10, id: 1 }] }))
        return new Response('{}')
    })
    try {
        const hash = 'b'.repeat(40)
        f.jobs.set(hash, { ...job(), infoHash: hash, magnet: `magnet:?xt=urn:btih:${hash}`, status: 'error', startedAt: 0, failedAt: 0, files: [] })
        await f.watchdogTick(f.getTsConfig())
        // Let runJob finish its asynchronous request before checking its observable retry.
        for (let i = 0; i < 10 && !attempts; i++) await new Promise(resolve => setImmediate(resolve))
        assert.equal(attempts, 1)
        f.removeTsJob(hash)
        await new Promise(resolve => setTimeout(resolve, 20))
    } finally { await f.dispose() }
})

test('TorrServer retry preserves completed files and resumes the interrupted file', async () => {
    let secondRequests = 0
    const f = await fixture(async (url, options) => {
        if (url.endsWith('/echo')) return new Response('MatriX')
        if (url.includes('/stream/file')) {
            if (url.includes('index=1')) return new Response('0123456789')
            if (++secondRequests === 1) return new Response('0123')
            assert.equal(options.headers.Range, 'bytes=4-')
            return new Response('456789', { status: 206, headers: { 'Content-Range': 'bytes 4-9/10' } })
        }
        if (JSON.parse(options.body).action === 'get') return new Response(JSON.stringify({ file_stats: [
            { path: 'first.mkv', length: 10, id: 1 }, { path: 'second.mkv', length: 10, id: 2 }
        ] }))
        return new Response('{}')
    })
    const waitFor = async (current, status) => {
        for (let i = 0; i < 100 && current.status !== status; i++) await new Promise(resolve => setTimeout(resolve, 5))
        assert.equal(current.status, status, current.error)
    }
    try {
        await fs.promises.writeFile(path.join(f.directory, 'first.mkv'), 'old sparse native data')
        await fs.promises.writeFile(path.join(f.directory, 'second.mkv'), 'old sparse native data')
        const hash = 'c'.repeat(40)
        const current = await f.startFailover({ infoHash: hash, magnet: `magnet:?xt=urn:btih:${hash}` }, f.getTsConfig())
        await waitFor(current, 'error')
        current.failedAt = 0
        await f.watchdogTick(f.getTsConfig())
        await waitFor(current, 'done')
        assert.equal(current.written, 20)
        assert.equal(await fs.promises.readFile(path.join(f.directory, 'first.mkv'), 'utf8'), '0123456789')
        assert.equal(await fs.promises.readFile(path.join(f.directory, 'second.mkv'), 'utf8'), '0123456789')
    } finally { await f.dispose() }
})

test('TorrServer metadata name replaces the magnet dn placeholder', async () => {
    // dn is often transliterated ("Prizrak-v-kletke…"); the library card is keyed
    // by the real on-disk name, so keeping dn would show the film twice.
    const f = await fixture(async (url, options = {}) => {
        if (url.endsWith('/torrents')) {
            const { action } = JSON.parse(options.body)
            if (action === 'get') {
                return new Response(JSON.stringify({ name: 'Coyote.vs.Acme.2026.mkv', file_stats: [{ id: 1, path: 'Coyote.vs.Acme.2026.mkv', length: 10 }] }))
            }
            return new Response('{}')
        }
        return new Response('0123456789', { status: 200 })
    })
    try {
        const current = await f.startFailover({ infoHash: 'b'.repeat(40), magnet: 'magnet:?xt=urn:btih:' + 'b'.repeat(40), name: 'Koyot-protiv-Akme' })
        for (let i = 0; i < 50 && current.status === 'downloading'; i++) await new Promise(r => setTimeout(r, 20))
        assert.equal(current.status, 'done')
        assert.equal(current.name, 'Coyote.vs.Acme.2026.mkv')
    } finally { await f.dispose() }
})
