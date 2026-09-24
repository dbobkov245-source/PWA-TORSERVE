import fs from 'node:fs/promises'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import assert from 'node:assert/strict'
import { test } from './test-runner.js'

// Execute the production addTorrent body with controlled engine events and time.
async function startup(env = {}) {
    const source = await fs.readFile(new URL('../torrent.js', import.meta.url), 'utf8')
    const body = source.slice(source.indexOf('export const addTorrent ='), source.indexOf('export const removeTorrent =')).replace('export const addTorrent =', 'globalThis.addTorrent =')
    const snapshot = source.slice(source.indexOf('export function getSwarmPeerSnapshot'), source.indexOf('export function getSwarmConnectionLimit')).replace('export function', 'function')
    const engine = new EventEmitter()
    Object.assign(engine, { infoHash: 'a'.repeat(40), files: [], torrent: { name: 'fixture' }, swarm: {}, listen() {}, destroy() { this.destroyed = true } })
    const timers = new Map(), engines = new Map(), pendingEngines = new Set()
    let sequence = 0
    const context = vm.createContext({
        console: { log() {}, warn() {}, error() {} }, process: { env },
        engines, pendingEngines, frozenTorrents: new Map(), diskDownloadCache: new Map(), completedCache: new Map(),
        extractInfoHash: () => engine.infoHash, PUBLIC_TRACKERS: [],
        getTorrentStream: () => () => engine, buildTorrentEngineOptions: () => ({}),
        sharedDHT: {}, trackDhtPeerListeners: () => () => {}, destroyEngine: e => e.destroy(),
        createMetadataTimeoutError: () => new Error('metadata unavailable'),
        getTorrentConnections: () => 55, getTorrentListenPort: () => 6881,
        invalidateStatusCache() {}, notifyTorrentChange() {}, formatEngine: e => ({ infoHash: e.infoHash }),
        saveTorrentToDB: async () => {}, removeEngineReferences() { engines.clear() },
        METADATA_TIMEOUT_MS: 90_000, METADATA_GRACE_CYCLES: 2, NO_PEER_TIMEOUT_MS: 15_000,
        getMetadataTimeoutDecision: () => 'timeout', VIDEO_EXTENSION: /\.mkv$/,
        setTimeout: (fn, delay) => { const id = ++sequence; timers.set(id, { fn, delay }); return id },
        clearTimeout: id => timers.delete(id), setInterval: () => ++sequence, clearInterval() {},
    })
    vm.runInContext(snapshot + body, context)
    const promise = context.addTorrent('magnet:?xt=urn:btih:' + engine.infoHash, true)
    return { engine, promise, timers, engines, pendingEngines }
}

test('local verification replaces the metadata deadline and ready clears it', async () => {
    const { engine, promise, timers } = await startup()
    assert.equal([...timers.values()][0].delay, 90_000)
    engine.emit('verifying')
    assert.equal(timers.size, 1)
    assert.equal([...timers.values()][0].delay, 3_600_000)
    engine.emit('ready')
    await promise
    assert.equal(timers.size, 0)
})

test('verification timeout cannot resurrect a destroyed engine on late ready', async () => {
    const { engine, promise, timers, engines, pendingEngines } = await startup({ TORRENT_VERIFY_TIMEOUT_MS: '120000' })
    const rejected = assert.rejects(promise, /local piece verification/)
    engine.emit('verifying')
    assert.equal([...timers.values()][0].delay, 120_000)
    ;[...timers.values()][0].fn()
    await rejected
    engine.emit('ready')
    assert.equal(engine.destroyed, true)
    assert.equal(engines.size, 0)
    assert.equal(pendingEngines.size, 0)
    assert.equal(timers.size, 0)
})

test('metadata timeout cleans up the pending engine', async () => {
    const { engine, promise, timers, engines, pendingEngines } = await startup()
    const rejected = assert.rejects(promise, /metadata unavailable/)
    ;[...timers.values()][0].fn()
    await rejected
    engine.emit('ready')
    assert.equal(engine.destroyed, true)
    assert.equal(engines.size, 0)
    assert.equal(pendingEngines.size, 0)
    assert.equal(timers.size, 0)
})

// Measured 2026-09-24 (Coyote vs Acme): the native engine sat at peers 0 / queued 0
// for the full 90s before /api/add handed the magnet to TorrServer, which resolved
// it in 6s. A swarm with nobody at all after 15s is not going to recover.
const timerWith = (timers, delay) => [...timers.values()].find(t => t.delay === delay)

test('a swarm with no peers at all is abandoned at the short deadline', async () => {
    const { engine, promise, timers, engines, pendingEngines } = await startup()
    const rejected = assert.rejects(promise, /metadata unavailable/)
    engine.swarm = { wires: [], queued: 0, _peers: {} }
    timerWith(timers, 15_000).fn()
    await rejected
    assert.equal(engine.destroyed, true)
    assert.equal(engines.size, 0)
    assert.equal(pendingEngines.size, 0)
    assert.equal(timers.size, 0)
})

test('known peers nobody can connect to do not hold the handover back', async () => {
    // Failed peers sit in _peers while peer-wire-swarm backs off (NAS: 77 known,
    // 0 connected). Only a live wire can deliver metadata.
    const { engine, promise, timers } = await startup()
    const rejected = assert.rejects(promise, /metadata unavailable/)
    engine.swarm = { wires: [], queued: 0, _peers: { '1.2.3.4:6881': {}, '5.6.7.8:51413': {} } }
    timerWith(timers, 15_000).fn()
    await rejected
    assert.equal(engine.destroyed, true)
})

test('a swarm with a connected peer keeps the full metadata deadline', async () => {
    const { engine, promise, timers } = await startup()
    engine.swarm = { wires: [{}], queued: 2, _peers: { '1.2.3.4:6881': {} } }
    timerWith(timers, 15_000).fn()
    assert.equal(engine.destroyed, undefined)
    assert.ok(timerWith(timers, 90_000))
    engine.emit('ready')
    await promise
})

test('metadata arriving cancels the no-peer deadline', async () => {
    const { engine, timers } = await startup()
    engine.emit('verifying')
    assert.equal(timerWith(timers, 15_000), undefined)
})
