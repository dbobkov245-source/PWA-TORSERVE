import fs from 'node:fs/promises'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import assert from 'node:assert/strict'
import { test } from './test-runner.js'

// Execute the production addTorrent body with controlled engine events and time.
async function startup(env = {}) {
    const source = await fs.readFile(new URL('../torrent.js', import.meta.url), 'utf8')
    const body = source.slice(source.indexOf('export const addTorrent ='), source.indexOf('export const removeTorrent =')).replace('export const addTorrent =', 'globalThis.addTorrent =')
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
        METADATA_TIMEOUT_MS: 90_000, METADATA_GRACE_CYCLES: 2,
        getMetadataTimeoutDecision: () => 'timeout', VIDEO_EXTENSION: /\.mkv$/,
        setTimeout: (fn, delay) => { const id = ++sequence; timers.set(id, { fn, delay }); return id },
        clearTimeout: id => timers.delete(id), setInterval: () => ++sequence, clearInterval() {},
    })
    vm.runInContext(body, context)
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
