import { useState, useEffect } from 'react'
import { registerPlugin } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapacitorApp } from '@capacitor/app'

// Register Custom Java Bridge
const TVPlayer = registerPlugin('TVPlayer')

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
  // Debug Logging State
  // Trap Global Errors
  useEffect(() => {
    const handleError = (event) => {
      console.error(`ERROR: ${event.message || event.reason}`)
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleError)

    console.log('App Started. Version: v1.0.0 (Release)')
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleError)
    }
  }, [])

  // Default to current origin if web, or a default IP if native
  const defaultUrl = Capacitor.isNativePlatform()
    ? (localStorage.getItem('serverUrl') || 'http://192.168.1.70:3000') // Updated default IP
    : '' // Relative path for web

  const [serverUrl, setServerUrl] = useState(defaultUrl)
  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showServerInput, setShowServerInput] = useState(false)
  const [selectedTorrent, setSelectedTorrent] = useState(null)
  // const [showDebug, setShowDebug] = useState(true) // Removed for release

  // Detect if running on TV (large screen + no touch)
  const [isTV, setIsTV] = useState(false)

  useEffect(() => {
    const checkIsTV = () => {
      const largeScreen = window.innerWidth >= 1280
      const noTouch = !('ontouchstart' in window)
      setIsTV(largeScreen && noTouch)
    }
    checkIsTV()
    window.addEventListener('resize', checkIsTV)
    return () => window.removeEventListener('resize', checkIsTV)
  }, [])

  // Player preference: 'system' | 'vimu' | 'vlc' | 'mx'
  const [preferredPlayer, setPreferredPlayer] = useState(
    localStorage.getItem('preferredPlayer') || 'system'
  )

  // Server status state
  const [serverStatus, setServerStatus] = useState('ok')
  const [lastStateChange, setLastStateChange] = useState(null)
  const [retryAfter, setRetryAfter] = useState(null)

  // ─── Manual Focus Management (Fix for TV Remote) ───
  useEffect(() => {
    if (selectedTorrent) {
      console.log('Modal Opened. Forcing focus to Watch button...')
      setTimeout(() => {
        const watchBtn = document.querySelector('.details-btn-watch')
        if (watchBtn) watchBtn.focus()
      }, 300)
    }
  }, [selectedTorrent])

  // Save player preference
  const savePreferredPlayer = (player) => {
    setPreferredPlayer(player)
    localStorage.setItem('preferredPlayer', player)
  }

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

  // ─── Magnet Link Handler (Deep Link) ───
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const handleAppUrlOpen = async (event) => {
      console.log(`[AppUrlOpen] Received URL: ${event.url}`)

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
          console.error(`[Magnet] Failed to add: ${err.message}`)
          setError(`Failed to add magnet: ${err.message}`)
        } finally {
          setLoading(false)
        }
      }
    }

    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen)
    return () => {
      CapacitorApp.removeAllListeners()
    }
  }, [serverUrl])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [serverUrl])

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
      console.log('Magnet added successfully')
      fetchStatus()
    } catch (err) {
      console.error(`Add Error: ${err.message}`)
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
    const protocol = window.location.protocol
    const host = window.location.host
    return `${protocol}//${host}/stream/${infoHash}/${fileIndex}`
  }

  // Handle Play button - use Native Java Bridge
  const handlePlay = async (infoHash, fileIndex, fileName) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    const pkg = "net.gtvbox.videoplayer" // Vimu default

    console.log(`[Play] Native Bridge: ${streamUrl} via ${pkg}`)

    try {
      await TVPlayer.play({
        url: streamUrl,
        package: pkg
      })
      console.log("[Play] TVPlayer.play() resolved successfully")
    } catch (e) {
      console.error(`[Play] Bridge launch failed: ${e.message}`)
      try {
        await TVPlayer.play({ url: streamUrl, package: "" })
        console.log("[Play] Fallback system chooser called")
      } catch (err) {
        console.error(`[Play] Fallback failed: ${err.message}`)
        alert("Error launching player: " + err.message)
      }
    }
  }

  const copyStreamUrl = (infoHash, fileIndex) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(streamUrl).then(() => {
        alert('URL скопирован! Вставьте его в любой плеер.')
      }).catch(err => {
        alert('Ошибка копирования: ' + err.message)
      })
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = streamUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('URL скопирован (fallback)!')
      } catch (err) {
        alert('Не удалось скопировать URL')
      }
      document.body.removeChild(textArea);
    }
  }

  // ─── Hardware Back Button & Keyboard Handling ───
  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', () => {
      // console.log('Hardware Back Button Pressed')
      if (selectedTorrent) {
        setSelectedTorrent(null)
      } else if (showSettings) {
        setShowSettings(false)
      } else {
        CapacitorApp.minimizeApp()
      }
    })

    const keyListener = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (selectedTorrent) setSelectedTorrent(null)
        if (showSettings) setShowSettings(false)
      }
    }
    window.addEventListener('keydown', keyListener)

    return () => {
      backListener.then(h => h.remove())
      window.removeEventListener('keydown', keyListener)
    }
  }, [selectedTorrent, showSettings])

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
      {/* (Debug overlay removed) */}

      <div className="flex justify-between items-center mb-6 pl-4 pr-4">
        <h1 className="text-3xl font-bold text-blue-500">PWA-TorServe (v1.0.0)</h1>
        <div className="flex gap-4">
          {/* Debug button removed */}
          <button onClick={fetchStatus} className="text-gray-400 hover:text-white" title="Refresh">🔄</button>
          <button onClick={() => setShowSettings(!showSettings)} className="text-gray-400 hover:text-white" title="Settings">⚙️</button>
        </div>
      </div>

      {serverStatus === 'degraded' && (
        <DegradedBanner lastStateChange={lastStateChange} />
      )}

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-400">Server URL (for APK)</label>
              <button
                onClick={() => setShowServerInput(!showServerInput)}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded border border-gray-600 tv-focusable tabIndex={0}"
              >
                {showServerInput ? 'Hide' : 'Edit'}
              </button>
            </div>

            {showServerInput && (
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue={serverUrl}
                  onBlur={(e) => saveServerUrl(e.target.value)}
                  placeholder="http://192.168.1.88:3000"
                  className="flex-1 p-2 rounded bg-gray-900 border border-gray-600 text-white"
                  autoFocus
                />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Current: {serverUrl || 'Relative (Web Mode)'}</p>
          </div>

          {Capacitor.isNativePlatform() && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">🎬 Video Player</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'system', name: '📱 System Chooser', desc: 'Ask every time' },
                  { id: 'vimu', name: '🟣 Vimu Player', desc: 'Best for TV' },
                  { id: 'vlc', name: '🔶 VLC Android', desc: 'Reliable fallback' },
                  { id: 'mx', name: '🔵 MX Player', desc: 'Advanced features' },
                ].map((player) => (
                  <button
                    key={player.id}
                    onClick={() => savePreferredPlayer(player.id)}
                    tabIndex={0}
                    className={`
                       flex items-center justify-between p-3 rounded-lg border transition-all text-left tv-focusable
                       ${preferredPlayer === player.id
                        ? 'bg-blue-600 border-blue-400 ring-2 ring-blue-400/50'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}
                     `}
                  >
                    <div>
                      <div className="font-bold">{player.name}</div>
                      <div className="text-xs opacity-75">{player.desc}</div>
                    </div>
                    {preferredPlayer === player.id && <span>✅</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selected player will open automatically when you press Play.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center mb-8">
        {!showServerInput && (
          <button
            onClick={() => setShowServerInput(true)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full font-bold transition-all shadow-lg flex items-center gap-2 tv-focusable"
          >
            ➕ Add Magnet Link
          </button>
        )}
      </div>

      {showServerInput && (
        <form onSubmit={addTorrent} className="mb-8 max-w-2xl mx-auto flex gap-2 animate-fade-in bg-gray-800 p-4 rounded-xl border border-gray-700">
          <input
            type="text"
            value={magnet}
            onChange={(e) => setMagnet(e.target.value)}
            placeholder="Paste Magnet URI..."
            autoFocus
            className="flex-1 p-3 rounded bg-gray-900 border border-gray-600 focus:outline-none focus:border-blue-500 text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold disabled:opacity-50"
          >
            {loading ? '...' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => setShowServerInput(false)}
            className="px-4 py-3 rounded hover:bg-gray-700 text-gray-400"
          >
            ✕
          </button>
        </form>
      )}

      {error && <div className="text-red-500 text-center mb-4 bg-red-900/20 p-2 rounded max-w-2xl mx-auto">{error}</div>}

      <div className="netflix-grid">
        {torrents.map((t) => {
          const progress = Math.round((t.progress || 0) * 100)
          const isReady = progress >= 100 || t.files?.length > 0

          return (
            <button
              key={t.infoHash}
              tabIndex={0}
              onClick={() => {
                console.log(`Selected torrent: ${t.name}`)
                setSelectedTorrent(t)
              }}
              className={`torrent-card tv-card ${isReady ? 'ready' : ''}`}
            >
              <div>
                <div className="text-4xl mb-2">🎬</div>
                <div className="torrent-card-title">
                  {t.name || 'Fetching Metadata...'}
                </div>
              </div>

              <div>
                <div className="torrent-card-status">
                  <span>{isReady ? '✅ Ready' : `⏳ ${progress}%`}</span>
                  <span>• {t.numPeers || 0} peers</span>
                </div>
                <div className="torrent-card-progress">
                  <div
                    className="torrent-card-progress-bar"
                    style={{ width: `${Math.max(progress, 5)}%` }}
                  />
                </div>
              </div>
            </button>
          )
        })}

        {torrents.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-16 px-8 bg-gray-800/30 rounded-2xl border-2 border-gray-700 border-dashed">
            <div className="text-5xl mb-4">📺</div>
            <div className="text-xl font-semibold mb-2">No Active Torrents</div>
            <div className="text-sm">Add a magnet link or open a .torrent file to start</div>
          </div>
        )}
      </div>

      {selectedTorrent && (
        <div
          className="details-overlay"
          onClick={() => setSelectedTorrent(null)}
        >
          <div
            className="details-modal animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="details-title">{selectedTorrent.name}</h2>

            <button
              className="details-btn-watch tv-btn-primary"
              tabIndex={0}
              onClick={() => {
                console.log('Watch Clicked')
                const videoExts = ['.mp4', '.mkv', '.avi', '.webm', '.mov']
                const videoFile = selectedTorrent.files?.find(f =>
                  videoExts.some(ext => f.name?.toLowerCase().endsWith(ext))
                ) || selectedTorrent.files?.[0]

                if (videoFile) {
                  handlePlay(selectedTorrent.infoHash, videoFile.index, videoFile.name)
                } else {
                  console.log('No video files found!')
                  alert('No playable files found')
                }
              }}
            >
              ▶ WATCH
            </button>

            <button
              tabIndex={0}
              className="details-btn-delete mt-2 bg-gray-700 hover:bg-gray-600 border-none"
              onClick={() => {
                const videoExts = ['.mp4', '.mkv', '.avi', '.webm', '.mov']
                const videoFile = selectedTorrent.files?.find(f =>
                  videoExts.some(ext => f.name?.toLowerCase().endsWith(ext))
                ) || selectedTorrent.files?.[0]
                if (videoFile) copyStreamUrl(selectedTorrent.infoHash, videoFile.index)
              }}
            >
              📋 Copy Link (Backup)
            </button>

            <button
              className="details-btn-delete tv-btn-danger mt-4"
              onClick={() => deleteTorrent(selectedTorrent.infoHash)}
            >
              Delete
            </button>
            <div className="details-back mt-4 text-gray-400">Press BACK to close</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
