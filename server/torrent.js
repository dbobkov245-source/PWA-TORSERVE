import torrentStream from 'torrent-stream'
import process from 'process'
import { db } from './db.js'

const engines = new Map()

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

        const path = process.env.DOWNLOAD_PATH || './downloads'
        console.log('[Torrent] Adding magnet, download path:', path)

        let engine
        try {
            engine = torrentStream(magnetURI, {
                path: path,
                connections: 20,       // 📉 RAM-safe limit (Reverted from 50)
                uploads: 0,
                dht: true,             // ✅ DHT enabled (needed for trackerless torrents)
                verify: false          // ⚡ Faster torrent start
            })
        } catch (err) {
            console.error('[Torrent] Failed to create engine:', err.message)
            return reject(err)
        }

        engine.on('ready', () => {
            console.log('[Torrent] Engine ready:', engine.infoHash)

            // ────────────────────────────────────────────────────────
            // Download ALL files (full season download)
            // Priority is set dynamically when streaming starts via prioritizeFile()
            // ────────────────────────────────────────────────────────
            if (engine.files && engine.files.length > 0) {
                engine.files.forEach((file, idx) => {
                    file.select()
                    console.log(`[Torrent] Selected file ${idx}: ${file.name}`)
                })
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

        // Timeout: reject if torrent doesn't connect within 60s
        setTimeout(() => {
            if (!engines.has(magnetURI)) {
                console.warn('[Torrent] Timeout: no peers found')
                engine.destroy()
                reject(new Error('Torrent timeout: no peers found within 60 seconds'))
            }
        }, 60000)
    })
}

export const removeTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (!engine) return false

    console.log('Removing torrent:', infoHash)
    engine.destroy(() => {
        console.log('Engine destroyed:', infoHash)
    })

    // Remove from map (both keys)
    engines.delete(infoHash)
    for (const [key, val] of engines.entries()) {
        if (val === engine) engines.delete(key)
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

const formatEngine = (engine) => {
    const totalSize = engine.files?.reduce((sum, f) => sum + f.length, 0) || 0

    // Get downloaded bytes from swarm (this is the most reliable metric)
    const downloaded = engine.swarm?.downloaded || 0

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
export function prioritizeFile(infoHash, fileIndex) {
    const engine = engines.get(infoHash)
    if (!engine) {
        console.warn('[Priority] Engine not found:', infoHash)
        return false
    }

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
    const fileStart = file.offset || 0
    const fileEnd = fileStart + file.length

    const startPiece = Math.floor(fileStart / pieceLength)
    const endPiece = Math.floor(fileEnd / pieceLength)

    // Priority: first 5% of file OR first 15MB, whichever is smaller
    const priorityBytes = Math.min(file.length * 0.05, 15 * 1024 * 1024)
    const priorityPieces = Math.max(1, Math.ceil(priorityBytes / pieceLength))
    const priorityEnd = Math.min(startPiece + priorityPieces, endPiece)

    try {
        engine.select(startPiece, priorityEnd, true) // true = high priority
        console.log(`[Priority] File ${fileIndex}: pieces ${startPiece}-${priorityEnd} (of ${totalPieces} total)`)
        return true
    } catch (e) {
        console.warn('[Priority] Selection failed:', e.message)
        return false
    }
}
