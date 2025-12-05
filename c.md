# PWA-TorServe v2.1 Platinum: Full Project Code

Complete source code with Self-Healing Architecture, File Hygiene, RAM Safety, and Bug Fixes.

---

## 1. Server

### `server/index.js`
```javascript
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs'
import { addTorrent, getAllTorrents, getTorrent, removeTorrent } from './torrent.js'
import { db } from './db.js'
import { startWatchdog, getServerState } from './watchdog.js'

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

// API: Health Check (lightweight)
app.get('/api/health', (req, res) => {
    const state = getServerState()
    res.json({
        serverStatus: state.serverStatus,
        lastStateChange: state.lastStateChange
    })
})

// API: Status (with server state)
app.get('/api/status', (req, res) => {
    const state = getServerState()

    // Return 503 with Retry-After for critical states
    if (state.serverStatus === 'circuit_open' || state.serverStatus === 'error') {
        res.set('Retry-After', '300') // 5 minutes
        return res.status(503).json({
            serverStatus: state.serverStatus,
            lastStateChange: state.lastStateChange,
            torrents: []
        })
    }

    const torrents = getAllTorrents()
    const status = torrents.map(t => ({
        infoHash: t.infoHash,
        name: t.name,
        progress: t.progress,
        downloadSpeed: t.downloadSpeed,
        numPeers: t.numPeers,
        files: t.files.map(f => ({
            name: f.name,
            length: f.length,
            index: f.index
        }))
    }))

    res.json({
        serverStatus: state.serverStatus,
        lastStateChange: state.lastStateChange,
        torrents: status
    })
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

// API: Remove Torrent (with File Hygiene)
app.delete('/api/delete/:infoHash', (req, res) => {
    const { infoHash } = req.params
    const torrent = getTorrent(infoHash) // Get info BEFORE deletion

    const success = removeTorrent(infoHash)

    if (success) {
        // 🔥 PHYSICAL DELETION (FILE HYGIENE) 🔥
        if (torrent && torrent.name) {
            const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
            const fullPath = path.join(downloadPath, torrent.name)
            try {
                if (fs.existsSync(fullPath)) {
                    fs.rmSync(fullPath, { recursive: true, force: true })
                    console.log(`[File Hygiene] Deleted: ${fullPath}`)
                }
            } catch (e) {
                console.error(`[File Hygiene] Error deleting files: ${e.message}`)
            }
        }
        res.json({ success: true })
    } else {
        res.status(404).json({ error: 'Torrent not found' })
    }
})

// API: Stream
app.get('/stream/:infoHash/:fileIndex', async (req, res) => {
    const { infoHash, fileIndex } = req.params
    const range = req.headers.range

    const torrent = getTorrent(infoHash)
    if (!torrent) return res.status(404).send('Torrent not found')

    const file = torrent.files[fileIndex]
    if (!file) return res.status(404).send('File not found')

    // Synology Cache Path Check
    const downloadPath = process.env.DOWNLOAD_PATH
    if (downloadPath && !fs.existsSync(downloadPath)) {
        console.error(`Cache path not accessible: ${downloadPath}`)
        return res.status(500).send('Cache storage not accessible')
    }

    if (!range) {
        const head = {
            'Content-Length': file.length,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        file.createReadStream().pipe(res)
    } else {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1
        const chunksize = (end - start) + 1

        // Smart Progress Tracking
        const duration = parseFloat(req.query.duration) || 0
        const progressTime = duration > 0 ? (start / file.length) * duration : 0

        // Save to DB (Throttled: max once per 10s per file)
        const trackKey = `${infoHash}_${fileIndex}`
        const now = Date.now()
        const lastUpdate = db.data.progress[trackKey]?.timestamp || 0

        if (now - lastUpdate > 10000) {
            db.data.progress[trackKey] = {
                timestamp: now,
                position: start,
                progressTime: progressTime,
                percentage: (start / file.length) * 100
            }
            await db.write()
        }

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

    // Start watchdog in background (non-blocking)
    startWatchdog().catch(err => {
        console.error('[Server] Watchdog failed:', err.message)
    })
})
```

### `server/db.js`
```javascript
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// Initialize DB
const defaultData = {
    serverStatus: 'ok',        // 'ok' | 'degraded' | 'error' | 'circuit_open'
    lastStateChange: Date.now(),
    storageFailures: 0,
    progress: {}
}
const adapter = new JSONFile('db.json')
const db = new Low(adapter, defaultData)

// Ensure DB is ready and migrate existing data
await db.read()

// Merge defaults with existing data (handles DB migrations)
db.data = { ...defaultData, ...db.data }

// Ensure nested objects are initialized
db.data.progress ||= {}

await db.write()

export { db }
```

### `server/watchdog.js`
```javascript
/**
 * Watchdog Module - Self-Healing Architecture
 * PWA-TorServe v2.1 Platinum
 * 
 * Features:
 * - Non-blocking async monitoring loop with error recovery
 * - RAM monitoring using RSS (real memory usage)
 * - Hysteresis (30s delay before degraded)
 * - NFS Circuit Breaker (3 failures → 5min pause)
 * - Automatic counter reset on recovery
 * - lastStateChange updates on cooldown extend
 */

import { db } from './db.js'
import fs from 'fs'
import path from 'path'

// ─────────────────────────────────────────────────────────────
// Configuration Constants
// ─────────────────────────────────────────────────────────────

const CONFIG = {
    CHECK_INTERVAL_MS: 30000,           // Main loop interval: 30s
    RAM_OK_THRESHOLD_MB: 500,           // Below this = OK
    RAM_DEGRADED_THRESHOLD_MB: 600,     // Above this = Degraded
    HYSTERESIS_DELAY_MS: 30000,         // 30s delay before degraded
    STORAGE_CHECK_TIMEOUT_MS: 5000,     // 5s timeout for storage check
    CIRCUIT_BREAKER_THRESHOLD: 3,       // 3 failures → circuit open
    CIRCUIT_BREAKER_COOLDOWN_MS: 300000 // 5 minutes cooldown
}

// ─────────────────────────────────────────────────────────────
// State Variables
// ─────────────────────────────────────────────────────────────

let degradedSince = null              // Timestamp when RAM first exceeded threshold
let circuitOpenUntil = null           // Timestamp when circuit breaker will retry
let isWatchdogRunning = false

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getRAMUsageMB = () => {
    const used = process.memoryUsage()
    // Use RSS (Resident Set Size) instead of heapUsed
    // RSS includes buffers, video data, and system resources
    // This is what Android actually sees and may kill the process for
    return Math.round(used.rss / 1024 / 1024)
}

/**
 * Check storage accessibility with timeout
 * Creates directory if it doesn't exist
 * @returns {Promise<boolean>} true if storage is accessible
 */
const checkStorage = () => {
    return new Promise((resolve) => {
        // Default to ./downloads (relative to app dir) which works on Android Termux
        const downloadPath = process.env.DOWNLOAD_PATH || './downloads'

        const timeout = setTimeout(() => {
            console.warn('[Watchdog] Storage check timeout!')
            resolve(false)
        }, CONFIG.STORAGE_CHECK_TIMEOUT_MS)

        try {
            // First check if directory exists
            fs.access(downloadPath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                if (err) {
                    // Directory doesn't exist or not accessible - try to create it
                    console.log(`[Watchdog] Creating download directory: ${downloadPath}`)
                    fs.mkdir(downloadPath, { recursive: true }, (mkdirErr) => {
                        clearTimeout(timeout)
                        if (mkdirErr) {
                            console.warn(`[Watchdog] Failed to create directory: ${mkdirErr.message}`)
                            resolve(false)
                        } else {
                            console.log('[Watchdog] Download directory created successfully')
                            resolve(true)
                        }
                    })
                } else {
                    clearTimeout(timeout)
                    resolve(true)
                }
            })
        } catch (err) {
            clearTimeout(timeout)
            console.error(`[Watchdog] Storage check error: ${err.message}`)
            resolve(false)
        }
    })
}

// ─────────────────────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────────────────────

/**
 * Update server status with persistence
 * @param {string} newStatus - 'ok' | 'degraded' | 'error' | 'circuit_open'
 */
const updateStatus = async (newStatus) => {
    const currentStatus = db.data.serverStatus

    if (currentStatus !== newStatus) {
        console.log(`[Watchdog] Status change: ${currentStatus} → ${newStatus}`)
        db.data.serverStatus = newStatus
        db.data.lastStateChange = Date.now()

        // Reset counters on recovery to OK
        if (newStatus === 'ok') {
            db.data.storageFailures = 0
            degradedSince = null
            console.log('[Watchdog] Recovery complete, counters reset')
        }

        await db.write()
    }
}

/**
 * Main watchdog check cycle
 */
const performCheck = async () => {
    const now = Date.now()
    const ramMB = getRAMUsageMB()

    // ─── Circuit Breaker Check ───
    if (circuitOpenUntil) {
        if (now < circuitOpenUntil) {
            // Still in cooldown, skip all checks
            const remainingMs = circuitOpenUntil - now
            console.log(`[Watchdog] Circuit open, retry in ${Math.round(remainingMs / 1000)}s`)
            return
        }

        // Cooldown expired, attempt recovery
        console.log('[Watchdog] Circuit breaker: attempting recovery...')
        const storageOk = await checkStorage()

        if (storageOk) {
            circuitOpenUntil = null
            await updateStatus('ok')
            console.log('[Watchdog] Circuit breaker: recovery successful!')
        } else {
            // Retry failed, extend cooldown
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            // Update lastStateChange so client shows correct elapsed time
            db.data.lastStateChange = now
            await db.write()
            console.warn('[Watchdog] Circuit breaker: recovery failed, extending cooldown')
        }
        return
    }

    // ─── Storage Check ───
    const storageOk = await checkStorage()

    if (!storageOk) {
        db.data.storageFailures = (db.data.storageFailures || 0) + 1
        console.warn(`[Watchdog] Storage failure #${db.data.storageFailures}`)

        if (db.data.storageFailures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            await updateStatus('circuit_open')
            console.error('[Watchdog] Circuit breaker OPEN! Pausing checks for 5 minutes.')
            return
        }
    } else {
        // Storage OK, reset failure counter
        if (db.data.storageFailures > 0) {
            db.data.storageFailures = 0
            await db.write()
        }
    }

    // ─── RAM Check with Hysteresis ───
    if (ramMB > CONFIG.RAM_DEGRADED_THRESHOLD_MB) {
        if (!degradedSince) {
            degradedSince = now
            console.log(`[Watchdog] RAM ${ramMB}MB > threshold, starting hysteresis timer`)
        } else if (now - degradedSince >= CONFIG.HYSTERESIS_DELAY_MS) {
            await updateStatus('degraded')
        }
    } else if (ramMB < CONFIG.RAM_OK_THRESHOLD_MB) {
        // RAM is OK
        if (db.data.serverStatus === 'degraded') {
            await updateStatus('ok')
        }
        degradedSince = null
    }

    // Log current state
    console.log(`[Watchdog] RAM: ${ramMB}MB | Status: ${db.data.serverStatus} | Storage Failures: ${db.data.storageFailures}`)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Start the async watchdog loop
 */
export const startWatchdog = async () => {
    if (isWatchdogRunning) {
        console.warn('[Watchdog] Already running!')
        return
    }

    isWatchdogRunning = true
    console.log('[Watchdog] Starting async monitoring loop...')

    // Initial check
    try {
        await performCheck()
    } catch (err) {
        console.error('[Watchdog] Initial check failed:', err.message)
    }

    // Non-blocking loop with error recovery
    while (isWatchdogRunning) {
        await sleep(CONFIG.CHECK_INTERVAL_MS)
        try {
            await performCheck()
        } catch (err) {
            // Log error but DON'T crash - watchdog must survive
            console.error('[Watchdog] Check failed, will retry:', err.message)
        }
    }
}

/**
 * Stop the watchdog loop
 */
export const stopWatchdog = () => {
    isWatchdogRunning = false
    console.log('[Watchdog] Stopped')
}

/**
 * Get current server state for API responses
 */
export const getServerState = () => {
    return {
        serverStatus: db.data.serverStatus,
        lastStateChange: db.data.lastStateChange,
        storageFailures: db.data.storageFailures
    }
}
```

### `server/torrent.js`
```javascript
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
        const engine = torrentStream(magnetURI, {
            path: path,
            connections: 20,       // 📉 RAM-safe limit (was 55)
            uploads: 0,
            dht: false,            // 🚫 DHT disabled (saves significant RAM)
            verify: false          // ⚡ Faster torrent start
        })

        engine.on('ready', () => {
            console.log('Torrent engine ready:', engine.infoHash)
            engines.set(magnetURI, engine)
            engines.set(engine.infoHash, engine)
            resolve(formatEngine(engine))
        })

        // Timeout: reject if torrent doesn't connect within 30s
        setTimeout(() => {
            if (!engines.has(magnetURI)) {
                engine.destroy()
                reject(new Error('Torrent timeout: no peers found within 30 seconds'))
            }
        }, 30000)
    })
}

export const removeTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (!engine) return false

    console.log('Removing torrent:', infoHash)
    engine.destroy(() => {
        console.log('Engine destroyed:', infoHash)
    })

    // Remove from map (both keys) - prevents memory leak
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

export const getAllTorrents = () => {
    const uniqueEngines = new Set(engines.values())
    return Array.from(uniqueEngines).map(formatEngine)
}

const formatEngine = (engine) => {
    return {
        infoHash: engine.infoHash,
        name: engine.torrent?.name || 'Unknown Torrent',
        progress: 0,
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
```

---

## 2. Client

### `client/src/App.jsx`
```jsx
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

// ─────────────────────────────────────────────────────────────
// Server Status Components
// ─────────────────────────────────────────────────────────────

const DegradedBanner = ({ lastStateChange }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!lastStateChange) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - lastStateChange) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastStateChange])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <div className="bg-yellow-600/90 text-yellow-100 p-4 rounded-lg mb-6 border border-yellow-500 animate-pulse">
      <div className="flex items-center gap-3">
        <span className="text-2xl">❄️</span>
        <div>
          <div className="font-bold text-lg">Cooling Down</div>
          <div className="text-sm opacity-90">
            High memory usage detected. Service may be slower.
            <span className="ml-2 font-mono">{formatTime(elapsed)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const ErrorScreen = ({ status, retryAfter, onRetry }) => {
  const [countdown, setCountdown] = useState(retryAfter || 300)

  useEffect(() => {
    if (countdown <= 0) {
      onRetry()
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, onRetry])

  const isCircuitOpen = status === 'circuit_open'
  const icon = isCircuitOpen ? '🔌' : '⚠️'
  const title = isCircuitOpen ? 'Storage Unavailable' : 'Server Error'
  const message = isCircuitOpen
    ? 'NFS/Storage is not responding. The server will retry automatically.'
    : 'A critical error occurred. Please wait for recovery.'

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-red-900/30 border border-red-700 rounded-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">{icon}</div>
        <h1 className="text-2xl font-bold text-red-400 mb-2">{title}</h1>
        <p className="text-gray-300 mb-6">{message}</p>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Auto-retry in</div>
          <div className="text-3xl font-mono text-white">
            {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
          </div>
        </div>

        <button
          onClick={onRetry}
          className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
        >
          Retry Now
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────

function App() {
  const defaultUrl = Capacitor.isNativePlatform()
    ? (localStorage.getItem('serverUrl') || 'http://192.168.1.88:3000')
    : ''

  const [serverUrl, setServerUrl] = useState(defaultUrl)
  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [expanded, setExpanded] = useState({})

  // Server status state
  const [serverStatus, setServerStatus] = useState('ok')
  const [lastStateChange, setLastStateChange] = useState(null)
  const [retryAfter, setRetryAfter] = useState(null)

  const getApiUrl = (path) => {
    if (serverUrl) {
      const base = serverUrl.replace(/\/$/, '')
      return `${base}${path}`
    }
    return path
  }

  const saveServerUrl = (url) => {
    setServerUrl(url)
    localStorage.setItem('serverUrl', url)
    setShowSettings(false)
    fetchStatus()
  }

  const fetchStatus = async () => {
    try {
      const res = await fetch(getApiUrl('/api/status'))

      if (res.status === 503) {
        const retryHeader = res.headers.get('Retry-After')
        setRetryAfter(retryHeader ? parseInt(retryHeader, 10) : 300)
      }

      const data = await res.json()
      setServerStatus(data.serverStatus || 'ok')
      setLastStateChange(data.lastStateChange || null)
      setTorrents(data.torrents || [])
      setError(null)

      if (data.serverStatus === 'ok') {
        setRetryAfter(null)
      }
    } catch (err) {
      console.error('Error fetching status:', err)
      if (torrents.length === 0) {
        setError(`Connection Error: ${err.message}. Check Server URL.`)
      }
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [serverUrl])

  const toggleExpand = (infoHash) => {
    setExpanded(prev => ({ ...prev, [infoHash]: !prev[infoHash] }))
  }

  const addTorrent = async (e) => {
    e.preventDefault()
    if (!magnet) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(getApiUrl('/api/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet })
      })
      if (!res.ok) throw new Error(await res.text())
      setMagnet('')
      fetchStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteTorrent = async (infoHash) => {
    if (!confirm('Remove this torrent?')) return
    try {
      await fetch(getApiUrl(`/api/delete/${infoHash}`), { method: 'DELETE' })
      fetchStatus()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const getStreamUrl = (infoHash, fileIndex) => {
    if (serverUrl) {
      const base = serverUrl.replace(/\/$/, '')
      return `${base}/stream/${infoHash}/${fileIndex}`
    }
    const protocol = window.location.protocol
    const host = window.location.host
    return `${protocol}//${host}/stream/${infoHash}/${fileIndex}`
  }

  const handlePlay = (infoHash, fileIndex, fileName) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    console.log('[Play] Opening stream:', streamUrl)
    window.open(streamUrl, '_blank')
  }

  // ─── Render Error Screen for critical states ───
  if (serverStatus === 'circuit_open' || serverStatus === 'error') {
    return (
      <ErrorScreen
        status={serverStatus}
        retryAfter={retryAfter || 300}
        onRetry={fetchStatus}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans overflow-x-hidden max-w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-500">PWA-TorServe</h1>
        <div className="flex gap-4">
          <button onClick={fetchStatus} className="text-gray-400 hover:text-white" title="Refresh">🔄</button>
          <button onClick={() => setShowSettings(!showSettings)} className="text-gray-400 hover:text-white" title="Settings">⚙️</button>
        </div>
      </div>

      {serverStatus === 'degraded' && (
        <DegradedBanner lastStateChange={lastStateChange} />
      )}

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
          <label className="block text-sm text-gray-400 mb-2">Server URL (for APK)</label>
          <div className="flex gap-2">
            <input
              type="text"
              defaultValue={serverUrl}
              onBlur={(e) => saveServerUrl(e.target.value)}
              placeholder="http://192.168.1.88:3000"
              className="flex-1 p-2 rounded bg-gray-900 border border-gray-600 text-white"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Current: {serverUrl || 'Relative (Web Mode)'}</p>
        </div>
      )}

      <form onSubmit={addTorrent} className="mb-8 max-w-2xl mx-auto flex gap-2">
        <input
          type="text"
          value={magnet}
          onChange={(e) => setMagnet(e.target.value)}
          placeholder="Paste Magnet URI..."
          className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold disabled:opacity-50 transition-colors"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </form>

      {error && <div className="text-red-500 text-center mb-4 bg-red-900/20 p-2 rounded">{error}</div>}

      <div className="grid gap-4 max-w-4xl mx-auto">
        {torrents.map((t) => (
          <div key={t.infoHash} className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div
              className="flex justify-between items-start mb-2 cursor-pointer select-none"
              onClick={() => toggleExpand(t.infoHash)}
            >
              <h2 className="text-xl font-semibold truncate flex-1 mr-4 text-gray-100 flex items-center gap-2">
                <span className="text-gray-500 text-sm">{expanded[t.infoHash] ? '▼' : '▶'}</span>
                {t.name || 'Fetching Metadata...'}
              </h2>
              <div className="text-right">
                <div className="text-sm text-gray-400">
                  {(t.progress * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  {(t.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s • {t.numPeers} peers
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${t.progress * 100}%` }}></div>
            </div>

            {expanded[t.infoHash] && (
              <div className="space-y-2 animate-fade-in">
                {t.files.map((f) => (
                  <div key={f.index} className="flex justify-between items-center bg-gray-700/50 p-3 rounded hover:bg-gray-700 transition-colors">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="truncate text-sm font-medium">{f.name}</div>
                      <div className="text-xs text-gray-400">{(f.length / 1024 / 1024).toFixed(0)} MB</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const streamUrl = getStreamUrl(t.infoHash, f.index)
                          navigator.clipboard.writeText(streamUrl)
                          alert('Link copied! Paste in VLC/MX Player')
                        }}
                        className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm font-bold shadow-sm transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlay(t.infoHash, f.index, f.name)
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition-colors whitespace-nowrap"
                      >
                        Play
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => deleteTorrent(t.infoHash)}
                className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 hover:bg-red-900/20 rounded transition-colors"
              >
                Remove Torrent
              </button>
            </div>
          </div>
        ))}
        {torrents.length === 0 && (
          <div className="text-center text-gray-500 mt-10 p-8 bg-gray-800/50 rounded-lg border border-gray-700 border-dashed">
            No active torrents. Add a magnet link to start.
          </div>
        )}
      </div>
    </div>
  )
}

export default App
```

### `client/src/index.css`
```css
@import "tailwindcss";

/* Prevent horizontal overflow */
html, body {
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
}

#root {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .p-4 { padding: 0.75rem; }
  .text-3xl { font-size: 1.5rem; }
  .text-xl { font-size: 1rem; }
  .flex.gap-2 { flex-wrap: wrap; }
  .flex.gap-2 > button,
  .flex.gap-2 > a {
    flex: 1 1 auto;
    min-width: 60px;
    text-align: center;
  }
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 3. Deploy Script

### `deploy_to_ugoos.sh`
```bash
#!/usr/bin/expect -f

set timeout 20
set ip "192.168.1.88"
set port 8022
set user "u0_a203"
set password "qwer"
set dest_base "~/pwa-torserve"

proc copy_file {src dest ip port user password} {
    puts "Copying $src to $dest..."
    spawn scp -P $port -o StrictHostKeyChecking=no $src $user@$ip:$dest
    expect { "password:" { send "$password\r" } }
    expect eof
}

copy_file "server/index.js" "$dest_base/server/" $ip $port $user $password
copy_file "server/torrent.js" "$dest_base/server/" $ip $port $user $password
copy_file "server/db.js" "$dest_base/server/" $ip $port $user $password
copy_file "server/watchdog.js" "$dest_base/server/" $ip $port $user $password

puts "Copying client/dist..."
spawn scp -P $port -r -o StrictHostKeyChecking=no client/dist $user@$ip:$dest_base/client/
expect { "password:" { send "$password\r" } }
expect eof

puts "Deployment finished."
```

---

## Summary of v2.1 Platinum Fixes

| Category | Fix | Status |
|----------|-----|--------|
| **File Hygiene** | `fs.rmSync()` при удалении торрента | ✅ |
| **RAM Safety** | `connections: 20`, `dht: false`, `verify: false` | ✅ |
| **RAM Monitoring** | RSS вместо heapUsed | ✅ |
| **Bug 1** | lastStateChange обновляется при extend cooldown | ✅ |
| **Bug 3** | try/catch в watchdog loop | ✅ |
| **Torrent Timeout** | reject + destroy после 30s | ✅ |
| **Memory Leak** | Удаление обоих ключей из Map | ✅ |
