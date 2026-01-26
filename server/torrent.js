import torrentStream from 'torrent-stream'
import process from 'process'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { db, safeWrite } from './db.js'

const engines = new Map()

// 🔥 Best Public Trackers (Tier 1 & 2)
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

// ────────────────────────────────────────────────────────
// Keep-Alive: Frozen torrents for instant resume (5 min TTL)
// 🔥 Memory fix: reduced from 30min to 5min, max 3 frozen
// ────────────────────────────────────────────────────────
const frozenTorrents = new Map() // infoHash -> { engine, frozenAt, magnetURI }
const FROZEN_TTL = 5 * 60 * 1000 // 🔥 5 minutes (was 30)
const MAX_FROZEN_TORRENTS = 3    // 🔥 Limit frozen count

// ✅ FIX: Сохраняем ID интервала для очистки при shutdown
let frozenCleanupIntervalId = null

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

// Restore all saved torrents on server startup
export async function restoreTorrents() {
    await db.read()
    const saved = db.data.torrents || []
    console.log(`[Persistence] Restoring ${saved.length} torrents...`)

    for (const { magnet, name } of saved) {
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
            // 🔥 STRATEGY 2: Eco Mode (20 connections) by default
            engine = torrentStream(enrichedMagnet, {
                path: path,
                connections: 20,       // Eco Mode: RAM-safe limit
                uploads: 0,
                dht: true,             // ✅ DHT enabled
                verify: false,
                tracker: true
            })
        } catch (err) {
            console.error('[Torrent] Failed to create engine:', err.message)
            return reject(err)
        }

        engine.on('ready', () => {
            // ✅ FIX: Очищаем таймаут при успешном подключении
            if (engine._timeoutId) {
                clearTimeout(engine._timeoutId)
                delete engine._timeoutId
            }

            console.log('[Torrent] Engine ready:', engine.infoHash)

            // ────────────────────────────────────────────────────────
            // FIX-01: Smart Selection (Video Only, Sort by Size)
            // ────────────────────────────────────────────────────────
            if (engine.files && engine.files.length > 0) {
                // 1. Filter video extensions
                const videoFiles = engine.files.filter(f => 
                    /\.(mp4|mkv|avi|webm|mov|mpg|mpeg)$/i.test(f.name)
                )

                // 2. Sort by length DESC
                videoFiles.sort((a, b) => b.length - a.length)

                // 3. Select LARGEST video file (if any)
                if (videoFiles.length > 0) {
                    const largestVideo = videoFiles[0]
                    console.log(`[Torrent] Kickstart: Prioritizing largest video: ${largestVideo.name} (${(largestVideo.length / 1024 / 1024).toFixed(1)} MB)`)
                    largestVideo.select()
                    
                    // Also enable priority strategy
                    const idx = engine.files.indexOf(largestVideo)
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

            resolve(formatEngine(engine))
        })

        engine.on('error', (err) => {
            // ✅ FIX: Очищаем таймаут при ошибке
            if (engine._timeoutId) {
                clearTimeout(engine._timeoutId)
                delete engine._timeoutId
            }

            console.error('[Torrent] Engine error:', err.message)
            engine.destroy()
            reject(err)
        })

        // 🔥 STRATEGY 3: Increased Timeout (90s)
        // ✅ FIX: Сохраняем ID таймаута для очистки при успешном подключении
        const timeoutId = setTimeout(() => {
            if (!engines.has(magnetURI)) {
                console.warn('[Torrent] Timeout: no peers found')
                engine.destroy()
                reject(new Error('Torrent timeout: no peers found within 90 seconds'))
            }
        }, 90000)

        // ✅ FIX: Очищаем таймаут при успешном подключении (внутри engine.on('ready'))
        engine._timeoutId = timeoutId
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
        console.log(`[Keep-Alive] Freezing torrent for 30min: ${infoHash}`)
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

    return true
}

export const getTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (engine) return formatEngine(engine)
    return null
}

// Get raw engine for streaming (with createReadStream)
export const getRawTorrent = (infoHash) => {
    return engines.get(infoHash) || null
}

// ────────────────────────────────────────────────────────
// 🚀 Status Cache: Reduce CPU load from frequent polling
// ────────────────────────────────────────────────────────
let statusCache = null
let statusCacheTime = 0
const STATUS_CACHE_TTL = 5000 // 🔥 v2.3: increased from 2s to 5s for ARM CPU optimization

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

// Non-blocking: returns cached value, schedules background update
function getDownloadedFromDisk(engine) {
    const infoHash = engine.infoHash

    // 🔥 Memory fix: hard cap on cache size
    if (diskDownloadCache.size > 50) {
        console.log('[Memory] Clearing diskDownloadCache (size exceeded 50)')
        diskDownloadCache.clear()
    }

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

    // Determine downloaded bytes:
    // 1. If marked completed in DB → use totalSize
    // 2. If swarm has data → use swarm (active download)
    // 3. Otherwise → use disk (restart scenario, partial download)
    let downloaded
    if (wasCompleted) {
        downloaded = totalSize
    } else if (swarmDownloaded > 0) {
        downloaded = swarmDownloaded
    } else {
        downloaded = diskDownloaded
    }

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
        numPeers: engine.swarm?.wires?.length || 0,
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

    const currentMax = engine.swarm.maxConnections || 0
    console.log(`[Turbo] Current connections: ${engine.swarm.wires?.length || 0}/${currentMax}`)

    // If still in Eco Mode (< 65), boost it!
    if (currentMax < 65) {
        console.log(`[Turbo] 🚀 Boosting connections for ${infoHash}: ${currentMax} -> 65`)
        engine.swarm.maxConnections = 65
        if (engine.discover) engine.discover()
        engine.swarm.resume()
    } else {
        console.log(`[Turbo] Already boosted (${currentMax}), skipping`)
    }
}

// ────────────────────────────────────────────────────────
// ⚡ Speed Mode: Eco / Balanced / Turbo
// ────────────────────────────────────────────────────────
const SPEED_MODES = {
    eco: 20,
    balanced: 40,
    turbo: 65
}

export const setSpeedMode = (mode) => {
    const connections = SPEED_MODES[mode] || SPEED_MODES.balanced
    const uniqueEngines = new Set(engines.values())

    for (const engine of uniqueEngines) {
        if (engine.swarm) {
            engine.swarm.maxConnections = connections
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
}

// ────────────────────────────────────────────────────────
// 📊 v2.3: Diagnostics helpers
// ────────────────────────────────────────────────────────
export const getActiveTorrentsCount = () => engines.size
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
            engine.swarm.maxConnections = 30 // Minimal connections
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
            engine.swarm.maxConnections = 55 // Balanced mode default
        }
    }

    return { restoredConnections: uniqueEngines.size, mode: 'normal' }
}

/**
 * Check if currently in degraded mode
 */
export const isInDegradedMode = () => isDegradedMode
