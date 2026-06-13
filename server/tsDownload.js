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
import path from 'path'
import { db, safeWrite } from './db.js'
import { safeJoinDownloadPath } from './utils/filePath.js'
import {
    getAllTorrents,
    removeTorrent,
    notifyTorrentsChanged
} from './torrent.js'
import { logger } from './utils/logger.js'

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
        stallTimeoutMs: parseInt(env.TS_FAILOVER_STALL_MS || String(30 * 60 * 1000), 10)
    }
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.m4v', '.mov', '.webm', '.ts', '.m2ts', '.wmv', '.flv'])

// ─── Pure helpers (unit-tested) ────────────────────────────────

/**
 * Decide whether a native download should be migrated to TorrServer.
 * @param {Object} item - status item from getAllTorrents()
 * @param {number} item.ageMs - time since the engine was added
 */
export function evaluateDownloadFailover(item, config = getTsConfig()) {
    if (!config.enabled) return false
    if (!item || !item.infoHash) return false
    if (item.isReady || (item.progress || 0) >= 0.99) return false
    if ((item.ageMs || 0) < config.graceMs) return false
    // Metadata not resolved yet → nothing to compare, let native keep trying
    if (!item.totalSize) return false
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
        name: job.name,
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
    const existing = db.data.tsDownloads.find((j) => j.infoHash === job.infoHash)
    if (!existing) {
        db.data.tsDownloads.push({ infoHash: job.infoHash, magnet: job.magnet, name: job.name })
        await safeWrite(db)
    }
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
    const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
    // TorrServer file paths already include the torrent folder name
    const target = safeJoinDownloadPath(downloadPath, file.path)
    await fs.promises.mkdir(path.dirname(target), { recursive: true })

    // Migrated jobs start clean: the native engine wrote pieces at sparse
    // offsets, so file size ≠ valid sequential prefix. Resume-by-size is
    // only safe for files this module wrote itself (restart of a TS job).
    if (job.fresh) {
        await fs.promises.rm(target, { force: true })
    }

    let existingSize = 0
    try {
        existingSize = (await fs.promises.stat(target)).size
    } catch { /* file does not exist yet */ }

    const offset = computeResumeOffset(existingSize, file.length)
    if (offset >= file.length) {
        job.written += file.length
        return
    }
    job.written += offset

    const url = buildTsStreamUrl(config.url, job.infoHash, file.tsId)
    const headers = offset > 0 ? { Range: `bytes=${offset}-` } : {}
    // Stall guard: a dead swarm leaves the fetch body hanging forever.
    // Abort after stallTimeoutMs without bytes — job goes to 'error' and the
    // watchdog may retry the migration after its cooldown.
    const aborter = new AbortController()
    const res = await fetch(url, { headers, signal: aborter.signal })
    if (!res.ok || !res.body) {
        throw new Error(`TS stream HTTP ${res.status} for ${file.path}`)
    }

    const writeStream = fs.createWriteStream(target, { flags: offset > 0 ? 'r+' : 'w', start: offset })
    let lastBytes = job.written
    let lastTick = Date.now()
    let lastProgressAt = Date.now()
    const speedTimer = setInterval(() => {
        const now = Date.now()
        if (job.written > lastBytes) lastProgressAt = now
        if (now - lastProgressAt > config.stallTimeoutMs) {
            aborter.abort(new Error(`No data from TorrServer for ${Math.round(config.stallTimeoutMs / 60000)}min`))
            return
        }
        job.speedBps = ((job.written - lastBytes) * 1000) / Math.max(now - lastTick, 1)
        lastBytes = job.written
        lastTick = now
        notifyTorrentsChanged()
    }, 3000)

    try {
        for await (const chunk of res.body) {
            // Respect backpressure: without the drain wait a fast swarm and
            // a slow HDD balloon RSS with buffered chunks.
            if (!writeStream.write(chunk)) {
                await new Promise((resolve) => writeStream.once('drain', resolve))
            }
            job.written += chunk.length
        }
        await new Promise((resolve, reject) => {
            writeStream.end((err) => (err ? reject(err) : resolve()))
        })
    } finally {
        clearInterval(speedTimer)
        job.speedBps = 0
        if (!writeStream.writableEnded) writeStream.destroy()
    }
}

async function runJob(config, job) {
    try {
        await tsAdd(config, job.magnet)
        const stat = await tsWaitFiles(config, job.infoHash)
        const videos = pickVideoFiles(stat.file_stats)
        if (videos.length === 0) throw new Error('No video files in torrent')

        job.name = job.name || stat.name || stat.title || 'Unknown Torrent'
        job.files = videos.map((f) => ({ path: f.path, length: f.length, tsId: f.id }))
        job.totalSize = videos.reduce((sum, f) => sum + f.length, 0)
        job.written = 0

        // TorrServer confirmed working — now release the native engine.
        // Order matters: never leave the user with zero engines on a failure.
        removeTorrent(job.infoHash, true)
        await persistJob(job)
        notifyTorrentsChanged()

        log.info('Failover download started', {
            hash: job.infoHash,
            name: job.name,
            files: job.files.length,
            totalMB: Math.round(job.totalSize / 1048576)
        })

        for (const file of job.files) {
            const statSnapshot = await tsGet(config, job.infoHash).catch(() => null)
            job.peers = statSnapshot?.active_peers || job.peers || 0
            await downloadFileFromTs(config, job, file)
        }

        job.status = 'done'
        job.written = job.totalSize
        await markCompletedInDb(job)
        await unpersistJob(job.infoHash)
        await tsRemove(config, job.infoHash)
        notifyTorrentsChanged()
        log.info('Failover download complete', { hash: job.infoHash, name: job.name })
    } catch (err) {
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

export function extractMagnetHash(magnet) {
    const match = typeof magnet === 'string' ? magnet.match(MAGNET_HEX_HASH_RE) : null
    return match ? match[1].toLowerCase() : null
}

/**
 * Direct TorrServer download for magnets native can't even start
 * (metadata timeout: DHT-only swarms are unreachable for torrent-stream,
 * while anacrolix resolves them in seconds — measured 15s vs 270s timeout).
 */
export async function startDirectTsDownload(magnet, config = getTsConfig()) {
    if (!config.enabled) return null
    const infoHash = extractMagnetHash(magnet)
    if (!infoHash) return null
    if (!(await tsEcho(config))) return null

    log.info('Native metadata failed → direct TorrServer download', { hash: infoHash })
    return startFailover({ infoHash, magnet, name: null }, config)
}

export function removeTsJob(infoHash) {
    const hash = infoHash?.toLowerCase?.() || infoHash
    const job = jobs.get(hash)
    if (!job) return false
    jobs.delete(hash)
    unpersistJob(hash).catch(() => {})
    tsRemove(getTsConfig(), hash)
    notifyTorrentsChanged()
    return true
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
    for (const item of getAllTorrents()) {
        const hash = item.infoHash?.toLowerCase()
        if (!hash) continue

        const existingJob = jobs.get(hash)
        if (existingJob) {
            // A failed migration must not block retries forever — the swarm
            // (or TorrServer) may recover. Native kept downloading meanwhile.
            const RETRY_ERRORED_AFTER_MS = 10 * 60 * 1000
            if (existingJob.status === 'error' && now - existingJob.startedAt > RETRY_ERRORED_AFTER_MS) {
                jobs.delete(hash)
            } else {
                continue
            }
        }

        if (!engineAddedAt.has(hash)) {
            engineAddedAt.set(hash, now)
            continue
        }

        const candidate = {
            ...item,
            ageMs: now - engineAddedAt.get(hash)
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
            fresh: false, // our own sequential writes — resume by size
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
        if (tsAvailable) restoreTsDownloads(config)
    })
}

export function stopTsFailover() {
    if (watchdogTimer) {
        clearInterval(watchdogTimer)
        watchdogTimer = null
    }
}
