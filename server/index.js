import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs'
import { getClient, addTorrent } from './torrent.js'
import { db } from './db.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Serve static frontend
const distPath = path.join(__dirname, '../client/dist')
app.use(express.static(distPath))

// API: Status
app.get('/api/status', (req, res) => {
    const client = getClient()
    const torrents = client.torrents.map(t => ({
        infoHash: t.infoHash,
        name: t.name,
        progress: t.progress,
        downloadSpeed: t.downloadSpeed,
        numPeers: t.numPeers,
        files: t.files.map((f, index) => ({
            name: f.name,
            length: f.length,
            index
        }))
    }))
    res.json({ torrents })
})

// API: Add Torrent
app.post('/api/add', async (req, res) => {
    const { magnet } = req.body
    if (!magnet) return res.status(400).json({ error: 'Magnet URI required' })

    try {
        const torrent = await addTorrent(magnet)
        res.json({ infoHash: torrent.infoHash, name: torrent.name })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// API: Stream
app.get('/stream/:infoHash/:fileIndex', async (req, res) => {
    const { infoHash, fileIndex } = req.params
    const range = req.headers.range

    const client = getClient()
    const torrent = client.get(infoHash)

    if (!torrent) return res.status(404).send('Torrent not found')

    const file = torrent.files[parseInt(fileIndex)]
    if (!file) return res.status(404).send('File not found')

    // Synology Cache Path Check
    const downloadPath = process.env.DOWNLOAD_PATH
    if (downloadPath && !fs.existsSync(downloadPath)) {
        // Just log error, don't crash. 
        // Note: WebTorrent might have created the directory if it had permissions.
        // If the volume is unmounted, this check helps.
        console.error(`Cache path not accessible: ${downloadPath}`)
        return res.status(500).send('Cache storage not accessible')
    }

    if (!range) {
        const head = {
            'Content-Length': file.length,
            'Content-Type': 'video/mp4', // Simplification, ideally detect mime
        }
        res.writeHead(200, head)
        file.createReadStream().pipe(res)
    } else {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1
        const chunksize = (end - start) + 1

        // Smart Progress Tracking
        // Formula: (startByte / totalBytes) * duration
        // We assume duration is passed in query or we just store percentage if duration unknown
        // User asked for: (startByte / totalBytes) * duration
        // We'll try to get duration from query param ?duration=SECONDS
        const duration = parseFloat(req.query.duration) || 0
        const progressTime = duration > 0 ? (start / file.length) * duration : 0

        // Save to DB
        // Key: infoHash + fileIndex
        const trackKey = `${infoHash}_${fileIndex}`
        db.data.progress[trackKey] = {
            timestamp: Date.now(),
            position: start,
            progressTime: progressTime,
            percentage: (start / file.length) * 100
        }
        await db.write()

        const head = {
            'Content-Range': `bytes ${start}-${end}/${file.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        }

        res.writeHead(206, head)
        file.createReadStream({ start, end }).pipe(res)
    }
})

// Fallback for SPA
app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'))
    } else {
        res.send('Frontend not built. Run npm run client:build')
    }
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
