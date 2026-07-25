// ────────────────────────────────────────────────────────
// Stream + System Monitor (playback diagnostics)
//
// Answers "почему тормозит": while a stream is active, samples NAS
// system load (CPU / RAM / disk read) and the real bytes/sec delivered
// to the player into a ring buffer. After playback the client renders a
// mini-graph so a freeze can be correlated with a CPU spike, a disk-read
// dip, or a delivery (throughput) drop.
//
// Three consumers:
//   getStreamMetrics()   → per-hash live stats for /api/status
//   getSystemSnapshot()  → instant NAS load for /api/system
//   getSessionTimeline() → ring buffer for /api/session-timeline (graph)
// ────────────────────────────────────────────────────────
import os from 'os'
import fs from 'fs'
import { monitorEventLoopDelay, performance } from 'perf_hooks'
import { createSystemPressureReader } from './diagnostics/systemPressure.js'
import { createOperationTracker } from './diagnostics/operationTracker.js'

const SAMPLE_INTERVAL_MS = parseInt(process.env.MONITOR_SAMPLE_MS, 10) || 2000
const TIMELINE_MAX = parseInt(process.env.MONITOR_TIMELINE_MAX, 10) || 900 // ~30min @2s
const THROUGHPUT_WINDOW_MS = 5000 // smoothing window for per-stream Bps

// infoHash -> live stats
const streams = new Map()
// ring buffer of system+delivery samples
const timeline = []

let samplerId = null
let prevCpu = null
let prevDiskSectors = null
let prevDiskAt = 0
const readSystemPressure = createSystemPressureReader()
const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 })
const operationTracker = createOperationTracker()

function nsToMs(value) {
    return Number.isFinite(value) ? Math.round((value / 1e6) * 100) / 100 : 0
}

function readEventLoopWindow() {
    const result = {
        p99Ms: nsToMs(eventLoopDelay.percentile(99)),
        maxMs: nsToMs(eventLoopDelay.max)
    }
    eventLoopDelay.reset()
    return result
}

export function buildRuntimePressureFields({ memory, resources, eventLoop, host }) {
    const toMB = value => Math.round(Number(value || 0) / 1024 / 1024)
    return {
        rssMB: toMB(memory.rss),
        heapUsedMB: toMB(memory.heapUsed),
        heapTotalMB: toMB(memory.heapTotal),
        externalMB: toMB(memory.external),
        arrayBuffersMB: toMB(memory.arrayBuffers),
        processMajorFaults: Number(resources.majorPageFault || 0),
        processMinorFaults: Number(resources.minorPageFault || 0),
        eventLoopP99Ms: Number(eventLoop.p99Ms || 0),
        eventLoopMaxMs: Number(eventLoop.maxMs || 0),
        memAvailableMB: host?.memAvailableMB ?? null,
        swapUsedMB: host?.swapUsedMB ?? null,
        swapInPagesPerSec: host?.swapInPagesPerSec ?? null,
        swapOutPagesPerSec: host?.swapOutPagesPerSec ?? null,
        hostMajorFaultsPerSec: host?.majorFaultsPerSec ?? null,
        iowaitPct: host?.iowaitPct ?? null
    }
}

// ── CPU ──────────────────────────────────────────────────
function readCpu() {
    const cpus = os.cpus() || []
    let idle = 0
    let total = 0
    for (const c of cpus) {
        for (const v of Object.values(c.times)) total += v
        idle += c.times.idle
    }
    return { idle, total }
}

function cpuPercentDelta() {
    const cur = readCpu()
    if (!prevCpu) { prevCpu = cur; return 0 }
    const idleDiff = cur.idle - prevCpu.idle
    const totalDiff = cur.total - prevCpu.total
    prevCpu = cur
    if (totalDiff <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100)))
}

// ── Disk read (Linux /proc/diskstats) ────────────────────
// Sums whole-disk physical devices (skip partitions/dm/md to avoid double
// counting). Sectors are 512 bytes. Best-effort: null if unreadable.
function readDiskSectors() {
    try {
        const txt = fs.readFileSync('/proc/diskstats', 'utf8')
        let sectors = 0
        for (const line of txt.split('\n')) {
            const p = line.trim().split(/\s+/)
            if (p.length < 6) continue
            const name = p[2]
            if (!/^(sd[a-z]+|sata\d+|nvme\d+n\d+|hd[a-z]+|vd[a-z]+)$/.test(name)) continue
            sectors += parseInt(p[5], 10) || 0
        }
        return sectors
    } catch {
        return null
    }
}

function diskReadMBs() {
    const now = Date.now()
    const sectors = readDiskSectors()
    if (sectors == null) return null
    if (prevDiskSectors == null || now <= prevDiskAt) {
        prevDiskSectors = sectors
        prevDiskAt = now
        return 0
    }
    const bytes = (sectors - prevDiskSectors) * 512
    const secs = (now - prevDiskAt) / 1000
    prevDiskSectors = sectors
    prevDiskAt = now
    if (secs <= 0) return 0
    return Math.max(0, +(bytes / 1024 / 1024 / secs).toFixed(2))
}

// ── Sampler lifecycle ────────────────────────────────────
function startSampler() {
    if (samplerId) return
    prevCpu = readCpu()
    prevDiskSectors = readDiskSectors()
    prevDiskAt = Date.now()
    eventLoopDelay.reset()
    eventLoopDelay.enable()
    samplerId = setInterval(sample, SAMPLE_INTERVAL_MS)
    if (samplerId.unref) samplerId.unref()
}

function stopSampler() {
    if (!samplerId) return
    clearInterval(samplerId)
    samplerId = null
    eventLoopDelay.disable()
}

function sample() {
    const sampleStartedAt = performance.now()
    const runtimePressure = buildRuntimePressureFields({
        memory: process.memoryUsage(),
        resources: process.resourceUsage(),
        eventLoop: readEventLoopWindow(),
        host: readSystemPressure()
    })
    const cpuPct = cpuPercentDelta()
    const diskRead = diskReadMBs()
    const load1 = (os.loadavg()[0] || 0)
    const freeMB = Math.round(os.freemem() / 1024 / 1024)
    const totalMB = Math.round(os.totalmem() / 1024 / 1024)

    // Per-stream delivery throughput (drain each stream's window byte counter).
    let streamBps = 0
    let activeConns = 0
    for (const s of streams.values()) {
        activeConns += s.activeConns
        const bps = s.windowBytes / (SAMPLE_INTERVAL_MS / 1000)
        s.throughputBps = Math.round(bps)
        s.windowBytes = 0
        streamBps += bps
    }

    timeline.push({
        t: Date.now(),
        cpuPct,
        load1: +load1.toFixed(2),
        ramUsedMB: totalMB - freeMB,
        ramTotalMB: totalMB,
        diskReadMBs: diskRead,
        streamMBs: +(streamBps / 1024 / 1024).toFixed(2),
        activeStreams: activeConns,
        operationMarkers: operationTracker.drain(),
        activeOperations: operationTracker.activeCount(),
        ...runtimePressure,
        samplerDurationMs: Math.round((performance.now() - sampleStartedAt) * 100) / 100
    })
    if (timeline.length > TIMELINE_MAX) timeline.shift()

    // No active connections or diagnostic operations → stop sampling (saves idle CPU).
    if (activeConns === 0 && operationTracker.activeCount() === 0) stopSampler()
}

export function startDiagnosticOperation(name, metadata = {}) {
    const id = operationTracker.start(name, metadata)
    startSampler()
    return id
}

export function finishDiagnosticOperation(id, outcome = {}) {
    return operationTracker.finish(id, outcome)
}

// ── Public: stream lifecycle hooks (called from /stream handler) ──
export function openStream(infoHash, { fromDisk = false, fileName = '', fileLength = 0 } = {}) {
    let s = streams.get(infoHash)
    if (!s) {
        s = {
            infoHash,
            fileName,
            fileLength,
            fromDisk,
            reopenCount: 0,
            bytesServed: 0,
            windowBytes: 0,
            throughputBps: 0,
            stallCount: 0,
            activeConns: 0,
            firstOpenAt: Date.now(),
            lastByteAt: 0
        }
        streams.set(infoHash, s)
    }
    s.reopenCount++
    s.activeConns++
    s.fromDisk = fromDisk
    if (fileName) s.fileName = fileName
    if (fileLength) s.fileLength = fileLength
    startSampler()
    return infoHash
}

export function recordBytes(infoHash, n) {
    const s = streams.get(infoHash)
    if (!s) return
    s.bytesServed += n
    s.windowBytes += n
    s.lastByteAt = Date.now()
}

export function recordStall(infoHash) {
    const s = streams.get(infoHash)
    if (s) s.stallCount++
}

export function closeStream(infoHash) {
    const s = streams.get(infoHash)
    if (!s) return
    s.activeConns = Math.max(0, s.activeConns - 1)
    // Keep the entry (with cumulative reopen/stall counts) for post-session
    // inspection; it's cheap and resets when a new file is opened on restart.
}

// ── Public: getters ──────────────────────────────────────
export function getStreamMetrics() {
    const out = []
    for (const s of streams.values()) {
        out.push({
            infoHash: s.infoHash,
            fileName: s.fileName,
            fromDisk: s.fromDisk,
            active: s.activeConns > 0,
            reopenCount: s.reopenCount,
            stallCount: s.stallCount,
            throughputMBs: +(s.throughputBps / 1024 / 1024).toFixed(2),
            servedMB: +(s.bytesServed / 1024 / 1024).toFixed(1)
        })
    }
    return out
}

export function getSystemSnapshot() {
    const freeMB = Math.round(os.freemem() / 1024 / 1024)
    const totalMB = Math.round(os.totalmem() / 1024 / 1024)
    const load = os.loadavg()
    const cores = (os.cpus() || []).length
    return {
        cpuCores: cores,
        load1: +(load[0] || 0).toFixed(2),
        load5: +(load[1] || 0).toFixed(2),
        load15: +(load[2] || 0).toFixed(2),
        // load per core > 1.0 = the box is oversubscribed (other containers too)
        loadPerCore: cores ? +((load[0] || 0) / cores).toFixed(2) : 0,
        ramUsedMB: totalMB - freeMB,
        ramTotalMB: totalMB,
        diskReadMBs: timeline.length ? timeline[timeline.length - 1].diskReadMBs : null,
        activeStreams: [...streams.values()].reduce((a, s) => a + s.activeConns, 0),
        sampling: Boolean(samplerId)
    }
}

export function getSessionTimeline(limit = TIMELINE_MAX) {
    const n = Math.min(limit, timeline.length)
    return timeline.slice(timeline.length - n)
}
