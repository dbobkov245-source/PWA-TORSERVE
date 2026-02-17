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
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

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
function probeMagnet(magnet) {
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
export async function preflightResults(results) {
    if (!results || results.length === 0) return results

    const enabled = process.env.MAGNET_PREFLIGHT_ENABLED !== '0'
    if (!enabled) {
        // Feature disabled — return as-is with unknown status
        return results.map(r => ({
            ...r,
            playabilityStatus: 'unknown',
            playabilityScore: 0,
            preflight: null
        }))
    }

    // Only preflight top-N results that have magnets
    const withMagnet = []
    const withoutMagnet = []
    for (let i = 0; i < results.length; i++) {
        if (results[i].magnet && i < TOP_N) {
            withMagnet.push({ index: i, result: results[i] })
        } else {
            withoutMagnet.push(i)
        }
    }

    log.info('Starting preflight', { total: results.length, probing: withMagnet.length, topN: TOP_N })
    const probeStart = Date.now()

    // Build probe tasks (using cache where possible)
    const tasks = withMagnet.map(({ result }) => {
        const infoHash = extractInfoHash(result.magnet)
        const cached = infoHash ? getCached(infoHash) : null
        if (cached) {
            return () => Promise.resolve(cached)
        }
        return () => probeMagnet(result.magnet).then(probe => {
            const entry = {
                status: probe.status,
                peers: probe.peers,
                checkedAt: Date.now(),
                durationMs: probe.durationMs,
                source: 'probe'
            }
            if (infoHash) setCache(infoHash, entry)
            return entry
        })
    })

    // Run with limited concurrency
    const probeResults = await runWithConcurrency(tasks, MAX_CONCURRENCY)
    const totalDurationMs = Date.now() - probeStart

    log.info('Preflight complete', {
        probed: probeResults.length,
        totalMs: totalDurationMs,
        playable: probeResults.filter(r => r.status === 'playable').length,
        risky: probeResults.filter(r => r.status === 'risky').length,
        dead: probeResults.filter(r => r.status === 'dead').length
    })

    // Enrich results with preflight data
    const enriched = results.map((result, idx) => ({ ...result }))

    for (let i = 0; i < withMagnet.length; i++) {
        const { index } = withMagnet[i]
        const probe = probeResults[i]
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
    else if (probe?.status === 'risky') score += 400
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
