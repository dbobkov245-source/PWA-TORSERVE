// NavigationProvider removed as per V3.7 architecture (using useTVNavigation)
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { registerPlugin, Capacitor, CapacitorHttp } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { useVoiceSearch } from './hooks/useVoiceSearch.jsx'
import { searchMulti, filterDiscoveryResults } from './utils/tmdbClient'

// Components
import Poster from './components/Poster'
import { DegradedBanner, ErrorScreen, BufferingBanner, ServerStatusBar } from './components/StatusBanners'
import SettingsPanel from './components/SettingsPanel'
import SearchPanel from './components/SearchPanel'
import TorrentModal from './components/TorrentModal'
import AutoDownloadPanel from './components/AutoDownloadPanel'
import HomePanel from './components/HomePanel'
import UpdateModal from './components/UpdateModal'

// Utilities
import { checkForUpdate, tryInstallPending } from './utils/appUpdater'

// Hooks
import SpatialEngine, { useSpatialArbiter, useSpatialItem } from './hooks/useSpatialNavigation'

// Helpers
import { cleanTitle } from './utils/helpers'

// Register Custom Java Bridge
const TVPlayer = registerPlugin('TVPlayer')

const CATEGORIES = [
  { id: 'all', name: 'Все', icon: '📚' },
  { id: 'movie', name: 'Фильмы', icon: '🎬' },
  { id: 'series', name: 'Сериалы', icon: '📺' },
  { id: 'music', name: 'Музыка', icon: '🎵' },
  { id: 'other', name: 'Другое', icon: '📁' }
]

// ─── Sub-Components for App ───

const ListCategoryButton = ({ cat, active, onClick }) => {
  const spatialRef = useSpatialItem('main')
  return (
    <button
      ref={spatialRef}
      onClick={onClick}
      className={`
        focusable px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
        focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#141414] focus:outline-none
        ${active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
      `}
    >
      {cat.icon} {cat.name}
    </button>
  )
}

const ListSortButton = ({ sort, active, onClick }) => {
  const spatialRef = useSpatialItem('main')
  return (
    <button
      ref={spatialRef}
      onClick={onClick}
      className={`
        focusable px-3 py-1 rounded transition-all
        focus:ring-2 focus:ring-blue-400 focus:outline-none
        ${active ? 'bg-gray-700 text-white' : 'bg-gray-800/50 text-gray-500 hover:text-white'}
      `}
    >
      {sort.label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

function App() {
  // State: Server & Settings
  const [serverUrl, setServerUrl] = useState(() => {
    if (Capacitor.isNativePlatform()) {
      return localStorage.getItem('serverUrl') || 'http://192.168.1.70:3000'
    }
    return ''
  })
  const [tmdbProxyUrl, setTmdbProxyUrl] = useState(localStorage.getItem('tmdbProxyUrl') || import.meta.env.VITE_TMDB_PROXY_URL || '')

  // State: Torrents
  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // State: UI
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState('general')
  const [showServerInput, setShowServerInput] = useState(false)
  const [selectedTorrent, setSelectedTorrent] = useState(null)
  const [buffering, setBuffering] = useState(null)
  const isPlayingRef = useRef(false)

  // State: Server Health
  const [serverStatus, setServerStatus] = useState('ok')
  const [lastStateChange, setLastStateChange] = useState(null)
  const [retryAfter, setRetryAfter] = useState(null)

  // State: Sorting & Filtering
  const [sortBy, setSortBy] = useState(localStorage.getItem('sortBy') || 'name')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // State: Search
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchProviders, setSearchProviders] = useState({})
  const [searchMeta, setSearchMeta] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const lastSearchRef = useRef({ query: '' })

  // State: Auto-Download
  const [showAutoDownload, setShowAutoDownload] = useState(false)

  // State: Last Played
  const [lastPlayed, setLastPlayed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lastPlayed')) || null } catch { return null }
  })

  // State: Discovery Views
  const [activeView, setActiveView] = useState('home')
  const [activeMovie, setActiveMovie] = useState(null)
  const [activePerson, setActivePerson] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)
  const [showSidebar, setShowSidebar] = useState(false)

  // State: App Update
  const [updateInfo, setUpdateInfo] = useState(null)

  // VOICE-01: Centralized voice search (no more prompt() fallback)
  const { startListening, isListening, ToastPortal } = useVoiceSearch()

  // ─── Spatial Registry ───
  const handleBack = useCallback(() => {
    if (updateInfo?.available) { /* handled by UpdateModal dismiss */ }
    else if (selectedTorrent) setSelectedTorrent(null)
    else if (showSettings) setShowSettings(false)
    else if (showSearch) { setShowSearch(false); setSearchResults([]); setSearchProviders({}) }
    else if (showSidebar) setShowSidebar(false)
    else if (activeMovie) setActiveMovie(null)
    else if (activePerson) setActivePerson(null)
    else if (activeCategory) setActiveCategory(null)
    else if (activeView === 'home' && !showSidebar) {
      // If on home and no overlay, prompting/listening should cancel?
      // keeping simple for now
      setActiveView('list')
    }
    else if (activeView === 'home') setActiveView('list')
    else CapacitorApp.exitApp()
  }, [updateInfo, selectedTorrent, showSettings, showSearch, showSidebar, activeMovie, activePerson, activeCategory, activeView])

  const { setActiveZone } = useSpatialArbiter(handleBack)

  // Navbar Refs
  // Navbar Refs
  const homeTabRef = useSpatialItem('main')
  const listTabRef = useSpatialItem('main')
  const autoDownloadRef = useSpatialItem('main')
  const refreshRef = useSpatialItem('main')
  const settingsBtnRef = useSpatialItem('main')
  // Diagnostics Button Ref -> Now opens Settings (Status Tab)
  const diagnosticsRef = useSpatialItem('main')
  const voiceRef = useSpatialItem('main')

  // My List View Refs
  const continuePlayRef = useSpatialItem('main')
  const mainSearchBtnRef = useSpatialItem('main', 'list-search-btn')
  const addMagnetBtnRef = useSpatialItem('main')
  // We need dynamic refs for list items, but `useSpatialItem` is a hook.
  // For lists/categories, we should use a sub-component with useSpatialItem OR the spatial navigation library's auto-detection if configured.
  // The current codebase uses `ListCategoryButton` sub-component at lines 26-38. But in the render loop at 487, it uses a plain <button>.
  // I should replace the plain button loop with `ListCategoryButton`.

  // ─── Effects ───
  // 1. Zone Management (Passive)
  useEffect(() => {
    if (updateInfo?.available) setActiveZone('modal')
    else if (showSettings) setActiveZone('settings')
    else if (selectedTorrent) setActiveZone('modal')
    else if (showSearch) setActiveZone('search')
    else if (showAutoDownload) setActiveZone('auto-download')
    else if (showSidebar) setActiveZone('sidebar')
    // Home-specific zones: only apply when HomePanel is visible
    else if (activeView === 'home' && activeMovie) setActiveZone('detail')
    else if (activeView === 'home' && activePerson) setActiveZone('person')
    else if (activeView === 'home' && activeCategory) setActiveZone('category')
    else setActiveZone('main')
  }, [updateInfo, showSettings, selectedTorrent, showSearch, showAutoDownload, activeMovie, activePerson, activeCategory, showSidebar, activeView, setActiveZone])

  const fetchStatus = useCallback(async () => {
    const baseUrl = serverUrl || (!Capacitor.isNativePlatform() && typeof window !== 'undefined' ? window.location.origin : '')
    try {
      if (!baseUrl) return
      const res = await fetch(`${baseUrl}/api/status`)
      if (res.ok) {
        const data = await res.json()
        setTorrents(data.torrents || [])
        setServerStatus('ok')
      } else { setServerStatus('degraded') }
    } catch { setServerStatus('error') }
  }, [serverUrl])

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 5000)
    return () => clearInterval(timer)
  }, [fetchStatus])

  // Check for app updates on launch
  useEffect(() => {
    tryInstallPending().then(installed => {
      if (installed) return; // If installing from cache, skip network check
      checkForUpdate().then(info => {
        if (info.available) setUpdateInfo(info)
      })
    })
  }, [])

  // Handle external magnet links (Android intent-filter) - BUG-2 fix
  useEffect(() => {
    const handleAppUrlOpen = async ({ url }) => {
      console.log('[Intent] Received URL:', url)
      if (!url || !url.startsWith('magnet:')) return

      try {
        // Wait for app to be ready
        await new Promise(resolve => setTimeout(resolve, 500))

        const res = await fetch(`${serverUrl}/api/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ magnet: url })
        })

        if (res.ok) {
          console.log('[Intent] Torrent added successfully')
          setActiveView('list')
          fetchStatus()
        } else {
          console.error('[Intent] Failed to add torrent:', res.status)
        }
      } catch (e) {
        console.error('[Intent] Error adding torrent:', e)
      }
    }

    const listenerPromise = CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen)

    // Check if app was cold-started with an intent
    CapacitorApp.getLaunchUrl().then(result => {
      if (result?.url) handleAppUrlOpen(result)
    })

    return () => {
      listenerPromise.then(handle => handle.remove())
    }
  }, [serverUrl, fetchStatus])

  const handleVoiceSearch = useCallback(async () => {
    const query = await startListening()
    if (!query) return

    try {
      const data = await searchMulti(query)
      const filtered = filterDiscoveryResults(data.results || [])
      if (filtered.length > 0) {
        setActiveView('home')
        setActiveMovie(filtered[0])
      } else {
        alert('Ничего не найдено')
      }
    } catch (err) {
      console.warn('[VoiceSearch] TMDB search failed:', err)
    }
  }, [startListening, setActiveMovie, setActiveView])

  const addTorrent = async (e) => {
    e.preventDefault()
    if (!magnet) return
    try {
      const res = await fetch(`${serverUrl}/api/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet })
      })
      if (res.ok) {
        setMagnet('')
        setShowServerInput(false)
        fetchStatus()
      } else { alert('Error adding torrent') }
    } catch { alert('Network error') }
    finally { setLoading(false) }
  }

  const deleteTorrent = async (hash) => {
    if (!confirm('Удалить этот торрент и файлы?')) return
    try {
      const res = await fetch(`${serverUrl}/api/delete/${hash}`, { method: 'DELETE' })
      if (res.ok) { setSelectedTorrent(null); fetchStatus() }
    } catch { alert('Error deleting') }
  }

  const handlePlay = useCallback(async (hash, index, fileName) => {
    try {
      // 1. Get host from serverUrl for substitution
      let host = '';
      try {
        const cleanSrv = serverUrl.trim();
        const urlToParse = cleanSrv.includes('://') ? cleanSrv : `http://${cleanSrv}`;
        const parsed = new URL(urlToParse);
        // If port is special (not 3000/80/443), we might need it, but usually serverUrl already has it.
        // The most robust way is to replace 'localhost:3000' or 'localhost' with the actual serverUrl host:port.
        host = parsed.host; // host includes port if present
      } catch (e) { host = serverUrl; }

      // 2. Construct Stream URL (Server uses /stream/:hash/:idx)
      const base = serverUrl.replace(/\/$/, '');
      const streamUrl = `${base}/stream/${hash}/${index}`;

      console.log('[DEBUG] Final Play URL:', streamUrl);

      // 3. Mark last played
      localStorage.setItem('lastPlayed', JSON.stringify({
        infoHash: hash,
        torrentName: torrents.find(t => t.infoHash === hash)?.name,
        fileIndex: index,
        fileName: fileName
      }));

      // 4. Start playback via Custom Plugin
      await TVPlayer.play({ url: streamUrl, title: fileName })
    } catch (e) {
      console.error('Play error:', e)
      alert('Error starting playback')
    }
  }, [serverUrl, torrents])

  const handlePlayAll = useCallback(async (torrent) => {
    const videoFiles = torrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)) || []
    if (videoFiles.length === 0) return

    // Play first file, let TVPlayer handle queue if implemented, or just play first
    handlePlay(torrent.infoHash, videoFiles[0].index, videoFiles[0].name)
  }, [handlePlay])

  const copyUrl = (hash, index) => {
    const base = serverUrl.replace(/\/$/, '');
    const url = `${base}/stream/${hash}/${index}`;
    navigator.clipboard.writeText(url).then(() => alert('URL copied'))
  }

  const fetchSearchJson = useCallback(async (url) => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (fetchError) {
      if (!Capacitor.isNativePlatform()) throw fetchError

      const nativeRes = await CapacitorHttp.request({
        method: 'GET',
        url,
        headers: { Accept: 'application/json' }
      })

      if (nativeRes.status < 200 || nativeRes.status >= 300) {
        throw new Error(`Native HTTP ${nativeRes.status}`)
      }

      if (typeof nativeRes.data === 'string') {
        try {
          return JSON.parse(nativeRes.data)
        } catch {
          throw new Error('Native HTTP returned non-JSON payload')
        }
      }

      return nativeRes.data || {}
    }
  }, [])

  const searchRuTracker = async (query) => {
    let forceFresh = false
    let effectiveQuery = query

    if (typeof query === 'object' && query !== null) {
      effectiveQuery = query.query
      forceFresh = query.forceFresh === true
    }

    const normalizedQuery = (effectiveQuery || '').trim()
    if (!normalizedQuery) return

    // Repeat search for same query bypasses cache to fetch fresh torrents.
    if (!forceFresh && lastSearchRef.current.query === normalizedQuery) {
      forceFresh = true
    }

    setSearchLoading(true)
    setSearchResults([])
    setSearchProviders({})
    setSearchMeta(null)

    const params = new URLSearchParams({
      query: normalizedQuery,
      limit: '100'
    })
    if (forceFresh) {
      params.set('skipCache', '1')
    }

    try {
      const data = await fetchSearchJson(`${serverUrl}/api/v2/search?${params.toString()}`)
      setSearchResults(data.items || [])
      setSearchProviders(data.meta?.providers || {})
      setSearchMeta({
        cached: Boolean(data.meta?.cached),
        ms: data.meta?.ms || 0,
        query: normalizedQuery,
        fresh: forceFresh
      })
      lastSearchRef.current.query = normalizedQuery
    } catch (e) { console.error('Search error:', e) }
    finally { setSearchLoading(false) }
  }

  const addFromSearch = async (magnet, title) => {
    setLoading(true)
    try {
      const res = await fetch(`${serverUrl}/api/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet })
      })
      if (res.ok) {
        // 1. Clear search state to unmount SearchResultItem components
        setSearchResults([])
        setSearchProviders({})
        // 2. Close panel AFTER clearing (allows React to complete unmount)
        requestAnimationFrame(() => {
          setShowSearch(false)
          setActiveView('list')
          fetchStatus()
          // 3. Recover focus after DOM settles - BUG-1 fix: use timeout instead of rAF
          // to ensure search zone elements are fully unregistered before recovery
          setTimeout(() => {
            SpatialEngine.setActiveZone('main')
            SpatialEngine.recoverFocus()
          }, 150)
        })
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const saveSortBy = (val) => {
    setSortBy(val)
    localStorage.setItem('sortBy', val)
  }

  const handleServerUrlChange = (val, save) => {
    // Remove trailing slash to prevent double-slash in API paths
    const cleanUrl = val.replace(/\/+$/, '')
    setServerUrl(cleanUrl)
    if (save) localStorage.setItem('serverUrl', cleanUrl)
  }

  const handleTmdbProxyUrlChange = (val, save) => {
    setTmdbProxyUrl(val)
    if (save) localStorage.setItem('tmdbProxyUrl', val)
  }

  const getCategory = (torrent) => {
    const files = torrent.files || []
    const videos = files.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name))
    if (videos.length > 5) return 'series'
    if (videos.length > 0) return 'movie'
    return 'other'
  }

  const filteredTorrents = useMemo(() => {
    if (categoryFilter === 'all') return torrents
    return torrents.filter(t => getCategory(t) === categoryFilter)
  }, [torrents, categoryFilter])

  const displayTorrents = useMemo(() => {
    return [...filteredTorrents].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'size') {
        const sizeA = a.files?.reduce((s, f) => s + (f.length || 0), 0) || 0
        const sizeB = b.files?.reduce((s, f) => s + (f.length || 0), 0) || 0
        return sizeB - sizeA
      }
      if (sortBy === 'peers') return (b.numPeers || 0) - (a.numPeers || 0)
      return 0
    })
  }, [filteredTorrents, sortBy])

  // Settings overlay takes priority even in error state (for changing server URL)
  if (showSettings && (serverStatus === 'circuit_open' || serverStatus === 'error')) {
    return (
      <SettingsPanel
        serverUrl={serverUrl}
        onServerUrlChange={handleServerUrlChange}
        tmdbProxyUrl={tmdbProxyUrl}
        onTmdbProxyUrlChange={handleTmdbProxyUrlChange}
        torrents={[]}
        initialTab="general"
        onClose={() => { setShowSettings(false); fetchStatus(); }}
      />
    )
  }

  if (serverStatus === 'circuit_open' || serverStatus === 'error') {
    return (
      <ErrorScreen
        status={serverStatus}
        retryAfter={retryAfter}
        onRetry={fetchStatus}
        onSettings={() => setShowSettings(true)}
      />
    )
  }

  return (
    <div className="h-screen w-screen bg-[#141414] text-white font-sans selection:bg-red-500 selection:text-white flex flex-col overflow-hidden">

      {/* Voice Search Toast */}
      <ToastPortal />

      {/* App Update Modal */}
      {updateInfo?.available && (
        <UpdateModal
          updateInfo={updateInfo}
          onDismiss={() => setUpdateInfo(null)}
        />
      )}

      {/* Navbar */}
      <div className={`flex-shrink-0 bg-[#141414]/90 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-lg border-b border-gray-800 transition-all duration-300`}>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">PWA-TorServe</h1>
        <div className="flex gap-3 items-center">
          <div className="flex bg-gray-800 rounded-full p-1">
            <button ref={homeTabRef} tabIndex="0" onClick={() => { setActiveView('home'); setActiveMovie(null); setActivePerson(null); setActiveCategory(null); }} className={`focusable px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'home' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>🏠</button>
            <button ref={listTabRef} tabIndex="0" onClick={() => { setActiveView('list'); setShowSearch(false); }} className={`focusable px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>📚</button>
          </div>
          <ServerStatusBar ref={diagnosticsRef} status={serverStatus} onDiagnosticsClick={() => { setSettingsTab('status'); setShowSettings(true); }} />
          <button ref={autoDownloadRef} tabIndex="0" onClick={() => setShowAutoDownload(true)} className="focusable p-2 hover:bg-gray-800 rounded-full transition-colors" title="Авто-загрузка">📺</button>
          <button
            ref={voiceRef}
            onClick={handleVoiceSearch}
            className={`focusable p-2 rounded-full text-white transition-all ${isListening ? 'bg-red-600 animate-pulse' : 'hover:bg-gray-800'}`}
            title="Голосовой поиск"
          >🎤</button>
        </div>
      </div>

      {showAutoDownload && <AutoDownloadPanel serverUrl={serverUrl} torrents={torrents} onClose={() => setShowAutoDownload(false)} />}
      {serverStatus === 'degraded' && <DegradedBanner lastStateChange={lastStateChange} />}
      {showSettings && (
        <SettingsPanel
          serverUrl={serverUrl}
          onServerUrlChange={handleServerUrlChange}
          tmdbProxyUrl={tmdbProxyUrl}
          onTmdbProxyUrlChange={handleTmdbProxyUrlChange}
          torrents={torrents}
          initialTab={settingsTab}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="flex-1 overflow-hidden relative">
        {activeView === 'home' && (
          <HomePanel
            activeMovie={activeMovie} setActiveMovie={setActiveMovie}
            activePerson={activePerson} setActivePerson={setActivePerson}
            activeCategory={activeCategory} setActiveCategory={setActiveCategory}
            showSidebar={showSidebar} setShowSidebar={setShowSidebar}
            onSearch={(q) => {
              const query = q || searchQuery;
              setSearchQuery(query);
              setActiveView('list');
              setShowSearch(true);
              searchRuTracker(query);
            }}
            onClose={() => setActiveView('list')}
          />
        )}

        {activeView === 'list' && (
          <div className="h-full overflow-y-auto px-6 py-4 custom-scrollbar">
            {/* Continue Watching Banner (cc51200 style) */}
            {lastPlayed?.torrentName && torrents.find(t => t.infoHash === lastPlayed.infoHash) && (
              <div className="mb-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-purple-300 uppercase tracking-wide mb-1">▶ Продолжить просмотр</div>
                    <div className="text-white font-bold truncate">{cleanTitle(lastPlayed.torrentName)}</div>
                    <div className="text-gray-400 text-sm truncate">{cleanTitle(lastPlayed.fileName)}</div>
                  </div>
                  <button
                    ref={continuePlayRef}
                    tabIndex="0"
                    onClick={() => handlePlay(lastPlayed.infoHash, lastPlayed.fileIndex, lastPlayed.fileName)}
                    className="focusable ml-4 bg-purple-600 hover:bg-purple-500 px-5 py-3 rounded-lg font-bold text-white flex items-center gap-2 transition-colors focus:ring-4 focus:ring-purple-400"
                  >
                    ▶ Play
                  </button>
                </div>
              </div>
            )}

            {/* Header (cc51200 style) */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-200">Мои торренты</h2>
              <div className="flex gap-2">
                <button
                  ref={mainSearchBtnRef}
                  tabIndex="0"
                  onClick={() => setShowSearch(!showSearch)}
                  className="focusable bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105 focus:ring-4 focus:ring-purple-400"
                >
                  🔍 Поиск
                </button>
                {!showServerInput && (
                  <button
                    ref={addMagnetBtnRef}
                    tabIndex="0"
                    onClick={() => setShowServerInput(true)}
                    className="focusable bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full text-sm font-bold border border-gray-600 transition-transform hover:scale-105 focus:ring-4 focus:ring-gray-400"
                  >
                    + Magnet
                  </button>
                )}
              </div>
            </div>

            {/* Search Panel */}
            {showSearch && (
              <SearchPanel
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onSearch={searchRuTracker}
                onForceRefresh={(q) => searchRuTracker({ query: q, forceFresh: true })}
                onClose={() => { setShowSearch(false); setSearchResults([]); setSearchProviders({}); setSearchMeta(null) }}
                onAddTorrent={addFromSearch}
                searchResults={searchResults}
                searchLoading={searchLoading}
                providers={searchProviders}
                searchMeta={searchMeta}
              />
            )}

            {/* Magnet Input */}
            {showServerInput && (
              <form onSubmit={addTorrent} className="mb-6">
                <div className="flex gap-2">
                  <input
                    value={magnet}
                    onChange={(e) => setMagnet(e.target.value)}
                    placeholder="Вставьте Magnet-ссылку..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !magnet}
                    className="bg-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowServerInput(false)}
                    className="bg-gray-800 px-4 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </form>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-3 pt-1 px-1 -mx-1">
              {CATEGORIES.map(cat => (
                <ListCategoryButton
                  key={cat.id}
                  cat={cat}
                  active={categoryFilter === cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                />
              ))}
            </div>

            {/* Sort Buttons (cc51200 style) */}
            <div className="flex gap-2 mb-6 text-xs px-1 -mx-1">
              <span className="text-gray-500 self-center">Сортировка:</span>
              {[{ id: 'name', label: 'Имя' }, { id: 'size', label: 'Размер' }, { id: 'peers', label: 'Пиры' }].map(s => (
                <ListSortButton
                  key={s.id}
                  sort={s}
                  active={sortBy === s.id}
                  onClick={() => saveSortBy(s.id)}
                />
              ))}
            </div>

            {/* Torrent Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayTorrents.map(t => (
                <Poster
                  key={t.infoHash} name={t.name} progress={t.progress || 0} peers={t.numPeers || 0}
                  isReady={t.isReady} size={t.files?.reduce((sum, f) => sum + (f.length || 0), 0) || 0}
                  downloadSpeed={t.downloadSpeed || 0} downloaded={t.downloaded || 0} eta={t.eta || 0}
                  newFilesCount={t.newFilesCount || 0} onClick={() => setSelectedTorrent(t)}
                />
              ))}
              {displayTorrents.length === 0 && !loading && <div className="col-span-full py-20 text-center text-gray-600">Ваш список пуст</div>}
            </div>
          </div>
        )}

        {selectedTorrent && (
          <TorrentModal torrent={selectedTorrent} onClose={() => setSelectedTorrent(null)} onPlay={handlePlay} onPlayAll={handlePlayAll} onCopyUrl={copyUrl} onDelete={deleteTorrent} />
        )}

        {buffering && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">⏳</div>
              <h2 className="text-xl font-bold text-white mb-2">Буферизация...</h2>
              <p className="text-gray-400">{buffering.name}</p>
              <button onClick={() => setBuffering(null)} className="mt-6 text-gray-500">Отмена</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
