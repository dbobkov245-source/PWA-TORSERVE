/**
 * tsDownload.js — Hybrid download failover via TorrServer MatriX sidecar
 *
 * Native torrent-stream is the fast path (no cache window, 30+ MB/s on
 * healthy swarms). On weak/encrypted RU swarms it connects to almost no
 * peers (no MSE encryption, no PEX). Measured A/B 2026-06-11:
 *   healthy swarm: native 33 MB/s vs TorrServer 7-14 MB/s
 *   weak swarm:    native 1.5 MB/s (3 peers) vs TorrServer ~13 MB/s (7 peers)
 *
 * Strategy: a watchdog migrates crawling downloads to TorrServer and
 * copies its HTTP stream to disk (anacrolix swarm + flat library file).
 * TorrServer writes sequentially, so restarts resume via Range header.
 */

import fs from 'fs'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import path from 'path'
import { db, safeWrite } from './db.js'
import { safeJoinDownloadPath } from './utils/filePath.js'
import {
    getAllTorrents,
    removeTorrent,
    notifyTorrentsChanged
} from './torrent.js'
import { logger } from './utils/logger.js'
import { isStreamActive } from './streamMonitor.js'
import { isMagnetHashMatch } from './utils/magnetHash.js'

const log = logger.child('TsDownload')

// ─── Config ────────────────────────────────────────────────────
export function getTsConfig(env = process.env) {
    return {
        // 172.17.0.1 = docker bridge gateway: reaches the TorrServer
        // container from inside ours without docker-compose networking.
        url: (env.TS_URL || 'http://172.17.0.1:8090').replace(/\/$/, ''),
        enabled: env.TS_FAILOVER !== '0',
        graceMs: parseInt(env.TS_FAILOVER_GRACE_MS || '90000', 10),
        minSpeedBps: parseInt(env.TS_FAILOVER_MIN_SPEED_BPS || String(800 * 1024), 10),
        checkIntervalMs: parseInt(env.TS_FAILOVER_CHECK_INTERVAL_MS || '30000', 10),
        maxConcurrentJobs: parseInt(env.TS_FAILOVER_MAX_JOBS || '2', 10),
        stallTimeoutMs: parseInt(env.TS_FAILOVER_STALL_MS || String(30 * 60 * 1000), 10),
        // torrent-stream has no MSE/uTP: on RU swarms it often connects to 0 of 70+
        // known peers while TorrServer reaches 20+. Don't wait the full grace for that.
        zeroPeerGraceMs: parseInt(env.TS_FAILOVER_ZERO_PEER_GRACE_MS || '30000', 10),
        // Migration discards native sparse files; past this point finishing is cheaper.
        maxProgress: parseFloat(env.TS_FAILOVER_MAX_PROGRESS || '0.5')
    }
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.m4v', '.mov', '.webm', '.ts', '.m2ts', '.wmv', '.flv'])

// ─── Pure helpers (unit-tested) ────────────────────────────────

/**
 * Decide whether a native download should be migrated to TorrServer.
 * @param {Object} item - status item from getAllTorrents()
 * @param {number} item.ageMs - time since the engine was added
 * @param {boolean} [item.streaming] - a player is reading it (migration would cut playback)
 */
export function evaluateDownloadFailover(item, config = getTsConfig()) {
    if (!config.enabled) return false
    if (!item || !item.infoHash) return false
    if (item.isReady) return false
    // Metadata not resolved yet → nothing to compare, let native keep trying
    if (!item.totalSize) return false
    if (item.streaming) return false
    if ((item.progress || 0) >= config.maxProgress) return false
    const ageMs = item.ageMs || 0
    if (item.connectedPeers === 0 && ageMs >= config.zeroPeerGraceMs) return true
    if (ageMs < config.graceMs) return false
    return (item.downloadSpeed || 0) < config.minSpeedBps
}

export function buildTsStreamUrl(tsUrl, infoHash, tsFileId) {
    return `${tsUrl.replace(/\/$/, '')}/stream/file?link=${infoHash}&index=${tsFileId}&play`
}

/**
 * Stream URL reachable by the CLIENT (player on the TV). TS_URL points at
 * the docker bridge (172.17.0.1) which only resolves inside the NAS —
 * redirecting a player there yields "cannot play content". Rebuild the URL
 * on the host the client itself used, with TorrServer's published port.
 */
export function buildPublicTsStreamUrl(req, infoHash, tsFileId, env = process.env) {
    const host = req.hostname || req.headers?.host?.split(':')[0] || '127.0.0.1'
    const port = env.TS_PUBLIC_PORT || '8090'
    return `http://${host}:${port}/stream/file?link=${infoHash}&index=${tsFileId}&play`
}

export function pickVideoFiles(fileStats = []) {
    return fileStats.filter((f) => {
        const ext = path.extname(f?.path || '').toLowerCase()
        return VIDEO_EXTENSIONS.has(ext) && (f?.length || 0) > 0
    })
}

/**
 * Resume offset for a sequentially-written file. Existing bytes are a
 * valid prefix because TorrServer streams are consumed front-to-back.
 */
export function computeResumeOffset(existingSize, fileLength) {
    if (!Number.isFinite(existingSize) || existingSize <= 0) return 0
    if (existingSize >= fileLength) return fileLength
    return existingSize
}

export function mapJobToStatusItem(job) {
    const totalSize = job.totalSize || 0
    const progress = totalSize > 0 ? Math.min(job.written / totalSize, 1) : 0
    const downloadSpeed = job.status === 'downloading' ? (job.speedBps || 0) : 0

    return {
        infoHash: job.infoHash,
        // A direct download has no name until TorrServer resolves metadata.
        name: job.name || job.infoHash,
        progress,
        isReady: job.status === 'done',
        downloaded: job.written,
        totalSize,
        downloadSpeed,
        uploadSpeed: 0,
        numPeers: job.peers || 0,
        connectedPeers: job.peers || 0,
        activePeers: job.peers || 0,
        knownPeers: job.peers || 0,
        queuedPeers: 0,
        eta: downloadSpeed > 0 ? Math.round((totalSize - job.written) / downloadSpeed) : null,
        backend: 'torrserve',
        error: job.error || null,
        files: (job.files || []).map((file, i) => ({
            name: path.basename(file.path),
            length: file.length,
            index: i
        }))
    }
}

// ─── TorrServer HTTP client ────────────────────────────────────

async function tsRequest(config, action, extra = {}, timeoutMs = 15000) {
    const res = await fetch(`${config.url}/torrents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
        signal: AbortSignal.timeout(timeoutMs)
    })
    if (!res.ok) throw new Error(`TorrServer ${action} HTTP ${res.status}`)
    const text = await res.text()
    try { return JSON.parse(text) } catch { return null }
}

export async function tsEcho(config = getTsConfig()) {
    try {
        const res = await fetch(`${config.url}/echo`, { signal: AbortSignal.timeout(5000) })
        if (!res.ok) return null
        return await res.text()
    } catch {
        return null
    }
}

async function tsAdd(config, magnet) {
    return tsRequest(config, 'add', { link: magnet })
}

async function tsGet(config, hash) {
    return tsRequest(config, 'get', { hash })
}

async function tsRemove(config, hash) {
    try {
        await tsRequest(config, 'rem', { hash })
    } catch (err) {
        log.warn('tsRemove failed', { hash, error: err.message })
    }
}

/** Wait until TorrServer resolves torrent metadata (file list). */
async function tsWaitFiles(config, hash, timeoutMs = 90000) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
        const stat = await tsGet(config, hash).catch(() => null)
        const files = stat?.file_stats || []
        if (files.length > 0) return stat
        await new Promise((resolve) => setTimeout(resolve, 3000))
    }
    throw new Error('TorrServer metadata timeout')
}

// ─── Job manager ───────────────────────────────────────────────

const jobs = new Map() // infoHash -> job
const engineAddedAt = new Map() // infoHash -> first-seen timestamp (for ageMs)

export function getTsDownloadStatusItems() {
    return Array.from(jobs.values()).map(mapJobToStatusItem)
}

/**
 * Where a finished job's file actually sits on disk.
 *
 * `getActiveTsJob` deliberately answers only while a job is downloading, so the
 * player gets redirected to TorrServer for the live bytes. Once the job is done
 * nothing answered for that infoHash at all: the native engine never existed,
 * and the local library indexes files under a synthetic sha1 of their path, so
 * the real hash missed and playback 404'd. The job record has known the exact
 * path all along.
 *
 * @returns {{name: string, length: number, absPath: string} | null}
 */
export function resolveFinishedTsFile(job, fileIndex, downloadPath) {
    if (!job || job.status !== 'done') return null

    const file = job.files?.[fileIndex]
    if (!file?.path) return null

    try {
        return {
            name: path.basename(file.path),
            length: file.length,
            absPath: safeJoinDownloadPath(downloadPath, file.path)
        }
    } catch {
        // safeJoinDownloadPath throws on traversal; a job that points outside
        // the download folder is not something to serve.
        return null
    }
}

/** Same, looked up by infoHash against the live job map. */
export function getFinishedTsFile(infoHash, fileIndex, downloadPath = process.env.DOWNLOAD_PATH || './downloads') {
    const job = jobs.get(infoHash?.toLowerCase?.() || infoHash)
    return resolveFinishedTsFile(job, fileIndex, downloadPath)
}

export function getActiveTsJob(infoHash) {
    const job = jobs.get(infoHash?.toLowerCase?.() || infoHash)
    return job && job.status === 'downloading' ? job : null
}

export function hasTsJob(infoHash) {
    return jobs.has(infoHash?.toLowerCase?.() || infoHash)
}

export function getTsJobsMetrics() {
    let downloading = 0
    let done = 0
    let failed = 0
    for (const job of jobs.values()) {
        if (job.status === 'downloading') downloading++
        else if (job.status === 'done') done++
        else failed++
    }
    return { downloading, done, failed }
}

async function persistJob(job) {
    db.data.tsDownloads ||= []
    const saved = { infoHash: job.infoHash, magnet: job.magnet, name: job.name, fresh: job.fresh }
    const index = db.data.tsDownloads.findIndex(j => j.infoHash === job.infoHash)
    if (index < 0) db.data.tsDownloads.push(saved)
    else db.data.tsDownloads[index] = saved
    await safeWrite(db)
}

async function unpersistJob(infoHash) {
    db.data.tsDownloads ||= []
    const before = db.data.tsDownloads.length
    db.data.tsDownloads = db.data.tsDownloads.filter((j) => j.infoHash !== infoHash)
    if (db.data.tsDownloads.length !== before) await safeWrite(db)
}

async function markCompletedInDb(job) {
    db.data.torrents ||= []
    if (!db.data.torrents.find((t) => t.magnet === job.magnet)) {
        db.data.torrents.push({
            magnet: job.magnet,
            name: job.name,
            addedAt: Date.now(),
            completed: true
        })
        await safeWrite(db)
    }
}

async function downloadFileFromTs(config, job, file) {
    const target = safeJoinDownloadPath(process.env.DOWNLOAD_PATH || './downloads', file.path)
    await fs.promises.mkdir(path.dirname(target), { recursive: true })
    let existingSize = 0
    try { existingSize = (await fs.promises.stat(target)).size } catch (err) {
        if (err.code !== 'ENOENT') throw err
    }
    // Oversized leftovers cannot represent a valid sequential prefix.
    let offset = existingSize > file.length ? 0 : computeResumeOffset(existingSize, file.length)
    if (offset === file.length) { job.written += offset; return }

    const aborter = new AbortController()
    const parentSignal = job.abortController?.signal
    const cancel = () => aborter.abort(parentSignal.reason)
    parentSignal?.throwIfAborted()
    parentSignal?.addEventListener('abort', cancel, { once: true })
    let idleTimer
    const resetIdle = () => {
        clearTimeout(idleTimer)
        idleTimer = setTimeout(() => aborter.abort(new Error('TorrServer stream stalled')), config.stallTimeoutMs)
    }
    let lastBytes = job.written
    let lastTick = Date.now()
    const speedTimer = setInterval(() => {
        const now = Date.now()
        job.speedBps = (job.written - lastBytes) * 1000 / Math.max(now - lastTick, 1)
        lastBytes = job.written
        lastTick = now
        notifyTorrentsChanged()
    }, 3000)
    resetIdle() // Covers waiting for response headers as well as a stalled body.
    try {
        const headers = offset > 0 ? { Range: 'bytes=' + offset + '-' } : {}
        const res = await fetch(buildTsStreamUrl(config.url, job.infoHash, file.tsId), { headers, signal: aborter.signal })
        if (!res.ok || !res.body) throw new Error('TS stream HTTP ' + res.status + ' for ' + file.path)
        if (res.status === 206) {
            const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(res.headers.get('content-range') || '')
            if (!range || Number(range[1]) !== offset || Number(range[2]) !== file.length - 1 || Number(range[3]) !== file.length) {
                throw new Error('Invalid TorrServer Content-Range')
            }
        } else if (res.status === 200) {
            offset = 0 // Upstream ignored Range: replace file with its complete response.
        } else throw new Error('Unexpected TorrServer stream status ' + res.status)

        const expected = file.length - offset
        let received = 0
        job.written += offset
        const count = new Transform({
            transform(chunk, encoding, callback) {
                received += chunk.length
                if (received > expected) return callback(new Error('TorrServer body exceeds expected length'))
                resetIdle()
                job.written += chunk.length
                callback(null, chunk)
            }
        })
        const output = fs.createWriteStream(target, { flags: offset > 0 ? 'r+' : 'w', start: offset })
        await pipeline(Readable.fromWeb(res.body), count, output, { signal: aborter.signal })
        if (received !== expected) throw new Error('Incomplete TorrServer body: ' + received + '/' + expected + ' bytes')
    } finally {
        clearTimeout(idleTimer)
        clearInterval(speedTimer)
        parentSignal?.removeEventListener('abort', cancel)
        aborter.abort()
        job.speedBps = 0
    }
}

async function runJob(config, job) {
    job.abortController = new AbortController()
    const signal = job.abortController.signal
    try {
        await tsAdd(config, job.magnet)
        const stat = await tsWaitFiles(config, job.infoHash)
        signal.throwIfAborted()
        const videos = pickVideoFiles(stat.file_stats)
        if (videos.length === 0) throw new Error('No video files in torrent')

        // TorrServer's name matches the files on disk; a magnet dn is only a placeholder.
        job.name = stat.name || stat.title || job.name || 'Unknown Torrent'
        job.files = videos.map((f) => ({ path: f.path, length: f.length, tsId: f.id }))
        job.totalSize = videos.reduce((sum, f) => sum + f.length, 0)
        job.written = 0

        // TorrServer confirmed working — now release the native engine.
        // Order matters: never leave the user with zero engines on a failure.
        await persistJob(job)
        signal.throwIfAborted()
        removeTorrent(job.infoHash, true)
        // Clear every sparse native file before any sequential transfer starts.
        // Persist the phase so interruption halfway through reset is safe to retry.
        if (job.fresh) {
            for (const file of job.files) {
                signal.throwIfAborted()
                await fs.promises.rm(safeJoinDownloadPath(process.env.DOWNLOAD_PATH || './downloads', file.path), { force: true })
            }
            signal.throwIfAborted()
            job.fresh = false
            await persistJob(job)
        }
        notifyTorrentsChanged()

        log.info('Failover download started', {
            hash: job.infoHash,
            name: job.name,
            files: job.files.length,
            totalMB: Math.round(job.totalSize / 1048576)
        })

        for (const file of job.files) {
            signal.throwIfAborted()
            const statSnapshot = await tsGet(config, job.infoHash).catch(() => null)
            job.peers = statSnapshot?.active_peers || job.peers || 0
            await downloadFileFromTs(config, job, file)
        }

        signal.throwIfAborted()
        await markCompletedInDb(job)
        job.status = 'done'
        job.written = job.totalSize
        await unpersistJob(job.infoHash)
        await tsRemove(config, job.infoHash)
        notifyTorrentsChanged()
        log.info('Failover download complete', { hash: job.infoHash, name: job.name })
    } catch (err) {
        if (signal.aborted) return
        job.failedAt = Date.now()
        job.status = 'error'
        job.error = err.message
        job.speedBps = 0
        await tsRemove(config, job.infoHash)
        notifyTorrentsChanged()
        log.error('Failover download failed', { hash: job.infoHash, error: err.message })
    }
}

export async function startFailover(item, config = getTsConfig()) {
    const infoHash = item.infoHash.toLowerCase()
    if (jobs.has(infoHash)) return jobs.get(infoHash)

    const activeJobs = getTsJobsMetrics().downloading
    if (activeJobs >= config.maxConcurrentJobs) {
        log.debug('Failover deferred: max concurrent jobs reached', { hash: infoHash })
        return null
    }

    const job = {
        infoHash,
        magnet: item.magnet,
        name: item.name,
        files: [],
        totalSize: item.totalSize || 0,
        written: 0,
        speedBps: 0,
        peers: 0,
        status: 'downloading',
        error: null,
        fresh: true, // discard sparse native partials before writing
        startedAt: Date.now()
    }
    jobs.set(infoHash, job)
    runJob(config, job) // fire-and-forget; job state is the source of truth
    return job
}

const MAGNET_HEX_HASH_RE = /urn:btih:([a-fA-F0-9]{40})/i

/** The magnet's `dn` display name, or null. */
export function extractMagnetName(magnet) {
    if (typeof magnet !== 'string') return null
    const query = magnet.slice(magnet.indexOf('?') + 1)
    return new URLSearchParams(query).get('dn') || null
}

export function extractMagnetHash(magnet) {
    const match = typeof magnet === 'string' ? magnet.match(MAGNET_HEX_HASH_RE) : null
    return match ? match[1].toLowerCase() : null
}

/**
 * Direct TorrServer download for magnets native can't even start
 * (metadata timeout: DHT-only swarms are unreachable for torrent-stream,
 * while anacrolix resolves them in seconds — measured 15s vs 270s timeout).
 */
/**
 * Hand a magnet the native engine could not resolve over to TorrServer.
 *
 * Throws instead of returning null: this runs as the last-resort fallback
 * inside /api/add, and a silent null made an unreachable sidecar look like
 * a plain native failure. The whole safety net was down for days before
 * anyone noticed.
 */
export async function startDirectTsDownload(magnet, config = getTsConfig()) {
    if (!config.enabled) throw new Error('TorrServer failover is disabled (TS_FAILOVER=0)')

    const infoHash = extractMagnetHash(magnet)
    if (!infoHash) throw new Error('Cannot extract infoHash from magnet')

    if (!(await tsEcho(config))) {
        throw new Error(`TorrServer unreachable at ${config.url} — check that its port is published`)
    }

    log.info('Native metadata failed → direct TorrServer download', { hash: infoHash })
    return startFailover({ infoHash, magnet, name: extractMagnetName(magnet) }, config)
}

/** Returns the removed job (so the caller can clean its files), or null. */
export function removeTsJob(infoHash) {
    const hash = infoHash?.toLowerCase?.() || infoHash
    const job = jobs.get(hash)
    if (!job) return null
    job.abortController?.abort(new Error('Download cancelled'))
    jobs.delete(hash)
    unpersistJob(hash).catch(() => {})
    tsRemove(getTsConfig(), hash)
    notifyTorrentsChanged()
    return job
}

/**
 * Top-level download-folder entries a job wrote to — the same unit the local
 * library shows as one card and a native hard delete removes.
 * @returns {{name: string, absPath: string}[]}
 */
export function getTsJobDiskEntries(job, downloadPath) {
    const entries = new Map()
    for (const file of job?.files || []) {
        const name = String(file?.path || '').split(/[\\/]/)[0]
        if (!name || entries.has(name)) continue
        try {
            entries.set(name, { name, absPath: safeJoinDownloadPath(downloadPath, name) })
        } catch {
            // Traversal attempt — never delete outside the download folder.
        }
    }
    return [...entries.values()]
}

/** db.torrents without the rows for this infoHash (btih only, never tracker URLs). */
export function withoutTorrentRows(rows = [], infoHash) {
    return rows.filter(row => !isMagnetHashMatch(row?.magnet, infoHash))
}

// ─── Watchdog ──────────────────────────────────────────────────

let watchdogTimer = null
let tsAvailable = false

function findMagnetForHash(infoHash) {
    const hashLower = infoHash.toLowerCase()
    return db.data.torrents?.find((t) => t.magnet.toLowerCase().includes(hashLower))?.magnet || null
}

async function watchdogTick(config) {
    const echo = await tsEcho(config)
    tsAvailable = Boolean(echo)
    if (!tsAvailable) return

    const now = Date.now()
    // Migrated jobs no longer have a native engine. Retry them independently.
    for (const job of jobs.values()) {
        if (job.status !== 'error' || now - (job.failedAt ?? job.startedAt) < 10 * 60 * 1000) continue
        if (getTsJobsMetrics().downloading >= config.maxConcurrentJobs) break
        job.status = 'downloading'
        job.error = null
        job.startedAt = now
        runJob(config, job)
    }
    for (const item of getAllTorrents()) {
        const hash = item.infoHash?.toLowerCase()
        if (!hash) continue

        if (jobs.has(hash)) continue

        if (!engineAddedAt.has(hash)) {
            engineAddedAt.set(hash, now)
            continue
        }

        const candidate = {
            ...item,
            ageMs: now - engineAddedAt.get(hash),
            streaming: isStreamActive(hash)
        }

        if (evaluateDownloadFailover(candidate, config)) {
            const magnet = findMagnetForHash(hash)
            if (!magnet) {
                log.warn('Failover skipped: magnet not found in DB', { hash })
                continue
            }
            log.info('Slow download detected → migrating to TorrServer', {
                hash,
                name: item.name,
                speedKBs: Math.round((item.downloadSpeed || 0) / 1024)
            })
            await startFailover({ ...candidate, magnet }, config)
        }
    }

    // Forget engines that disappeared (completed/removed)
    const liveHashes = new Set(getAllTorrents().map((t) => t.infoHash?.toLowerCase()))
    for (const hash of engineAddedAt.keys()) {
        if (!liveHashes.has(hash)) engineAddedAt.delete(hash)
    }
}

export function isTsAvailable() {
    return tsAvailable
}

export async function restoreTsDownloads(config = getTsConfig()) {
    const persisted = db.data.tsDownloads || []
    for (const saved of persisted) {
        if (jobs.has(saved.infoHash)) continue
        log.info('Resuming TorrServer download after restart', { hash: saved.infoHash, name: saved.name })
        const job = {
            infoHash: saved.infoHash,
            magnet: saved.magnet,
            name: saved.name,
            files: [],
            totalSize: 0,
            written: 0,
            speedBps: 0,
            peers: 0,
            status: 'downloading',
            error: null,
            fresh: saved.fresh === true, // older saved jobs were sequential; newer jobs record reset phase
            startedAt: Date.now()
        }
        jobs.set(saved.infoHash, job)
        runJob(config, job)
    }
}

export function initTsFailover(config = getTsConfig()) {
    if (!config.enabled) {
        log.info('TorrServer failover disabled (TS_FAILOVER=0)')
        return
    }
    if (watchdogTimer) return

    watchdogTimer = setInterval(() => {
        watchdogTick(config).catch((err) => {
            log.warn('Watchdog tick failed', { error: err.message })
        })
    }, config.checkIntervalMs)
    if (watchdogTimer.unref) watchdogTimer.unref()

    tsEcho(config).then((version) => {
        tsAvailable = Boolean(version)
        log.info('TorrServer failover armed', {
            url: config.url,
            available: tsAvailable,
            version: version || 'unreachable'
        })
        if (tsAvailable) restoreTsDownloads(config).catch(err => log.warn('Download restore failed', { error: err.message }))
    })
}

export function stopTsFailover() {
    if (watchdogTimer) {
        clearInterval(watchdogTimer)
        watchdogTimer = null
    }
}
