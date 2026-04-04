import fs from 'fs'
import path from 'path'
import Module, { createRequire } from 'module'

const require = createRequire(import.meta.url)
const STOCK_TORRENT_MAX_REQUESTS = 5
const DEFAULT_TORRENT_MAX_REQUESTS = 32
const SWARM_INIT_SOURCE = 'var swarm = pws(infoHash, opts.id, { size: (opts.connections || opts.size), speed: 10 })'
const SWARM_INIT_PATCHED = 'var swarm = pws(infoHash, opts.id, { size: (opts.connections || opts.size), speed: 10, utp: opts.utp })'
const runtimeCache = new Map()

export function getTorrentMaxRequests(env = process.env) {
    const raw = env.TORRENT_MAX_REQUESTS
    if (raw === undefined) return DEFAULT_TORRENT_MAX_REQUESTS

    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TORRENT_MAX_REQUESTS
    return parsed
}

export function patchTorrentStreamSource(source, env = process.env) {
    const maxRequests = getTorrentMaxRequests(env)
    let patched = source

    if (!patched.includes('utp: opts.utp') && patched.includes(SWARM_INIT_SOURCE)) {
        patched = patched.replace(SWARM_INIT_SOURCE, SWARM_INIT_PATCHED)
    }

    if (maxRequests === STOCK_TORRENT_MAX_REQUESTS) return patched

    return patched.replace(
        `var MAX_REQUESTS = ${STOCK_TORRENT_MAX_REQUESTS}`,
        `var MAX_REQUESTS = ${maxRequests}`
    )
}

function loadPatchedTorrentStream(maxRequests) {
    const cacheKey = `max-requests:${maxRequests}`
    const cached = runtimeCache.get(cacheKey)
    if (cached) return cached

    const entryPath = require.resolve('torrent-stream')
    const originalSource = fs.readFileSync(entryPath, 'utf8')
    const patchedSource = patchTorrentStreamSource(originalSource, {
        TORRENT_MAX_REQUESTS: String(maxRequests)
    })

    if (patchedSource === originalSource) {
        const stock = require('torrent-stream')
        runtimeCache.set(cacheKey, stock)
        return stock
    }

    const syntheticPath = path.join(
        path.dirname(entryPath),
        `__patched_torrent_stream_max_${maxRequests}.cjs`
    )

    const patchedModule = new Module(syntheticPath)
    patchedModule.filename = syntheticPath
    patchedModule.paths = Module._nodeModulePaths(path.dirname(entryPath))
    patchedModule._compile(patchedSource, syntheticPath)

    runtimeCache.set(cacheKey, patchedModule.exports)
    return patchedModule.exports
}

export function getTorrentStream(env = process.env) {
    const maxRequests = getTorrentMaxRequests(env)
    if (maxRequests === STOCK_TORRENT_MAX_REQUESTS) {
        return require('torrent-stream')
    }

    return loadPatchedTorrentStream(maxRequests)
}
