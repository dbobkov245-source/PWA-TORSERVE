import fs from 'fs'
import path from 'path'
import Module, { createRequire } from 'module'

const require = createRequire(import.meta.url)
const STOCK_TORRENT_MAX_REQUESTS = 5
const DEFAULT_TORRENT_MAX_REQUESTS = 32
const SWARM_INIT_SOURCE = 'var swarm = pws(infoHash, opts.id, { size: (opts.connections || opts.size), speed: 10 })'
const SWARM_INIT_PATCHED = 'var swarm = pws(infoHash, opts.id, { size: (opts.connections || opts.size), speed: 10, utp: opts.utp })'
const DEFAULT_MAX_PENDING_WRITE_MB = 64
// Write backpressure. A verified piece goes to ImmediateChunkStore, which holds
// the buffer until the disk write completes and never slows the swarm down, so
// a network faster than the disk queues pieces without bound (lab: 1.46GB in 9s
// at 20MB/s disk; NAS: OOM-killed at the 768MB cgroup every minute). Count the
// queued bytes and stop asking peers for more while they exceed the budget;
// each finished write re-runs the request loop.
const PIECE_PUT_SOURCE = '      engine.store.put(index, buffer)\n'
const PIECE_PUT_PATCHED = [
    '      engine.pendingWriteBytes = (engine.pendingWriteBytes || 0) + buffer.length',
    '      engine.store.put(index, buffer, function () {',
    '        engine.pendingWriteBytes -= buffer.length',
    '        onupdatetick()',
    '      })',
    ''
].join('\n')
const WIRE_UPDATE_SOURCE = '      if (wire.peerChoking) return\n'
const WIRE_UPDATE_PATCHED = WIRE_UPDATE_SOURCE +
    '      if (engine.pendingWriteBytes > MAX_PENDING_WRITE_BYTES) return\n'
const runtimeCache = new Map()

export function getTorrentMaxRequests(env = process.env) {
    const raw = env.TORRENT_MAX_REQUESTS
    if (raw === undefined) return DEFAULT_TORRENT_MAX_REQUESTS

    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TORRENT_MAX_REQUESTS
    return parsed
}

export function getTorrentMaxPendingWriteBytes(env = process.env) {
    const parsed = parseInt(env.TORRENT_MAX_PENDING_WRITE_MB, 10)
    const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PENDING_WRITE_MB
    return mb * 1048576
}

export function patchTorrentStreamSource(source, env = process.env) {
    const maxRequests = getTorrentMaxRequests(env)
    let patched = source

    if (!patched.includes('utp: opts.utp') && patched.includes(SWARM_INIT_SOURCE)) {
        patched = patched.replace(SWARM_INIT_SOURCE, SWARM_INIT_PATCHED)
    }

    if (patched.includes(PIECE_PUT_SOURCE) && patched.includes(WIRE_UPDATE_SOURCE)) {
        patched = patched
            .replace(PIECE_PUT_SOURCE, PIECE_PUT_PATCHED)
            .replace(WIRE_UPDATE_SOURCE, WIRE_UPDATE_PATCHED)
            .replace(
                `var MAX_REQUESTS = ${STOCK_TORRENT_MAX_REQUESTS}`,
                `var MAX_REQUESTS = ${STOCK_TORRENT_MAX_REQUESTS}\nvar MAX_PENDING_WRITE_BYTES = ${getTorrentMaxPendingWriteBytes(env)}`
            )
    } else {
        console.warn('[TorrentStream] write backpressure NOT applied: torrent-stream source changed')
    }

    if (maxRequests === STOCK_TORRENT_MAX_REQUESTS) return patched

    return patched.replace(
        `var MAX_REQUESTS = ${STOCK_TORRENT_MAX_REQUESTS}`,
        `var MAX_REQUESTS = ${maxRequests}`
    )
}

function loadPatchedTorrentStream(maxRequests, maxPendingWriteBytes) {
    const cacheKey = `max-requests:${maxRequests}:pending-write:${maxPendingWriteBytes}`
    const cached = runtimeCache.get(cacheKey)
    if (cached) return cached

    const entryPath = require.resolve('torrent-stream')
    const originalSource = fs.readFileSync(entryPath, 'utf8')
    const patchedSource = patchTorrentStreamSource(originalSource, {
        TORRENT_MAX_REQUESTS: String(maxRequests),
        TORRENT_MAX_PENDING_WRITE_MB: String(maxPendingWriteBytes / 1048576)
    })

    if (patchedSource === originalSource) {
        const stock = require('torrent-stream')
        runtimeCache.set(cacheKey, stock)
        return stock
    }

    const syntheticPath = path.join(
        path.dirname(entryPath),
        `__patched_torrent_stream_max_${maxRequests}_pw_${maxPendingWriteBytes}.cjs`
    )

    const patchedModule = new Module(syntheticPath)
    patchedModule.filename = syntheticPath
    patchedModule.paths = Module._nodeModulePaths(path.dirname(entryPath))
    patchedModule._compile(patchedSource, syntheticPath)

    runtimeCache.set(cacheKey, patchedModule.exports)
    return patchedModule.exports
}

export function getTorrentStream(env = process.env) {
    return loadPatchedTorrentStream(getTorrentMaxRequests(env), getTorrentMaxPendingWriteBytes(env))
}
