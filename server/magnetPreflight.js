/**
 * magnetPreflight.js — Lightweight magnet liveness probe
 * STAB-F: Check if magnet has real peers in swarm before ranking
 *
 * Uses torrent-stream in probe mode: metadata + peer discovery only,
 * no file download. Destroys engine immediately after probe.
 *
 * Feature flag: MAGNET_PREFLIGHT_ENABLED=1 (default: enabled)
 */

import torrentStream from 'torrent-stream'
import { logger } from './utils/logger.js'

const log = logger.child('Preflight')

// --- Configuration ---
const PROBE_TIMEOUT_MS = parseInt(process.env.PREFLIGHT_TIMEOUT_MS || '8000', 10)
const MAX_CONCURRENCY = parseInt(process.env.PREFLIGHT_CONCURRENCY || '3', 10)
const TOP_N = parseInt(process.env.PREFLIGHT_TOP_N || '8', 10)
const PREFLIGHT_TOTAL_BUDGET_MS = parseInt(process.env.PREFLIGHT_TOTAL_BUDGET_MS || '3000', 10)
const CACHE_TTL_MS = parseInt(process.env.PREFLIGHT_CACHE_TTL_MS || '60000', 10) // default 60s

// Same public trackers as torrent.js for consistency
const PUBLIC_TRACKERS = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://tracker.tiny-vps.com:6969/announce',
    'udp://tracker.cyberia.is:6969/announce',
    'udp://tracker.moeking.me:6969/announce',
    'udp://p4p.arenabg.com:1337/announce',
    'udp://explodie.org:6969/announce',
    'http://tracker.gbitt.info:80/announce'
]

// --- Preflight cache ---
const preflightCache = new Map() // infoHash -> { status, peers, checkedAt, durationMs }
const MAX_CACHE_SIZE = 200

function getCached(infoHash) {
    const entry = preflightCache.get(infoHash)
    if (!entry) return null
    if (Date.now() - entry.checkedAt > CACHE_TTL_MS) {
        preflightCache.delete(infoHash)
        return null
    }
    return entry
}

function setCache(infoHash, result) {
    if (preflightCache.size > MAX_CACHE_SIZE) {
        // Evict oldest 10%
        const entries = [...preflightCache.entries()]
            .sort((a, b) => a[1].checkedAt - b[1].checkedAt)
        const evictCount = Math.ceil(MAX_CACHE_SIZE * 0.1)
        for (let i = 0; i < evictCount; i++) {
            preflightCache.delete(entries[i][0])
        }
    }
    preflightCache.set(infoHash, result)
}

// --- Extract infoHash from magnet ---
function extractInfoHash(magnet) {
    if (!magnet) return null
    const hexMatch = magnet.match(/urn:btih:([a-fA-F0-9]{40})/i)
    if (hexMatch) return hexMatch[1].toLowerCase()
    const base32Match = magnet.match(/urn:btih:([A-Z2-7]{32})/i)
    if (base32Match) return base32Match[1].toLowerCase()
    return null
}

// --- Enrich magnet with public trackers ---
function enrichMagnet(magnet) {
    if (!magnet || !magnet.startsWith('magnet:?')) return magnet
    const extra = PUBLIC_TRACKERS
        .filter(tr => !magnet.includes(encodeURIComponent(tr)))
        .map(tr => `&tr=${encodeURIComponent(tr)}`)
        .join('')
    return magnet + extra
}

/**
 * Probe a single magnet for peer availability
 * @param {string} magnet - Magnet URI
 * @returns {Promise<{status: string, peers: number, durationMs: number}>}
 */
export function probeMagnet(magnet) {
    return new Promise((resolve) => {
        const start = Date.now()
        const enriched = enrichMagnet(magnet)

        let engine
        let resolved = false

        function finish(status, peers) {
            if (resolved) return
            resolved = true
            const durationMs = Date.now() - start
            try { engine?.destroy() } catch (_) { /* ignore */ }
            resolve({ status, peers, durationMs })
        }

        try {
            engine = torrentStream(enriched, {
                path: '/tmp/preflight-probe', // Temp, no real download
                connections: 10,              // Lightweight
                uploads: 0,
                dht: true,
                verify: false,
                tracker: true
            })
        } catch (err) {
            log.debug('Engine create failed', { error: err.message })
            return finish('dead', 0)
        }

        // Timeout
        const timeoutId = setTimeout(() => {
            const peers = engine?.swarm?.wires?.length || 0
            if (peers > 0) {
                finish('playable', peers)
            } else {
                finish('dead', 0)
            }
        }, PROBE_TIMEOUT_MS)

        // On ready (metadata received = good sign, but check peers)
        engine.on('ready', () => {
            clearTimeout(timeoutId)
            const peers = engine.swarm?.wires?.length || 0
            log.debug('Probe ready', { magnet: magnet.slice(0, 40), peers }) // Log ready state
            if (peers > 0) {
                finish('playable', peers)
            } else {
                // Metadata received but no download peers yet — risky
                finish('risky', 0)
            }
        })

        // Check periodically for early peer detection
        const checkInterval = setInterval(() => {
            if (resolved) {
                clearInterval(checkInterval)
                return
            }
            const peers = engine?.swarm?.wires?.length || 0
            if (peers >= 2) {
                clearTimeout(timeoutId)
                clearInterval(checkInterval)
                finish('playable', peers)
            }
        }, 1500)

        engine.on('error', () => {
            clearTimeout(timeoutId)
            clearInterval(checkInterval)
            finish('dead', 0)
        })
    })
}

/**
 * Run limited-concurrency preflight on an array of promises
 */
async function runWithConcurrency(tasks, concurrency) {
    const results = new Array(tasks.length)
    let nextIndex = 0

    async function worker() {
        while (nextIndex < tasks.length) {
            const idx = nextIndex++
            results[idx] = await tasks[idx]()
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
    await Promise.all(workers)
    return results
}

/**
 * Preflight top-N results from search output
 * Adds playabilityStatus, playabilityScore, and preflight data to each result.
 * Results without magnet (e.g. RuTracker) get status 'unknown'.
 *
 * @param {Array} results - Search results from aggregator
 * @returns {Promise<Array>} Results enriched with preflight data, sorted by playability
 */
export async function preflightResults(results, options = {}) {
    if (!results || results.length === 0) return results

    const enabled = options.enabled ?? (process.env.MAGNET_PREFLIGHT_ENABLED !== '0')
    if (!enabled) {
        // Feature disabled — return as-is with unknown status
        return results.map(r => ({
            ...r,
            playabilityStatus: 'unknown',
            playabilityScore: 0,
            preflight: null
        }))
    }

    // Preflight top-N by seeders (not by provider arrival order)
    const topN = Number.isFinite(options.topN) ? options.topN : TOP_N
    const concurrency = Number.isFinite(options.concurrency) ? options.concurrency : MAX_CONCURRENCY
    const totalBudgetMs = Number.isFinite(options.totalBudgetMs) ? options.totalBudgetMs : PREFLIGHT_TOTAL_BUDGET_MS
    const probe = options.probe || probeMagnet

    const magnetCandidates = results
        .map((result, index) => ({ index, result }))
        .filter(({ result }) => !!result.magnet)
        .sort((a, b) => (b.result.seeders || 0) - (a.result.seeders || 0))

    const withMagnet = magnetCandidates.slice(0, topN)
    const probeIndexes = new Set(withMagnet.map(x => x.index))
    const withoutMagnet = []
    for (let i = 0; i < results.length; i++) {
        if (!probeIndexes.has(i)) withoutMagnet.push(i)
    }

    log.info('Starting preflight', { total: results.length, probing: withMagnet.length, topN: topN, budgetMs: totalBudgetMs })
    const probeStart = Date.now()
    const probeResults = new Array(withMagnet.length).fill(null)

    // Build probe tasks (using cache where possible)
    const tasks = withMagnet.map(({ result }, idx) => {
        const infoHash = extractInfoHash(result.magnet)
        const cached = infoHash ? getCached(infoHash) : null
        if (cached) {
            return async () => {
                const entry = { ...cached, source: 'cache' }
                probeResults[idx] = entry
                return entry
            }
        }
        return () => probe(result.magnet).then(probeResult => {
            const entry = {
                status: probeResult.status,
                peers: probeResult.peers,
                checkedAt: Date.now(),
                durationMs: probeResult.durationMs,
                source: 'probe'
            }
            if (infoHash) setCache(infoHash, entry)
            probeResults[idx] = entry
            return entry
        })
    })

    // Best-effort probing: keep partial results if the batch exceeds the search budget.
    let timedOut = false
    const guardedRun = runWithConcurrency(tasks, concurrency).catch((error) => {
        log.warn('Preflight worker failed', { error: error?.message || String(error) })
        return null
    })

    if (totalBudgetMs > 0) {
        await Promise.race([
            guardedRun,
            new Promise((resolve) => setTimeout(() => {
                timedOut = true
                resolve()
            }, totalBudgetMs))
        ])
    } else {
        await guardedRun
    }

    const totalDurationMs = Date.now() - probeStart
    const completedProbeResults = probeResults.filter(Boolean)

    log.info('Preflight complete', {
        probed: completedProbeResults.length,
        totalMs: totalDurationMs,
        playable: completedProbeResults.filter(r => r.status === 'playable').length,
        risky: completedProbeResults.filter(r => r.status === 'risky').length,
        dead: completedProbeResults.filter(r => r.status === 'dead').length
    })
    if (timedOut) {
        log.warn('Preflight budget exceeded', {
            budgetMs: totalBudgetMs,
            completed: completedProbeResults.length,
            requested: withMagnet.length
        })
    }

    // Enrich results with preflight data
    const enriched = results.map((result, idx) => ({ ...result }))

    for (let i = 0; i < withMagnet.length; i++) {
        const { index } = withMagnet[i]
        const probe = probeResults[i]
        if (!probe) {
            enriched[index].playabilityStatus = enriched[index].magnet ? 'unchecked' : 'unknown'
            enriched[index].playabilityScore = enriched[index].magnet ? calcScore(enriched[index], null) : -1
            enriched[index].preflight = null
            continue
        }
        enriched[index].playabilityStatus = probe.status
        enriched[index].playabilityScore = calcScore(enriched[index], probe)
        enriched[index].preflight = {
            peers: probe.peers,
            checkedAt: probe.checkedAt,
            durationMs: probe.durationMs,
            source: probe.source || 'probe'
        }
    }

    // Mark results without preflight
    for (const idx of withoutMagnet) {
        enriched[idx].playabilityStatus = enriched[idx].magnet ? 'unchecked' : 'unknown'
        enriched[idx].playabilityScore = enriched[idx].magnet ? calcScore(enriched[idx], null) : -1
        enriched[idx].preflight = null
    }

    // Sort: playable first, then risky, then unchecked, then dead, then unknown
    enriched.sort((a, b) => b.playabilityScore - a.playabilityScore)

    return enriched
}

/**
 * Calculate composite playability score
 * Higher = better. Used for sorting.
 */
function calcScore(result, probe) {
    let score = 0

    // Preflight status weight (dominant factor)
    if (probe?.status === 'playable') score += 1000
    else if (probe?.status === 'risky') {
        // risky with 0 peers is often stale index data; rank below unchecked
        score += (probe?.peers || 0) > 0 ? 450 : 120
    }
    else if (probe?.status === 'dead') score += 0
    else score += 200 // unchecked — neutral

    // Peer count bonus (from probe)
    if (probe?.peers) {
        score += Math.min(probe.peers * 10, 200) // cap at 200
    }

    // Seeders bonus (from index metadata)
    const seeders = result.seeders || 0
    if (seeders >= 50) score += 100
    else if (seeders >= 10) score += 50
    else if (seeders >= 1) score += 10

    // Size preference: larger files often = better quality
    const sizeGB = (result.sizeBytes || 0) / (1024 ** 3)
    if (sizeGB >= 5) score += 30   // 4K-sized
    else if (sizeGB >= 1) score += 15

    return score
}

/**
 * Get preflight cache stats (for diagnostics)
 */
export function getPreflightStats() {
    let active = 0
    let expired = 0
    const now = Date.now()
    for (const entry of preflightCache.values()) {
        if (now - entry.checkedAt > CACHE_TTL_MS) expired++
        else active++
    }
    return {
        enabled: process.env.MAGNET_PREFLIGHT_ENABLED !== '0',
        cacheSize: preflightCache.size,
        activeCacheEntries: active,
        expiredCacheEntries: expired,
        config: {
            probeTimeoutMs: PROBE_TIMEOUT_MS,
            maxConcurrency: MAX_CONCURRENCY,
            topN: TOP_N,
            cacheTtlMs: CACHE_TTL_MS
        }
    }
}

/**
 * Clear preflight cache
 */
export function clearPreflightCache() {
    preflightCache.clear()
    log.info('Preflight cache cleared')
}
