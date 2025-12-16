import torrentStream from 'torrent-stream'
import process from 'process'
import fs from 'fs'
import path from 'path'
import { db } from './db.js'

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
// Keep-Alive: Frozen torrents for instant resume (30 min TTL)
// ────────────────────────────────────────────────────────
const frozenTorrents = new Map() // infoHash -> { engine, frozenAt, magnetURI }
const FROZEN_TTL = 30 * 60 * 1000 // 30 minutes

// Cleanup expired frozen torrents every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [hash, frozen] of frozenTorrents.entries()) {
        if (now - frozen.frozenAt > FROZEN_TTL) {
            console.log(`[Keep-Alive] Expired, destroying: ${hash}`)
            frozen.engine.destroy()
            frozenTorrents.delete(hash)
        }
    }
}, 5 * 60 * 1000)

// ────────────────────────────────────────────────────────
// Persistence: Save/Remove torrents to db.json
// ────────────────────────────────────────────────────────
async function saveTorrentToDB(magnetURI, name) {
    db.data.torrents ||= []
    // Avoid duplicates
    if (!db.data.torrents.find(t => t.magnet === magnetURI)) {
        db.data.torrents.push({ magnet: magnetURI, name, addedAt: Date.now() })
        await db.write()
        console.log('[Persistence] Saved torrent:', name)
    }
}

async function removeTorrentFromDB(infoHash) {
    db.data.torrents ||= []
    const before = db.data.torrents.length
    db.data.torrents = db.data.torrents.filter(t => !t.magnet.includes(infoHash))
    if (db.data.torrents.length < before) {
        await db.write()
        console.log('[Persistence] Removed torrent from DB:', infoHash)
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

export const addTorrent = (magnetURI, skipSave = false) => {
    return new Promise((resolve, reject) => {
        // Simple duplicate check
        for (const [key, engine] of engines.entries()) {
            if (key === magnetURI) {
                console.log('Torrent engine already exists for this magnet')
                return resolve(formatEngine(engine))
            }
        }

        // Check frozen torrents (Keep-Alive: instant resume!)
        for (const [hash, frozen] of frozenTorrents.entries()) {
            if (frozen.magnetURI === magnetURI || magnetURI.includes(hash)) {
                console.log(`[Keep-Alive] Reusing frozen torrent: ${hash}`)
                const engine = frozen.engine
                frozenTorrents.delete(hash)
                engines.set(magnetURI, engine)
                engines.set(engine.infoHash, engine)
                return resolve(formatEngine(engine))
            }
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
            console.log('[Torrent] Engine ready:', engine.infoHash)

            // ────────────────────────────────────────────────────────
            // Download ALL files + AGGRESSIVE PRIORITIZATION
            // Prioritize first video file immediately for instant playback
            // ────────────────────────────────────────────────────────
            if (engine.files && engine.files.length > 0) {
                let firstVideoIdx = -1
                engine.files.forEach((file, idx) => {
                    file.select()
                    // Find first video file
                    if (firstVideoIdx === -1 && /\.(mp4|mkv|avi|webm|mov)$/i.test(file.name)) {
                        firstVideoIdx = idx
                    }
                })

                // Aggressive priority: immediately prioritize first video
                if (firstVideoIdx >= 0) {
                    console.log(`[Torrent] Auto-prioritizing first video: ${engine.files[firstVideoIdx].name}`)
                    prioritizeFileInternal(engine, firstVideoIdx)
                }
            }

            engines.set(magnetURI, engine)
            engines.set(engine.infoHash, engine)

            // Save to DB for persistence (unless restoring)
            if (!skipSave) {
                saveTorrentToDB(magnetURI, engine.torrent?.name || 'Unknown')
            }

            resolve(formatEngine(engine))
        })

        engine.on('error', (err) => {
            console.error('[Torrent] Engine error:', err.message)
            engine.destroy()
            reject(err)
        })

        // 🔥 STRATEGY 3: Increased Timeout (90s)
        setTimeout(() => {
            if (!engines.has(magnetURI)) {
                console.warn('[Torrent] Timeout: no peers found')
                engine.destroy()
                reject(new Error('Torrent timeout: no peers found within 90 seconds'))
            }
        }, 90000)
    })
}

export const removeTorrent = (infoHash, forceDestroy = false) => {
    const engine = engines.get(infoHash)
    if (!engine) return false

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
    for (const [key, val] of engines.entries()) {
        if (val === engine) engines.delete(key)
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

export const getAllTorrents = () => {
    const uniqueEngines = new Set(engines.values())
    return Array.from(uniqueEngines).map(formatEngine)
}

// ────────────────────────────────────────────────────────
// Calculate actual downloaded bytes from disk
// This ensures correct progress after server restart
// ────────────────────────────────────────────────────────
function getDownloadedFromDisk(engine) {
    const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
    const torrentName = engine.torrent?.name
    if (!torrentName || !engine.files) return 0

    let totalDownloaded = 0
    const torrentPath = path.join(downloadPath, torrentName)

    for (const file of engine.files) {
        try {
            // For single-file torrents, file.path might be just the filename
            // For multi-file torrents, it includes subfolder
            const filePath = path.join(downloadPath, file.path)
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath)
                totalDownloaded += stats.size
            }
        } catch (e) {
            // File doesn't exist or not accessible
        }
    }
    return totalDownloaded
}

const formatEngine = (engine) => {
    const totalSize = engine.files?.reduce((sum, f) => sum + f.length, 0) || 0

    // Get downloaded bytes: prefer disk check for accuracy after restart
    const diskDownloaded = getDownloadedFromDisk(engine)
    const swarmDownloaded = engine.swarm?.downloaded || 0

    // Use disk value if larger (handles restart scenario)
    // Otherwise use swarm value (more accurate during active download)
    const downloaded = Math.max(diskDownloaded, swarmDownloaded)

    // Calculate progress (0-1)
    const progress = totalSize > 0 ? Math.min(downloaded / totalSize, 1) : 0

    // Get download speed
    const downloadSpeed = engine.swarm?.downloadSpeed() || 0

    // Calculate ETA (seconds remaining)
    let eta = null
    if (downloadSpeed > 0 && progress < 1) {
        const remaining = totalSize - downloaded
        eta = Math.round(remaining / downloadSpeed)
    }

    return {
        infoHash: engine.infoHash,
        name: engine.torrent?.name || 'Unknown Torrent',
        progress: progress,
        isReady: progress >= 0.99, // 99%+ считается завершённым
        downloaded: downloaded,
        totalSize: totalSize,
        downloadSpeed: downloadSpeed,
        uploadSpeed: engine.swarm?.uploadSpeed() || 0,
        numPeers: engine.swarm?.wires?.length || 0,
        eta: eta, // seconds remaining
        files: engine.files ? engine.files.map((file, index) => ({
            name: file.name,
            length: file.length,
            path: file.path,
            index: index
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
    if (!engine || !engine.swarm) return

    // If still in Eco Mode (< 65), boost it!
    if (engine.swarm.maxConnections < 65) {
        console.log(`[Turbo] 🚀 Boosting connections for ${infoHash}: 20 -> 65`)
        engine.swarm.maxConnections = 65
        if (engine.discover) engine.discover()
        engine.swarm.resume()
    }
}
