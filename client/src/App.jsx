import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapacitorApp } from '@capacitor/app'

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
  // Default to current origin if web, or a default IP if native
  const defaultUrl = Capacitor.isNativePlatform()
    ? (localStorage.getItem('serverUrl') || 'http://192.168.1.88:3000')
    : '' // Relative path for web

  const [serverUrl, setServerUrl] = useState(defaultUrl)
  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [expanded, setExpanded] = useState({}) // { infoHash: boolean }

  // Server status state
  const [serverStatus, setServerStatus] = useState('ok')
  const [lastStateChange, setLastStateChange] = useState(null)
  const [retryAfter, setRetryAfter] = useState(null)

  const getApiUrl = (path) => {
    if (serverUrl) {
      // Remove trailing slash from serverUrl if present
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

      // Handle 503 with Retry-After header
      if (res.status === 503) {
        const retryHeader = res.headers.get('Retry-After')
        setRetryAfter(retryHeader ? parseInt(retryHeader, 10) : 300)
      }

      const data = await res.json()

      // Update server status
      setServerStatus(data.serverStatus || 'ok')
      setLastStateChange(data.lastStateChange || null)

      // Update torrents (may be empty on error states)
      setTorrents(data.torrents || [])
      setError(null)

      // Clear retry state on successful OK status
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

  // ─── Magnet Link Handler (Deep Link) ───
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const handleAppUrlOpen = async (event) => {
      console.log('[AppUrlOpen] Received URL:', event.url)

      if (event.url && event.url.startsWith('magnet:')) {
        setLoading(true)
        setError(null)
        try {
          const res = await fetch(getApiUrl('/api/add'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ magnet: event.url })
          })
          if (!res.ok) {
            const errorText = await res.text()
            throw new Error(errorText)
          }
          console.log('[Magnet] Added successfully')
          fetchStatus()
        } catch (err) {
          console.error('[Magnet] Failed to add:', err)
          setError(`Failed to add magnet: ${err.message}`)
        } finally {
          setLoading(false)
        }
      }
    }

    // Add listener
    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen)

    // Cleanup on unmount
    return () => {
      CapacitorApp.removeAllListeners()
    }
  }, [serverUrl]) // Re-subscribe if serverUrl changes

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Reduced frequency for TV performance
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

  // Get direct HTTP stream URL
  const getStreamUrl = (infoHash, fileIndex) => {
    if (serverUrl) {
      const base = serverUrl.replace(/\/$/, '')
      return `${base}/stream/${infoHash}/${fileIndex}`
    }
    // For web mode, use full URL with current host
    const protocol = window.location.protocol
    const host = window.location.host
    return `${protocol}//${host}/stream/${infoHash}/${fileIndex}`
  }

  // Handle Play button - open stream URL
  // Uses Capacitor Browser plugin on Android for external player
  const handlePlay = async (infoHash, fileIndex, fileName) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    console.log('[Play] Opening stream:', streamUrl)

    // On Android native app, use Browser plugin to open in external app
    if (Capacitor.isNativePlatform()) {
      try {
        // Open URL in system browser which will show "Open with" dialog
        await Browser.open({
          url: streamUrl,
          windowName: '_system' // Force external
        })
      } catch (e) {
        console.error('[Play] Browser.open failed:', e)
        // Fallback to window.open
        window.open(streamUrl, '_blank')
      }
    } else {
      // Browser: open in new tab
      window.open(streamUrl, '_blank')
    }
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

      {/* ─── Degraded Status Banner ─── */}
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
                  <div key={f.index} className="bg-gray-700/50 p-3 rounded hover:bg-gray-700 transition-colors">
                    <div className="mb-2">
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
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm font-bold shadow-sm transition-colors"
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlay(t.infoHash, f.index, f.name)
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-bold shadow-sm transition-colors"
                      >
                        ▶️ Play
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
