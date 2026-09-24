import assert from 'node:assert/strict'
import { test } from './test-runner.js'
import { loadRoute, responseStream } from './route-harness.js'
import { safeWrite } from '../dbQueue.js'

const cases = [
    ['POST favorite', "app.post('/api/favorites'", { body: { tmdbId: 1 } }, { favorites: [] }],
    ['DELETE favorite', "app.delete('/api/favorites/:tmdbId'", { params: { tmdbId: '1' } }, { favorites: [{ tmdbId: 1 }] }],
    ['POST history', "app.post('/api/history'", { body: { tmdbId: 1 } }, { viewHistory: [] }],
    ['DELETE history entry', "app.delete('/api/history/:tmdbId'", { params: { tmdbId: '1' } }, { viewHistory: [{ tmdbId: 1 }] }],
    ['DELETE history', "app.delete('/api/history',", {}, { viewHistory: [] }],
    ['DELETE saved torrents', "app.delete('/api/db/torrents',", {}, { torrents: [{}] }],
    ['DELETE saved torrent by hash', "app.delete('/api/db/torrents/:hash'", { params: { hash: 'abcd' } }, { torrents: [{ magnet: 'magnet' }] }],
    ['DELETE autodownload rule', "app.delete('/api/autodownload/rules/:id'", { params: { id: '1' } }, {}],
    ['Trakt disconnect', "router.post('/disconnect'", {}, { trakt: {} }]
]
for (const [label, marker, req, data] of cases) {
    test(`${label} forwards failed persistence to Express without reporting success`, async () => {
        const failure = Object.assign(new Error('disk full'), { code: 'ENOSPC' })
        const db = { data: structuredClone(data), read: async () => {}, write: async () => { throw failure } }
        let wrappers = {}
        try { wrappers = await import('../asyncRoute.js') } catch (err) { if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err }
        const { handler } = await loadRoute(marker.startsWith('router') ? '../routes/trakt.js' : '../index.js', marker, {
            ...wrappers, db, safeWrite, isMagnetHashMatch: () => true,
            deleteRule: async () => { await safeWrite(db); return true }
        })
        const res = responseStream()
        let forwarded, escaped
        try { await handler(req, res, err => { forwarded = err }) } catch (err) { escaped = err }
        assert.equal(escaped, undefined, 'Express 4 must not receive an unhandled rejected route promise')
        assert.equal(forwarded, failure)
        assert.equal(res.writableEnded, false, 'route must not report a successful write')
        res.destroy()
    })
}
