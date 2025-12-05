import torrentStream from 'torrent-stream'
import process from 'process'

const engines = new Map()

export const addTorrent = (magnetURI) => {
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
                connections: 20,       // 📉 RAM-safe limit
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
            engines.set(magnetURI, engine)
            engines.set(engine.infoHash, engine)
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
    return {
        infoHash: engine.infoHash,
        name: engine.torrent?.name || 'Unknown Torrent',
        progress: 0, // torrent-stream doesn't provide easy progress
        downloadSpeed: engine.swarm?.downloadSpeed() || 0,
        uploadSpeed: engine.swarm?.uploadSpeed() || 0,
        numPeers: engine.swarm?.wires?.length || 0,
        files: engine.files ? engine.files.map((file, index) => ({
            name: file.name,
            length: file.length,
            path: file.path,
            index: index
        })) : []
    }
}
