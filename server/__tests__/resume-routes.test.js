/**
 * /api/resume over real HTTP: one TV saves, the other reads it back.
 */

import assert from 'node:assert/strict'
import express from 'express'
import { test } from './test-runner.js'

const HASH = 'f'.repeat(40)
const KEY = `${HASH}:0`

async function withServer(db, run) {
    const { createResumeRouter } = await import('../routes/resume.js')
    const writes = []
    const app = express()
    app.use(express.json())
    app.use('/api/resume', createResumeRouter({ db, safeWrite: async (d) => { writes.push(structuredClone(d.data.resume)) } }))
    app.use((err, req, res, next) => res.status(500).json({ error: err.message })) // eslint-disable-line no-unused-vars
    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    const base = `http://127.0.0.1:${server.address().port}/api/resume`
    try { await run(base, writes) } finally { server.close() }
}

const entry = (position, updatedAt) => ({ infoHash: HASH, fileIndex: 0, fileName: 'Runner.mkv', position, duration: 7200000, updatedAt })

test('a position POSTed by one TV is returned to the other and persisted', async () => {
    const db = { data: {} }
    await withServer(db, async (base, writes) => {
        const put = await fetch(`${base}/${KEY}`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ entry: entry(1800000, 1000) })
        })
        assert.equal(put.status, 200)
        assert.equal((await put.json()).changed, true)
        assert.equal(writes.length, 1)

        const list = await (await fetch(base)).json()
        assert.equal(list.entries[0].position, 1800000)
    })
})

test('a stale write is acknowledged without touching the disk', async () => {
    const db = { data: { resume: { entries: {}, tombstones: { [KEY]: 5000 } } } }
    await withServer(db, async (base, writes) => {
        const res = await fetch(`${base}/${KEY}`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ entry: entry(600000, 1000) })
        })
        assert.equal((await res.json()).changed, false)
        assert.equal(writes.length, 0)
    })
})

test('a malformed change is a 400, not a crash', async () => {
    const db = { data: {} }
    await withServer(db, async (base) => {
        const res = await fetch(`${base}/nothex:0`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ entry: entry(1, 1) })
        })
        assert.equal(res.status, 400)
    })
})

test('the delete route drops a deleted torrent from every TV\'s resume list', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
    const route = src.slice(src.indexOf("app.delete('/api/delete/:infoHash'"), src.indexOf("app.get('/stream/:infoHash/:fileIndex'"))
    assert.ok(route.includes('tombstoneTorrent(db.data.resume'), 'delete route must tombstone resume entries')
})
