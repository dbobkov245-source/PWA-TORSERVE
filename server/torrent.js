import process from 'process'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { createRequire } from 'module'
import { db, safeWrite } from './db.js'
import { getTorrentStream } from './torrentStreamRuntime.js'

// ────────────────────────────────────────────────────────
// Shared DHT Instance — bootstrap once, reuse across all engines
//
// Root cause of "0 peers after restart":
//   torrent-discovery creates a NEW DHT per engine (when dht: true) and calls
//   dht.listen(undefined) → random ephemeral UDP port.
//   Docker only maps 6881/udp → DHT responses are silently dropped.
//   Result: DHT never finds peers, swarm.queued = 0 forever.
//
// Fix: single shared DHT that listens on the mapped 6881/udp port.
//   - Bootstraps once at server start (not per-torrent)
//   - All engines share the same routing table (no cold start per torrent)
//   - When passed as dht: sharedDHT, torrent-discovery uses it as-is
//     (does NOT call dht.listen() again, does NOT destroy it on engine.destroy())
// ────────────────────────────────────────────────────────
const _require = createRequire(import.meta.url)

// bittorrent-dht is a nested dep of torrent-stream, not at top-level
let DHTClient
try {
    // Try top-level first (in case it's hoisted)
    DHTClient = _require('bittorrent-dht/client')
} catch {
    // Fall back to torrent-stream's nested copy
    const tsDir = path.dirname(_require.resolve('torrent-stream'))
    DHTClient = _require(path.join(tsDir, 'node_modules/bittorrent-dht/client'))
}

export function getTorrentUtpEnabled(env = process.env) {
    const raw = String(env.TORRENT_UTP || '').trim().toLowerCase()
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

export function getTorrentDhtListenPort(env = process.env) {
    const explicit = parseInt(env.TORRENT_DHT_PORT || '0', 10)
    if (Number.isFinite(explicit) && explicit > 0) return explicit

    const torrentPort = getTorrentListenPort(env)
    if (getTorrentUtpEnabled(env) && getTorrentDhtMode(env) === 'shared' && torrentPort > 0) {
        return torrentPort + 1
    }

    return torrentPort
}

const DHT_UDP_PORT = getTorrentDhtListenPort(process.env)
export const sharedDHT = new DHTClient()

sharedDHT.listen(DHT_UDP_PORT, () => {
    console.log(`[DHT] Shared DHT listening on UDP port ${DHT_UDP_PORT}`)
})
sharedDHT.on('ready', () => console.log('[DHT] Shared DHT bootstrapped'))
sharedDHT.on('error', (err) => console.warn('[DHT] Error:', err.message))

const engines = new Map()

// ─── Change Emitter (for SSE) ────────────────────────────────
const _changeListeners = new Set()
export function onTorrentChange(cb) { _changeListeners.add(cb) }
export function offTorrentChange(cb) { _changeListeners.delete(cb) }
export function _notifyTorrentChangeForTest() { _changeListeners.forEach(cb => cb()) }

function notifyTorrentChange() { _changeListeners.forEach(cb => cb()) }

// 🔥 Best Public Trackers — verified working (tested 2026-02-23)
// Tested from Russian ISP: open.stealth.si:80 and torrent.eu.org:451 respond reliably.
// opentrackr.org:1337 is ISP-blocked from Russia.
const PUBLIC_TRACKERS = [
    'udp://open.stealth.si:80/announce',           // ✅ Works from RU
    'udp://tracker.torrent.eu.org:451/announce',   // ✅ Works from RU
    'udp://explodie.org:6969/announce',            // ✅ Works from RU
    'udp://tracker.opentrackr.org:1337/announce',  // ⚠ Blocked by some RU ISPs
    'udp://tracker.openbittorrent.com:6969/announce',
    'udp://retracker.lanta-net.ru:2710/announce',  // Russian tracker — works locally
    'udp://opentor.net:6969/announce',
    'udp://tracker.zer0day.to:1337/announce',
    'http://tracker.gbitt.info:80/announce',
    'https://tracker.tamersunion.org:443/announce', // HTTPS — bypasses port blocks
]

// Metadata bootstrap timeout policy (can be tuned via env without rebuild)
const METADATA_TIMEOUT_MS = parseInt(process.env.TORRENT_METADATA_TIMEOUT_MS || '90000', 10)
const METADATA_GRACE_CYCLES = parseInt(process.env.TORRENT_METADATA_GRACE_CYCLES || '2', 10)
const SAFE_TORRENT_CONNECTIONS = 55

export function getTorrentListenPort(env = process.env) {
    const parsed = parseInt(env.TORRENT_PORT || '0', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function getTorrentUploadSlots(env = process.env) {
    const raw = env.TORRENT_UPLOAD_SLOTS
    if (raw === undefined) return 10

    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed < 0) return 10
    return parsed
}

export function getTorrentConnections(env = process.env) {
    const raw = env.TORRENT_CONNECTIONS
    if (raw === undefined) return SAFE_TORRENT_CONNECTIONS

    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return SAFE_TORRENT_CONNECTIONS
    return Math.max(parsed, SAFE_TORRENT_CONNECTIONS)
}

export function getTorrentDhtMode(env = process.env) {
    const mode = String(env.TORRENT_DHT_MODE || 'shared').trim().toLowerCase()
    return mode === 'internal' ? 'internal' : 'shared'
}

export function resolveTorrentDhtOption(env = process.env) {
    return getTorrentDhtMode(env) === 'internal' ? true : sharedDHT
}

export function buildTorrentEngineOptions({ path, connections, env = process.env }) {
    return {
        path,
        connections,
        uploads: getTorrentUploadSlots(env),
        utp: getTorrentUtpEnabled(env),
        dht: resolveTorrentDhtOption(env),
        verify: false,
        tracker: true,
        trackers: PUBLIC_TRACKERS,
    }
}

export function getSwarmPeerSnapshot(swarm) {
    const wires = swarm?.wires || []
    const connectedPeers = wires.length
    const activePeers = wires.filter((wire) => wire?.peerChoking === false).length
    const knownPeers = Object.keys(swarm?._peers || {}).length
    const queuedPeers = swarm?.queued || 0

    return {
        connectedPeers,
        activePeers,
        knownPeers,
        queuedPeers,
        displayPeers: Math.max(connectedPeers, knownPeers)
    }
}

export function getSwarmConnectionLimit(swarm) {
    const parsed = parseInt(swarm?.size || '0', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function setSwarmConnectionLimit(swarm, connections) {
    const parsed = parseInt(connections, 10)
    if (!swarm || !Number.isFinite(parsed) || parsed <= 0) {
        return getSwarmConnectionLimit(swarm)
    }

    swarm.size = parsed
    return parsed
}

export function recoverSwarm(engine) {
    if (!engine) return false

    let recovered = false
    if (engine.discover) {
        engine.discover()
        recovered = true
    }
    if (engine.swarm?.resume) {
        engine.swarm.resume()
        recovered = true
    }

    return recovered
}

// ────────────────────────────────────────────────────────
// Keep-Alive: Frozen torrents for instant resume (5 min TTL)
// 🔥 Memory fix: reduced from 30min to 5min, max 3 frozen
// ────────────────────────────────────────────────────────
const frozenTorrents = new Map() // infoHash -> { engine, frozenAt, magnetURI }
const FROZEN_TTL = 5 * 60 * 1000 // 🔥 5 minutes (was 30)
const MAX_FROZEN_TORRENTS = 3    // 🔥 Limit frozen count

// ✅ FIX: Сохраняем ID интервала для очистки при shutdown
let frozenCleanupIntervalId = null

// ────────────────────────────────────────────────────────
// Stalled-swarm recovery: kick engines with activePeers===0
// outside of Turbo. Throttled per-engine to avoid tracker spam.
// ────────────────────────────────────────────────────────
const STALL_CHECK_INTERVAL_MS = 60 * 1000
const STALL_RECOVER_THROTTLE_MS = 60 * 1000
let stallRecoveryIntervalId = null

function startStallRecovery() {
    if (stallRecoveryIntervalId) return

    stallRecoveryIntervalId = setInterval(() => {
        const now = Date.now()
        const seen = new Set()

        for (const engine of engines.values()) {
            if (!engine || seen.has(engine)) continue
            seen.add(engine)
            if (!engine.swarm) continue

            const snap = getSwarmPeerSnapshot(engine.swarm)
            if (snap.activePeers > 0) continue

            const lastAt = engine._lastRecoverAt || 0
            if (now - lastAt < STALL_RECOVER_THROTTLE_MS) continue

            engine._lastRecoverAt = now
            console.log(`[StallRecovery] activePeers=0, recovering ${engine.infoHash?.slice(0, 8)}: connected=${snap.connectedPeers} known=${snap.knownPeers} queued=${snap.queuedPeers}`)
            try {
                recoverSwarm(engine)
            } catch (err) {
                console.warn(`[StallRecovery] recover failed for ${engine.infoHash?.slice(0, 8)}: ${err.message}`)
            }
        }
    }, STALL_CHECK_INTERVAL_MS)

    console.log('[StallRecovery] Interval started')
}

function stopStallRecovery() {
    if (stallRecoveryIntervalId) {
        clearInterval(stallRecoveryIntervalId)
        stallRecoveryIntervalId = null
        console.log('[StallRecovery] Interval stopped')
    }
}

// Cleanup expired frozen torrents every 2 minutes
function startFrozenCleanup() {
    if (frozenCleanupIntervalId) return // Уже запущен

    frozenCleanupIntervalId = setInterval(() => {
        const now = Date.now()

        // 🔥 Memory fix: destroy oldest if over limit
        while (frozenTorrents.size > MAX_FROZEN_TORRENTS) {
            const oldest = [...frozenTorrents.entries()]
                .sort((a, b) => a[1].frozenAt - b[1].frozenAt)[0]
            if (oldest) {
                console.log(`[Keep-Alive] Over limit, destroying oldest: ${oldest[0]}`)
                oldest[1].engine.destroy()
                frozenTorrents.delete(oldest[0])
            }
        }

        for (const [hash, frozen] of frozenTorrents.entries()) {
            if (now - frozen.frozenAt > FROZEN_TTL) {
                console.log(`[Keep-Alive] Expired, destroying: ${hash}`)
                frozen.engine.destroy()
                frozenTorrents.delete(hash)
            }
        }
    }, 2 * 60 * 1000) // Check every 2 minutes

    console.log('[Keep-Alive] Cleanup interval started')
}

// ✅ FIX: Функция для остановки интервала при shutdown
function stopFrozenCleanup() {
    if (frozenCleanupIntervalId) {
        clearInterval(frozenCleanupIntervalId)
        frozenCleanupIntervalId = null
        console.log('[Keep-Alive] Cleanup interval stopped')
    }
}

// Запускаем очистку при загрузке модуля
startFrozenCleanup()
startStallRecovery()

// ────────────────────────────────────────────────────────
// Persistence: Save/Remove torrents to db.json
// ────────────────────────────────────────────────────────
async function saveTorrentToDB(magnetURI, name) {
    db.data.torrents ||= []
    // Avoid duplicates
    if (!db.data.torrents.find(t => t.magnet === magnetURI)) {
        db.data.torrents.push({ magnet: magnetURI, name, addedAt: Date.now(), completed: false })
        await safeWrite(db)
        console.log('[Persistence] Saved torrent:', name)
    }
}

// Mark torrent as completed in DB (survives restart)
async function markTorrentCompleted(infoHash) {
    const hashLower = infoHash.toLowerCase()
    const torrent = db.data.torrents?.find(t => t.magnet.toLowerCase().includes(hashLower))
    if (torrent && !torrent.completed) {
        torrent.completed = true
        await safeWrite(db)
        console.log('[Persistence] Marked as completed:', torrent.name)
    }
}

// ────────────────────────────────────────────────────────
// 📺 Watchlist: Track seen files to detect new episodes
// ────────────────────────────────────────────────────────
function getNewFilesCount(infoHash, currentFiles) {
    const seenFiles = db.data.seenFiles?.[infoHash] || []
    if (seenFiles.length === 0) {
        // First time seeing this torrent, mark all as seen
        updateSeenFiles(infoHash, currentFiles)
        return 0
    }
    // Count files not in seenFiles
    const newFiles = currentFiles.filter(f => !seenFiles.includes(f.name))
    return newFiles.length
}

function updateSeenFiles(infoHash, currentFiles) {
    db.data.seenFiles ||= {}
    db.data.seenFiles[infoHash] = currentFiles.map(f => f.name)
    safeWrite(db).catch(e => console.warn('[Watchlist] Failed to save seenFiles:', e.message))
}

function areSameFileList(a, b) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

/**
 * Mark current files as seen (used when playback starts).
 * Returns true if an update was applied.
 */
export function markTorrentFilesSeen(infoHash) {
    const engine = engines.get(infoHash)
    if (!engine || !engine.files) return false

    const currentNames = engine.files.map(f => f.name)
    const seen = db.data.seenFiles?.[infoHash] || []
    if (areSameFileList(seen, currentNames)) {
        return false
    }

    updateSeenFiles(infoHash, engine.files)
    return true
}

// ────────────────────────────────────────────────────────
// 🔥 v2.3: Cache for isTorrentCompleted (expensive string search)
// ────────────────────────────────────────────────────────
const completedCache = new Map()  // infoHash -> { value, time }
const COMPLETED_CACHE_TTL = 60000 // 1 minute

// Check if torrent is marked as completed in DB (CACHED)
function isTorrentCompleted(infoHash) {
    const hashLower = infoHash.toLowerCase()

    // Check cache first
    const cached = completedCache.get(hashLower)
    if (cached && Date.now() - cached.time < COMPLETED_CACHE_TTL) {
        return cached.value
    }

    // Expensive search
    const result = db.data.torrents?.some(t =>
        t.magnet.toLowerCase().includes(hashLower) && t.completed === true
    ) || false

    // Cache result
    completedCache.set(hashLower, { value: result, time: Date.now() })

    // 🔥 Limit cache size
    if (completedCache.size > 100) {
        const firstKey = completedCache.keys().next().value
        completedCache.delete(firstKey)
    }

    return result
}

async function removeTorrentFromDB(infoHash) {
    db.data.torrents ||= []
    const before = db.data.torrents.length
    const hashLower = infoHash.toLowerCase()

    // Case-insensitive match: magnet URI contains infoHash in format urn:btih:HASH
    db.data.torrents = db.data.torrents.filter(t => {
        const magnetLower = t.magnet.toLowerCase()
        const shouldRemove = magnetLower.includes(hashLower)
        if (shouldRemove) {
            console.log('[Persistence] Matching torrent for removal:', t.name)
        }
        return !shouldRemove
    })

    if (db.data.torrents.length < before) {
        await safeWrite(db)
        console.log(`[Persistence] Removed ${before - db.data.torrents.length} torrent(s) from DB:`, infoHash)
    } else {
        console.log('[Persistence] WARNING: No torrent found in DB for hash:', infoHash)
    }
}

export function getPersistedTorrentsToRestore(persisted = []) {
    return persisted.filter(torrent => torrent?.magnet && torrent.completed !== true)
}

// Restore all saved torrents on server startup
export async function restoreTorrents() {
    await db.read()
    const saved = db.data.torrents || []
    const restorable = getPersistedTorrentsToRestore(saved)
    console.log(`[Persistence] Restoring ${restorable.length}/${saved.length} torrents...`)

    for (const { magnet, name } of restorable) {
        try {
            await addTorrent(magnet, true) // true = skip saving (already in DB)
            console.log(`[Persistence] Restored: ${name}`)
        } catch (err) {
            console.warn(`[Persistence] Failed to restore ${name}: ${err.message}`)
        }
    }
}

// Helper to extract infoHash (regex from aggregator.js logic)
const extractInfoHash = (magnet) => {
    if (!magnet) return null
    const hexMatch = magnet.match(/urn:btih:([a-fA-F0-9]{40})/i)
    if (hexMatch) return hexMatch[1].toLowerCase()
    const base32Match = magnet.match(/urn:btih:([A-Z2-7]{32})/i)
    if (base32Match) return base32Match[1].toLowerCase()
    return null
}

/**
 * Decide whether to timeout immediately or give another metadata wait cycle.
 * Grace is only granted when at least one wire is connected.
 */
export function getMetadataTimeoutDecision({ peers = 0, attempts = 0, maxGraceCycles = METADATA_GRACE_CYCLES }) {
    if (peers > 0 && attempts < maxGraceCycles) return 'grace'
    return 'timeout'
}

export const addTorrent = (magnetURI, skipSave = false) => {
    return new Promise((resolve, reject) => {
        // 🔥 FIX-03: Smart Deduplication by infoHash
        const infoHash = extractInfoHash(magnetURI)
        if (!infoHash) {
            console.warn('[Torrent] Invalid magnet Link or missing infoHash:', magnetURI)
            return reject(new Error('Invalid magnet link: cannot extract infoHash'))
        }

        // Check active engines by infoHash
        for (const engine of engines.values()) {
            if (engine.infoHash?.toLowerCase() === infoHash) {
                console.log(`[Torrent] Dedup: Engine already exists for hash ${infoHash}`)
                return resolve(formatEngine(engine))
            }
        }

        // Check frozen torrents (Keep-Alive: instant resume!)
        if (frozenTorrents.has(infoHash)) {
            console.log(`[Keep-Alive] Reusing frozen torrent: ${infoHash}`)
            const frozen = frozenTorrents.get(infoHash)
            const engine = frozen.engine
            frozenTorrents.delete(infoHash)
            engines.set(magnetURI, engine)
            engines.set(engine.infoHash, engine)
            if (engine.swarm?.resume) engine.swarm.resume()
            return resolve(formatEngine(engine))
        }

        const path = process.env.DOWNLOAD_PATH || './downloads'
        console.log('[Torrent] Adding magnet, download path:', path)

        // 🔥 STRATEGY 1: Tracker Injection
        let enrichedMagnet = magnetURI
        if (magnetURI.startsWith('magnet:?')) {
            const extraTr = PUBLIC_TRACKERS
                .filter(tr => !magnetURI.includes(encodeURIComponent(tr)))
                .map(tr => `&tr=${encodeURIComponent(tr)}`)
                .join('')
            enrichedMagnet += extraTr
            console.log('[Torrent] Injected', PUBLIC_TRACKERS.length, 'public trackers')
        }

        let engine
        try {
            const torrentStream = getTorrentStream()
            // Start wide enough to avoid choke-timeout churn on sparse swarms.
            // NOTE: trackers: PUBLIC_TRACKERS is CRITICAL — torrent-stream loads cached
            // .torrent files which have announce=[] (metadata info-dict has no trackers).
            // Only opts.trackers → discovery.announce persists across cache loads.
            engine = torrentStream(enrichedMagnet, buildTorrentEngineOptions({
                path,
                connections: getTorrentConnections()
            }))
        } catch (err) {
            console.error('[Torrent] Failed to create engine:', err.message)
            return reject(err)
        }

        // peer-wire-swarm pools multiple infoHashes behind one listening port,
        // so every engine should reuse the mapped TORRENT_PORT for inbound peers.
        const listenPort = getTorrentListenPort()
        engine.listen(listenPort, () => {
            console.log(`[Torrent] Listening on port ${engine.port} (inbound TCP enabled)`)
        })

        engine.on('ready', () => {
            // ✅ FIX: Очищаем таймаут при успешном подключении
            if (engine._timeoutId) {
                clearTimeout(engine._timeoutId)
                delete engine._timeoutId
            }
            if (engine._logInterval) {
                clearInterval(engine._logInterval)
                delete engine._logInterval
            }

            console.log('[Torrent] Engine ready:', engine.infoHash)

            // ────────────────────────────────────────────────────────
            // FIX-01: Smart Selection (Video Only, All Files)
            // ────────────────────────────────────────────────────────
            if (engine.files && engine.files.length > 0) {
                // 1. Filter video extensions
                const videoFiles = engine.files.filter(f =>
                    /\.(mp4|mkv|avi|webm|mov|mpg|mpeg)$/i.test(f.name)
                )

                if (videoFiles.length > 0) {
                    // 2. Select ALL video files so multi-episode torrents download completely
                    videoFiles.forEach(f => f.select())
                    console.log(`[Torrent] Kickstart: Selected ${videoFiles.length} video file(s)`)

                    // 3. Prioritize first file by name (natural episode order: E01 → E02 → ...)
                    const sorted = [...videoFiles].sort((a, b) => a.name.localeCompare(b.name))
                    const firstVideo = sorted[0]
                    console.log(`[Torrent] Kickstart: Prioritizing first video: ${firstVideo.name} (${(firstVideo.length / 1024 / 1024).toFixed(1)} MB)`)
                    const idx = engine.files.indexOf(firstVideo)
                    if (idx !== -1) prioritizeFileInternal(engine, idx)
                } else {
                    console.log('[Torrent] IsKickstart: No video files found, nothing selected automatically.')
                }
            }

            engines.set(magnetURI, engine)
            engines.set(engine.infoHash, engine)

            // 🔄 Invalidate status cache on new torrent
            invalidateStatusCache()

            // Save to DB for persistence (unless restoring)
            if (!skipSave) {
                saveTorrentToDB(magnetURI, engine.torrent?.name || 'Unknown')
            }

            notifyTorrentChange()
            resolve(formatEngine(engine))
        })

        engine.on('error', (err) => {
            // ✅ FIX: Очищаем таймаут при ошибке
            if (engine._timeoutId) {
                clearTimeout(engine._timeoutId)
                delete engine._timeoutId
            }
            if (engine._logInterval) {
                clearInterval(engine._logInterval)
                delete engine._logInterval
            }

            console.error('[Torrent] Engine error:', err.message)
            engine.destroy()
            reject(err)
        })

        // 🔥 STRATEGY 3: Configurable metadata timeout with grace cycles
        // ✅ FIX: Сохраняем ID таймаута для очистки при успешном подключении
        // 📊 DIAGNOSTICS: Log connection progress every 5s
        const startTime = Date.now()
        const logInterval = setInterval(() => {
            const peers = engine.swarm?.wires?.length || 0
            const candidates = engine.swarm?.queued || 0
            console.log(`[Torrent] ${infoHash.slice(0, 8)} waiting... ${Math.round((Date.now() - startTime) / 1000)}s, peers: ${peers}, queued: ${candidates}`)
        }, 5000)

        let timeoutAttempts = 0
        const totalTimeoutSec = Math.round((METADATA_TIMEOUT_MS * (METADATA_GRACE_CYCLES + 1)) / 1000)

        const scheduleTimeout = () => {
            const timeoutId = setTimeout(() => {
                if (engines.has(magnetURI)) return

                const peers = engine.swarm?.wires?.length || 0
                const decision = getMetadataTimeoutDecision({
                    peers,
                    attempts: timeoutAttempts,
                    maxGraceCycles: METADATA_GRACE_CYCLES
                })

                if (decision === 'grace') {
                    timeoutAttempts++
                    console.warn(`[Torrent] Metadata grace ${timeoutAttempts}/${METADATA_GRACE_CYCLES}: connected peers=${peers}`)
                    if (engine.discover) engine.discover()
                    if (engine.swarm?.resume) engine.swarm.resume()
                    scheduleTimeout()
                    return
                }

                clearInterval(logInterval)
                console.warn(`[Torrent] Timeout: metadata unavailable after ${totalTimeoutSec}s`)
                engine.destroy()
                reject(new Error(`Torrent timeout: metadata unavailable within ${totalTimeoutSec} seconds`))
            }, METADATA_TIMEOUT_MS)

            // ✅ FIX: Очищаем таймаут при успешном подключении (внутри engine.on('ready'))
            engine._timeoutId = timeoutId
        }

        // Start first timeout cycle
        scheduleTimeout()
        engine._logInterval = logInterval // Store to clear on ready/error
    })
}

export const removeTorrent = (infoHash, forceDestroy = false) => {
    const engine = engines.get(infoHash)
    if (!engine) return false

    // 🔄 Invalidate status cache on torrent removal
    invalidateStatusCache()

    // Find magnetURI for this engine
    let magnetURI = null
    for (const [key, val] of engines.entries()) {
        if (val === engine && key.startsWith('magnet:')) {
            magnetURI = key
            break
        }
    }

    // Remove from active map
    engines.delete(infoHash)
    // ✅ FIX: Собираем ключи для удаления отдельно, чтобы избежать race condition
    const keysToDelete = []
    for (const [key, val] of engines.entries()) {
        if (val === engine) keysToDelete.push(key)
    }
    for (const key of keysToDelete) {
        engines.delete(key)
    }

    // Keep-Alive: freeze instead of destroy (unless forced)
    if (!forceDestroy) {
        const ttlMin = Math.round(FROZEN_TTL / 60000)
        console.log(`[Keep-Alive] Freezing torrent for ${ttlMin}min: ${infoHash}`)
        frozenTorrents.set(infoHash, {
            engine,
            magnetURI,
            frozenAt: Date.now()
        })
    } else {
        console.log('Destroying torrent:', infoHash)
        engine.destroy(() => {
            console.log('Engine destroyed:', infoHash)
        })
    }

    // 🔥 Memory fix: clear disk cache for this torrent
    diskDownloadCache.delete(infoHash)

    // Remove from persistent storage
    removeTorrentFromDB(infoHash)

    notifyTorrentChange()
    return true
}

export const getTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (engine) return formatEngine(engine)
    return null
}

// Get raw engine for streaming (with createReadStream)
export const getRawTorrent = (infoHash) => {
    // 1. Check active engines
    let engine = engines.get(infoHash)
    if (engine) return engine

    // 2. Check frozen torrents (Auto-Restore)
    if (frozenTorrents.has(infoHash)) {
        console.log(`[Keep-Alive] 🧊 Auto-restoring frozen torrent for stream: ${infoHash}`)
        const frozen = frozenTorrents.get(infoHash)
        engine = frozen.engine

        // Restore to active map
        engines.set(infoHash, engine)
        if (frozen.magnetURI) engines.set(frozen.magnetURI, engine)

        frozenTorrents.delete(infoHash)
        return engine
    }

    return null
}

// ────────────────────────────────────────────────────────
// 🚀 Status Cache: Reduce CPU load from frequent polling
// ────────────────────────────────────────────────────────
let statusCache = null
let statusCacheTime = 0
export function getStatusCacheTtlMs(env = process.env) {
    const parsed = parseInt(env.STATUS_CACHE_TTL_MS || '10000', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000
}

const STATUS_CACHE_TTL = getStatusCacheTtlMs()

export const getAllTorrents = () => {
    const now = Date.now()

    // Return cached result if fresh
    if (statusCache && now - statusCacheTime < STATUS_CACHE_TTL) {
        return statusCache
    }

    // Recalculate and cache
    const uniqueEngines = new Set(engines.values())
    statusCache = Array.from(uniqueEngines).map(formatEngine)
    statusCacheTime = now

    return statusCache
}

// Invalidate cache when torrents change
export const invalidateStatusCache = () => {
    statusCache = null
    statusCacheTime = 0
}

// ────────────────────────────────────────────────────────
// Calculate actual downloaded bytes from disk (CACHED)
// Uses background updates to avoid blocking event loop
// 🔥 Memory fix: added async dedup to prevent parallel storms
// ────────────────────────────────────────────────────────
const diskDownloadCache = new Map() // infoHash -> { bytes, updatedAt, updating }
const DISK_CACHE_TTL = 30000 // 30 seconds

// Exported for testing: evicts the oldest (insertion-order) entry when cache exceeds maxSize
export function evictDiskCacheOldestEntry(cache, maxSize) {
    if (cache.size > maxSize) {
        const oldestKey = cache.keys().next().value
        cache.delete(oldestKey)
    }
}

export function resolveDisplayedDownloaded({
    wasCompleted,
    totalSize,
    diskDownloaded,
    swarmDownloaded,
    resumeBaseline = 0
}) {
    if (wasCompleted) {
        return totalSize
    }

    const diskBytes = Number.isFinite(diskDownloaded) ? diskDownloaded : 0
    const swarmBytes = Number.isFinite(swarmDownloaded) ? swarmDownloaded : 0
    const baselineBytes = Number.isFinite(resumeBaseline) ? resumeBaseline : 0

    return Math.max(diskBytes, baselineBytes + swarmBytes)
}

// Non-blocking: returns cached value, schedules background update
function getDownloadedFromDisk(engine) {
    const infoHash = engine.infoHash

    // Evict one oldest entry instead of clearing everything
    evictDiskCacheOldestEntry(diskDownloadCache, 200)

    const cached = diskDownloadCache.get(infoHash)
    const now = Date.now()

    // Return cached value if fresh
    if (cached && now - cached.updatedAt < DISK_CACHE_TTL) {
        return cached.bytes
    }

    // 🔥 Memory fix: prevent parallel async updates (async dedup)
    if (!cached?.updating) {
        diskDownloadCache.set(infoHash, {
            bytes: cached?.bytes || 0,
            updatedAt: cached?.updatedAt || 0,
            updating: true
        })

        updateDiskCacheAsync(engine).finally(() => {
            const entry = diskDownloadCache.get(infoHash)
            if (entry) entry.updating = false
        })
    }

    // Return stale cache or 0 while updating
    return cached?.bytes || 0
}

// Background async update (doesn't block event loop)
async function updateDiskCacheAsync(engine) {
    const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
    const infoHash = engine.infoHash

    if (!engine.torrent?.name || !engine.files) {
        diskDownloadCache.set(infoHash, { bytes: 0, updatedAt: Date.now() })
        return
    }

    let totalDownloaded = 0

    // Use async fs for non-blocking I/O (static import at top)

    for (const file of engine.files) {
        try {
            const filePath = path.join(downloadPath, file.path)
            const stats = await fsPromises.stat(filePath)
            const actualBytes = (stats.blocks !== undefined)
                ? stats.blocks * 512
                : stats.size
            totalDownloaded += Math.min(actualBytes, file.length)
        } catch (e) {
            // File doesn't exist or not accessible
        }
    }

    diskDownloadCache.set(infoHash, { bytes: totalDownloaded, updatedAt: Date.now() })
}

const formatEngine = (engine) => {
    const totalSize = engine.files?.reduce((sum, f) => sum + f.length, 0) || 0

    // Get downloaded bytes from different sources
    const diskDownloaded = getDownloadedFromDisk(engine)
    const swarmDownloaded = engine.swarm?.downloaded || 0

    // 🔥 Check if already marked as completed in DB (survives restart)
    const wasCompleted = isTorrentCompleted(engine.infoHash)

    if (!Number.isFinite(engine._resumeDownloadedBaseline) && (diskDownloaded > 0 || swarmDownloaded > 0)) {
        engine._resumeDownloadedBaseline = Math.max(diskDownloaded - swarmDownloaded, 0)
    }

    const downloaded = resolveDisplayedDownloaded({
        wasCompleted,
        totalSize,
        diskDownloaded,
        swarmDownloaded,
        resumeBaseline: engine._resumeDownloadedBaseline
    })

    // Calculate progress (0-1)
    const progress = totalSize > 0 ? Math.min(downloaded / totalSize, 1) : 0

    // Check if ready (and save completed status if newly completed)
    const isReady = wasCompleted || progress >= 0.99
    if (isReady && !wasCompleted && progress >= 0.99) {
        // Mark as completed in DB (async, fire-and-forget)
        markTorrentCompleted(engine.infoHash)
    }

    // Get download speed
    const downloadSpeed = engine.swarm?.downloadSpeed() || 0
    const peerSnapshot = getSwarmPeerSnapshot(engine.swarm)

    // Calculate ETA (seconds remaining)
    let eta = null
    if (downloadSpeed > 0 && progress < 1) {
        const remaining = totalSize - downloaded
        eta = Math.round(remaining / downloadSpeed)
    }

    // 📺 Watchlist: count new files since last check
    const currentFiles = engine.files || []
    const newFilesCount = getNewFilesCount(engine.infoHash, currentFiles)

    return {
        infoHash: engine.infoHash,
        name: engine.torrent?.name || 'Unknown Torrent',
        progress: progress,
        isReady: isReady,
        downloaded: downloaded,
        totalSize: totalSize,
        downloadSpeed: downloadSpeed,
        uploadSpeed: engine.swarm?.uploadSpeed() || 0,
        numPeers: peerSnapshot.displayPeers,
        connectedPeers: peerSnapshot.connectedPeers,
        activePeers: peerSnapshot.activePeers,
        knownPeers: peerSnapshot.knownPeers,
        queuedPeers: peerSnapshot.queuedPeers,
        eta: eta, // seconds remaining
        newFilesCount: newFilesCount, // 📺 Watchlist: new episodes since last check
        // 🔥 Memory fix: only include file count, not full array
        // Full files array available via getTorrent(hash) on demand
        fileCount: engine.files?.length || 0,
        files: engine.files ? engine.files.map((file, index) => ({
            name: file.name,
            length: file.length,
            index: index
            // 🔥 Removed: path (not needed for UI list)
        })) : []
    }
}

// ────────────────────────────────────────────────────────
// Smart Priority: Prioritize specific file for instant playback
// Called when user starts streaming a specific episode
// ────────────────────────────────────────────────────────

// Internal function (accepts engine directly)
function prioritizeFileInternal(engine, fileIndex, byteOffset = 0) {
    const file = engine.files?.[fileIndex]
    if (!file) {
        console.warn('[Priority] File not found:', fileIndex)
        return false
    }

    const pieceLength = engine.torrent?.pieceLength || 262144 // Default 256KB
    const totalPieces = engine.torrent?.pieces?.length || 0

    if (totalPieces === 0 || pieceLength === 0) {
        console.warn('[Priority] No piece info available')
        return false
    }

    // Calculate piece range for this specific file
    const fileStart = (file.offset || 0) + byteOffset
    const fileEnd = (file.offset || 0) + file.length

    const startPiece = Math.floor(fileStart / pieceLength)
    const endPiece = Math.floor(fileEnd / pieceLength)

    // ⚡ AGGRESSIVE PRIORITY: 50MB instead of 15MB for 4K content
    const priorityBytes = Math.min(file.length * 0.1, 50 * 1024 * 1024) // 10% or 50MB
    const priorityPieces = Math.max(1, Math.ceil(priorityBytes / pieceLength))
    const priorityEnd = Math.min(startPiece + priorityPieces, endPiece)

    try {
        engine.select(startPiece, priorityEnd, true) // true = high priority
        console.log(`[Priority] File ${fileIndex}: pieces ${startPiece}-${priorityEnd} (${priorityPieces} pieces, ~${Math.round(priorityBytes / 1024 / 1024)}MB)`)
        return true
    } catch (e) {
        console.warn('[Priority] Selection failed:', e.message)
        return false
    }
}

// Public API: prioritize by infoHash
export function prioritizeFile(infoHash, fileIndex) {
    const engine = engines.get(infoHash)
    if (!engine) {
        console.warn('[Priority] Engine not found:', infoHash)
        return false
    }
    return prioritizeFileInternal(engine, fileIndex)
}

// ────────────────────────────────────────────────────────
// Readahead: Prioritize chunks ahead of seek position
// Called when player seeks to a new position
// ────────────────────────────────────────────────────────
export function readahead(infoHash, fileIndex, byteOffset) {
    const engine = engines.get(infoHash)
    if (!engine) {
        console.warn('[Readahead] Engine not found:', infoHash)
        return false
    }
    console.log(`[Readahead] Seeking to byte ${byteOffset} in file ${fileIndex}`)
    return prioritizeFileInternal(engine, fileIndex, byteOffset)
}

// ────────────────────────────────────────────────────────
// 🔥 Turbo Mode: Boost connections when streaming starts
// ────────────────────────────────────────────────────────
export const boostTorrent = (infoHash) => {
    const engine = engines.get(infoHash)

    // Debug: why boost might not work
    if (!engine) {
        console.warn(`[Turbo] Engine not found for: ${infoHash}`)
        return
    }
    if (!engine.swarm) {
        console.warn(`[Turbo] No swarm for: ${infoHash}`)
        return
    }

    const currentMax = getSwarmConnectionLimit(engine.swarm)
    const peerSnapshot = getSwarmPeerSnapshot(engine.swarm)
    console.log(`[Turbo] Current connections: ${engine.swarm.wires?.length || 0}/${currentMax}`)

    let shouldRecover = false
    if (currentMax < SPEED_MODES.turbo) {
        console.log(`[Turbo] 🚀 Boosting connections for ${infoHash}: ${currentMax} -> ${SPEED_MODES.turbo}`)
        setSwarmConnectionLimit(engine.swarm, SPEED_MODES.turbo)
        shouldRecover = true
    } else {
        console.log(`[Turbo] Already boosted (${currentMax}), skipping`)
    }

    if (peerSnapshot.activePeers === 0) {
        console.log(`[Turbo] ♻️ Recovering stalled swarm for ${infoHash}: ${peerSnapshot.connectedPeers} connected / ${peerSnapshot.knownPeers} known / ${peerSnapshot.activePeers} active`)
        shouldRecover = true
    }

    if (shouldRecover) {
        recoverSwarm(engine)
    }
}

// ────────────────────────────────────────────────────────
// ⚡ Speed Mode: Eco / Balanced / Turbo
// ────────────────────────────────────────────────────────
const SPEED_MODES = {
    eco: 30,
    balanced: SAFE_TORRENT_CONNECTIONS,
    turbo: 100
}

export const setSpeedMode = (mode) => {
    const connections = SPEED_MODES[mode] || SPEED_MODES.balanced
    const uniqueEngines = new Set(engines.values())

    for (const engine of uniqueEngines) {
        if (engine.swarm) {
            setSwarmConnectionLimit(engine.swarm, connections)
            console.log(`[SpeedMode] Set ${engine.infoHash?.slice(0, 8)} to ${mode} (${connections} connections)`)
        }
    }

    console.log(`[SpeedMode] Applied ${mode} mode to ${uniqueEngines.size} torrents`)
    return { mode, connections, torrentsAffected: uniqueEngines.size }
}

// ────────────────────────────────────────────────────────
// 🛑 Graceful Shutdown: Destroy all torrents
// ────────────────────────────────────────────────────────
export const destroyAllTorrents = () => {
    // ✅ FIX: Останавливаем интервал очистки frozen torrents
    stopFrozenCleanup()
    stopStallRecovery()

    console.log(`[Shutdown] Destroying ${engines.size} active engines...`)

    // Destroy all active engines
    const uniqueEngines = new Set(engines.values())
    for (const engine of uniqueEngines) {
        try {
            engine.destroy()
        } catch (e) {
            console.warn('[Shutdown] Engine destroy failed:', e.message)
        }
    }
    engines.clear()

    // Clear frozen torrents
    console.log(`[Shutdown] Clearing ${frozenTorrents.size} frozen torrents...`)
    for (const [hash, frozen] of frozenTorrents.entries()) {
        try {
            frozen.engine.destroy()
        } catch (e) { }
    }
    frozenTorrents.clear()

    console.log('[Shutdown] All torrents destroyed')

    // Destroy shared DHT on shutdown
    try {
        sharedDHT.destroy()
        console.log('[DHT] Shared DHT destroyed')
    } catch (e) { }
}

// ────────────────────────────────────────────────────────
// 📊 v2.3: Diagnostics helpers
// ────────────────────────────────────────────────────────
export const getActiveTorrentsCount = () => new Set(engines.values()).size
export const getFrozenTorrentsCount = () => frozenTorrents.size

// ────────────────────────────────────────────────────────
// 🛡️ v2.3.3: Graceful Degradation - Memory pressure handling
// ────────────────────────────────────────────────────────

let isDegradedMode = false

/**
 * Enter degraded mode: reduce memory usage
 * - Pause all frozen torrents (destroy them)
 * - Reduce max connections on active torrents
 * - Disable prefetch buffers
 */
export const enterDegradedMode = () => {
    if (isDegradedMode) return { alreadyDegraded: true }

    isDegradedMode = true
    console.log('[Degradation] Entering degraded mode - reducing memory usage')

    let freedCount = 0

    // 1. Clear all frozen torrents (they're just cache)
    for (const [hash, frozen] of frozenTorrents.entries()) {
        try {
            frozen.engine.destroy()
            freedCount++
        } catch (e) { }
    }
    frozenTorrents.clear()
    console.log(`[Degradation] Freed ${freedCount} frozen torrents`)

    // 2. Reduce connections on active torrents (eco mode)
    const uniqueEngines = new Set(engines.values())
    for (const engine of uniqueEngines) {
        if (engine.swarm) {
            setSwarmConnectionLimit(engine.swarm, SPEED_MODES.eco)
        }
    }
    console.log(`[Degradation] Reduced connections on ${uniqueEngines.size} active torrents`)

    // 3. Force garbage collection if available
    if (global.gc) {
        global.gc()
        console.log('[Degradation] Forced garbage collection')
    }

    return {
        freedFrozen: freedCount,
        reducedConnections: uniqueEngines.size,
        mode: 'degraded'
    }
}

/**
 * Exit degraded mode: restore normal operation
 */
export const exitDegradedMode = () => {
    if (!isDegradedMode) return { alreadyNormal: true }

    isDegradedMode = false
    console.log('[Degradation] Exiting degraded mode - restoring normal operation')

    // Restore normal connections (balanced mode)
    const uniqueEngines = new Set(engines.values())
    for (const engine of uniqueEngines) {
        if (engine.swarm) {
            setSwarmConnectionLimit(engine.swarm, SPEED_MODES.balanced)
        }
    }

    return { restoredConnections: uniqueEngines.size, mode: 'normal' }
}

/**
 * Check if currently in degraded mode
 */
export const isInDegradedMode = () => isDegradedMode
