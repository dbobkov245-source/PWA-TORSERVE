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
  const [showServerInput, setShowServerInput] = useState(false)
  const [expanded, setExpanded] = useState({}) // { infoHash: boolean }

  // TV Details View - selected torrent for modal
  const [selectedTorrent, setSelectedTorrent] = useState(null)

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

  // Save player preference
  const savePreferredPlayer = (player) => {
    setPreferredPlayer(player)
    localStorage.setItem('preferredPlayer', player)
  }

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

  // Handle Play button - open stream URL in external video player
  const handlePlay = async (infoHash, fileIndex, fileName) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    console.log('[Play] Opening stream:', streamUrl, 'Player:', preferredPlayer)

    // On Android native app, use different launch methods
    if (Capacitor.isNativePlatform()) {
      const title = fileName || 'Video'

      try {
        // Method based on player selection
        switch (preferredPlayer) {
          case 'vimu':
            // Vimu - try intent first
            console.log('[Play] Launching Vimu...')
            await Browser.open({
              url: `intent:#Intent;action=android.intent.action.VIEW;type=video/*;S.url=${encodeURIComponent(streamUrl)};package=net.gtvbox.videoplayer;end`
            })
            break

          case 'vlc':
            // VLC - use vlc:// scheme with just the path
            console.log('[Play] Launching VLC...')
            await Browser.open({ url: `vlc://${streamUrl}` })
            break

          case 'mx':
            // MX Player Pro and Free
            console.log('[Play] Launching MX Player...')
            await Browser.open({
              url: `intent:${streamUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=com.mxtech.videoplayer.ad;S.title=${encodeURIComponent(title)};end`
            })
            break

          case 'system':
          default:
            // System chooser - simple intent
            console.log('[Play] Opening system chooser...')
            await Browser.open({
              url: `intent:${streamUrl}#Intent;action=android.intent.action.VIEW;type=video/*;end`
            })
            break
        }
      } catch (e) {
        console.error('[Play] Browser.open failed:', e)

        // Fallback: try direct location.href
        try {
          console.log('[Play] Fallback: window.location.href')
          window.location.href = `intent:${streamUrl}#Intent;action=android.intent.action.VIEW;type=video/*;end`
        } catch (e2) {
          console.error('[Play] Fallback failed:', e2)
          // Last resort: copy to clipboard
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(streamUrl)
            alert(`Ссылка скопирована!\n\nОткройте ${preferredPlayer.toUpperCase()} и вставьте:\n${streamUrl}`)
          }
        }
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
        <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700 space-y-4">
          {/* Server URL */}
          {/* Server URL (Hidden by default to avoid focus trap) */}
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

          {/* Player Selection (only on native) */}
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

      <form onSubmit={addTorrent} className="mb-8 max-w-2xl mx-auto flex gap-2">
        <input
          type="text"
          value={magnet}
          onChange={(e) => setMagnet(e.target.value)}
          placeholder="Paste Magnet URI..."
          tabIndex={0}
          className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-white"
        />
        <button
          type="submit"
          disabled={loading}
          tabIndex={0}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold disabled:opacity-50 transition-colors tv-focusable"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </form>

      {error && <div className="text-red-500 text-center mb-4 bg-red-900/20 p-2 rounded max-w-2xl mx-auto">{error}</div>}

      {/* ─── Netflix Grid ─── */}
      <div className="netflix-grid">
        {torrents.map((t) => {
          const progress = Math.round((t.progress || 0) * 100)
          const isReady = progress >= 100 || t.files?.length > 0

          return (
            <button
              key={t.infoHash}
              tabIndex={0}
              onClick={() => setSelectedTorrent(t)}
              className={`torrent-card tv-card ${isReady ? 'ready pulse-ready' : ''}`}
            >
              {/* Card Content */}
              <div>
                <div className="text-4xl mb-2">🎬</div>
                <div className="torrent-card-title">
                  {t.name || 'Fetching Metadata...'}
                </div>
              </div>

              {/* Status & Progress */}
              <div>
                <div className="torrent-card-status">
                  <span>{isReady ? '✅ Ready' : `⏳ ${progress}%`}</span>
                  <span>•</span>
                  <span>{t.numPeers || 0} peers</span>
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

      {/* ─── Details Modal (TV Full Screen) ─── */}
      {selectedTorrent && (
        <div
          className="details-overlay"
          onClick={() => setSelectedTorrent(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Backspace') {
              setSelectedTorrent(null)
            }
          }}
        >
          <div
            className="details-modal animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <h2 className="details-title">
              {selectedTorrent.name || 'Unknown Torrent'}
            </h2>

            {/* Progress */}
            <div className="details-progress-container">
              <div className="details-progress-bar">
                <div
                  className="details-progress-fill"
                  style={{ width: `${Math.round((selectedTorrent.progress || 0) * 100)}%` }}
                />
              </div>
              <div className={`details-status ${(selectedTorrent.progress || 0) >= 1 ? 'ready' : 'loading'}`}>
                {(selectedTorrent.progress || 0) >= 1
                  ? '✅ Ready to Watch'
                  : `⏳ Loading: ${Math.round((selectedTorrent.progress || 0) * 100)}%`
                }
              </div>
            </div>

            {/* Stats */}
            <div className="text-gray-400 text-sm mb-4">
              {selectedTorrent.files?.length || 0} files • {selectedTorrent.numPeers || 0} peers •
              {((selectedTorrent.downloadSpeed || 0) / 1024 / 1024).toFixed(1)} MB/s
            </div>

            {/* Action Buttons */}
            <div className="details-buttons">
              {/* Watch Button - Primary */}
              <button
                tabIndex={0}
                autoFocus
                onClick={() => {
                  // Find first video file or first file
                  const videoExts = ['.mp4', '.mkv', '.avi', '.webm', '.mov']
                  const videoFile = selectedTorrent.files?.find(f =>
                    videoExts.some(ext => f.name?.toLowerCase().endsWith(ext))
                  ) || selectedTorrent.files?.[0]

                  if (videoFile) {
                    handlePlay(selectedTorrent.infoHash, videoFile.index, videoFile.name)
                    setSelectedTorrent(null)
                  } else {
                    alert('No playable files found')
                  }
                }}
                className="details-btn-watch tv-btn-primary"
              >
                ▶ WATCH IN {preferredPlayer.toUpperCase()}
              </button>

              {/* File List (if multiple files) */}
              {selectedTorrent.files?.length > 1 && (
                <div className="mt-4 max-h-40 overflow-y-auto bg-gray-800/50 rounded-lg p-2">
                  {selectedTorrent.files.map((f, idx) => (
                    <button
                      key={idx}
                      tabIndex={0}
                      onClick={() => {
                        handlePlay(selectedTorrent.infoHash, f.index, f.name)
                        setSelectedTorrent(null)
                      }}
                      className="w-full text-left p-2 hover:bg-gray-700 rounded transition-colors text-sm truncate tv-focusable"
                    >
                      📄 {f.name} ({(f.length / 1024 / 1024).toFixed(0)} MB)
                    </button>
                  ))}
                </div>
              )}

              {/* Delete Button */}
              <button
                tabIndex={0}
                onClick={() => {
                  deleteTorrent(selectedTorrent.infoHash)
                  setSelectedTorrent(null)
                }}
                className="details-btn-delete tv-btn-danger"
              >
                🗑 Delete Torrent
              </button>
            </div>

            {/* Back Hint */}
            <div className="details-back">
              Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">ESC</kbd> or <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">BACK</kbd> to close
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
