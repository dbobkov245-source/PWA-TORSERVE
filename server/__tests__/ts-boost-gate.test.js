/**
 * "Ускорить через TorrServer" only where it helps, and an honest peer count.
 *
 * TorrServer is capped by ConnectionsLimit 25 and its 64MB reader window: on a
 * healthy swarm it is slower than native (measured: native up to 33MB/s, TS
 * 7-14MB/s). Matchbox 4K (2026-10-11, 284 peers): native well above 9MB/s,
 * after the boost 8-9MB/s. And the app showed "1 peer" while TorrServer had 25
 * connected / 284 known — job.peers was sampled once, when the transfer began.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from './test-runner.js'

const MB = 1048576

test('a native download already at 5MB/s or faster is not worth boosting', async () => {
    const { isTsBoostable } = await import('../tsDownload.js')
    const config = { enabled: true, boostMaxSpeedBps: 5 * MB }
    const native = { infoHash: 'a'.repeat(40), backend: 'native', isReady: false, progress: 0.1 }

    assert.equal(isTsBoostable({ ...native, downloadSpeed: 12 * MB }, config), false)
    assert.equal(isTsBoostable({ ...native, downloadSpeed: 5 * MB }, config), false)
    assert.equal(isTsBoostable({ ...native, downloadSpeed: 1 * MB }, config), true)
    assert.equal(isTsBoostable({ ...native, downloadSpeed: 0 }, config), true)
})

test('finished, TorrServer-backed or disabled downloads are never boostable', async () => {
    const { isTsBoostable } = await import('../tsDownload.js')
    const config = { enabled: true, boostMaxSpeedBps: 5 * MB }
    const slow = { infoHash: 'a'.repeat(40), backend: 'native', isReady: false, progress: 0.1, downloadSpeed: 0 }

    assert.equal(isTsBoostable({ ...slow, isReady: true }, config), false)
    assert.equal(isTsBoostable({ ...slow, progress: 1 }, config), false)
    assert.equal(isTsBoostable({ ...slow, backend: 'torrserve' }, config), false)
    assert.equal(isTsBoostable(slow, { ...config, enabled: false }), false)
})

test('the boost ceiling defaults to 5MB/s and reads TS_BOOST_MAX_SPEED_BPS', async () => {
    const { getTsConfig } = await import('../tsDownload.js')
    assert.equal(getTsConfig({}).boostMaxSpeedBps, 5 * MB)
    assert.equal(getTsConfig({ TS_BOOST_MAX_SPEED_BPS: '1000' }).boostMaxSpeedBps, 1000)
})

test('status items tell the client whether the boost button makes sense', async () => {
    const { serializeStatusItems } = await import('../statusResponse.js')
    const [fast, stuck] = serializeStatusItems([
        { infoHash: 'a'.repeat(40), backend: 'native', isReady: false, progress: 0.1, downloadSpeed: 20 * MB },
        { infoHash: 'b'.repeat(40), backend: 'native', isReady: false, progress: 0.1, downloadSpeed: 0 }
    ])
    assert.equal(fast.tsBoostable, false)
    assert.equal(stuck.tsBoostable, true)
})

test('the failover route refuses a download that is already fast', () => {
    const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8')
    const route = src.slice(src.indexOf("app.post('/api/torrents/:infoHash/failover'"))
    const gateAt = route.indexOf('isTsBoostable(')
    const startAt = route.indexOf('startFailover(')
    assert.ok(gateAt > -1 && gateAt < startAt, 'failover must check isTsBoostable before starting')
})

test('TorrServer peer counts follow the live swarm, not the first sample', async () => {
    const { applyTsPeerStats, mapJobToStatusItem } = await import('../tsDownload.js')
    const job = { infoHash: 'c'.repeat(40), name: 'Matchbox.mkv', status: 'downloading', written: 0, totalSize: 10, peers: 1, files: [] }

    applyTsPeerStats(job, { active_peers: 25, total_peers: 284, connected_seeders: 17 })
    const item = mapJobToStatusItem(job)

    assert.equal(item.numPeers, 25)
    assert.equal(item.connectedPeers, 25)
    assert.equal(item.knownPeers, 284)
})

test('the transfer refreshes peer stats while it runs', () => {
    const src = fs.readFileSync(new URL('../tsDownload.js', import.meta.url), 'utf8')
    const transfer = src.slice(src.indexOf('async function downloadFileFromTs'), src.indexOf('async function runJob'))
    assert.ok(transfer.includes('applyTsPeerStats('), 'downloadFileFromTs must refresh peer stats')
})
