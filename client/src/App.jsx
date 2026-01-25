// NavigationProvider removed as per V3.7 architecture (using useTVNavigation)
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { registerPlugin } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Components
import Poster from './components/Poster'
import { DegradedBanner, ErrorScreen, BufferingBanner, ServerStatusBar } from './components/StatusBanners'
import DiagnosticsPanel from './components/DiagnosticsPanel'
import SettingsPanel from './components/SettingsPanel'
import SearchPanel from './components/SearchPanel'
import TorrentModal from './components/TorrentModal'
import AutoDownloadPanel from './components/AutoDownloadPanel'
import HomePanel from './components/HomePanel'

// Hooks
import { useSpatialArbiter, useSpatialItem } from './hooks/useSpatialNavigation'

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
  const [showDiagnostics, setShowDiagnostics] = useState(false)
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
  const [searchLoading, setSearchLoading] = useState(false)

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

  // ─── Spatial Registry ───
  const handleBack = useCallback(() => {
    if (selectedTorrent) setSelectedTorrent(null)
    else if (showDiagnostics) setShowDiagnostics(false)
    else if (showSettings) setShowSettings(false)
    else if (showSearch) { setShowSearch(false); setSearchResults([]); setSearchProviders({}) }
    else if (showSidebar) setShowSidebar(false)
    else if (activeMovie) setActiveMovie(null)
    else if (activePerson) setActivePerson(null)
    else if (activeCategory) setActiveCategory(null)
    else if (activeView === 'home') setActiveView('list')
    else CapacitorApp.exitApp()
  }, [selectedTorrent, showSettings, showSearch, showSidebar, activeMovie, activePerson, activeCategory, activeView])

  const { setActiveZone } = useSpatialArbiter(handleBack)

  // Navbar Refs
  const homeTabRef = useSpatialItem('main')
  const listTabRef = useSpatialItem('main')
  const autoDownloadRef = useSpatialItem('main')
  const refreshRef = useSpatialItem('main')
  const settingsBtnRef = useSpatialItem('main')

  // My List View Refs
  const continuePlayRef = useSpatialItem('main')
  const mainSearchBtnRef = useSpatialItem('main')
  const addMagnetBtnRef = useSpatialItem('main')

  // ─── Effects ───
  useEffect(() => {
    if (showDiagnostics) setActiveZone('modal')
    else if (showSettings) setActiveZone('settings')
    else if (selectedTorrent) setActiveZone('modal')
    else if (showSearch) setActiveZone('search')
    else if (showAutoDownload) setActiveZone('auto-download')
    else if (showSidebar) setActiveZone('sidebar')
    else if (activeMovie) setActiveZone('detail')
    else if (activePerson) setActiveZone('person')
    else if (activeCategory) setActiveZone('category')
    else setActiveZone('main')
  }, [showSettings, selectedTorrent, showSearch, showAutoDownload, activeMovie, activePerson, activeCategory, showSidebar, setActiveZone])

  const fetchStatus = useCallback(async () => {
    const baseUrl = serverUrl || ''
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

  const searchRuTracker = async (query) => {
    if (!query || !query.trim()) return;
    setSearchLoading(true)
    setSearchResults([])
    setSearchProviders({})
    try {
      const res = await fetch(`${serverUrl}/api/v2/search?query=${encodeURIComponent(query)}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.items || [])
        setSearchProviders(data.meta?.providers || {})
      }
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
        setShowSearch(false)
        setActiveView('list')
        fetchStatus()
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const saveSortBy = (val) => {
    setSortBy(val)
    localStorage.setItem('sortBy', val)
  }

  const handleServerUrlChange = (val, save) => {
    setServerUrl(val)
    if (save) localStorage.setItem('serverUrl', val)
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

  if (serverStatus === 'circuit_open' || serverStatus === 'error') {
    return <ErrorScreen status={serverStatus} retryAfter={retryAfter} onRetry={fetchStatus} />
  }

  return (
    <div className="h-screen w-screen bg-[#141414] text-white font-sans selection:bg-red-500 selection:text-white flex flex-col overflow-hidden">

      {/* Navbar */}
      <div className={`flex-shrink-0 bg-[#141414]/90 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-lg border-b border-gray-800 transition-all duration-300 ${activeView === 'home' && !activeMovie && !activePerson && !activeCategory ? 'ml-20' : ''}`}>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">PWA-TorServe</h1>
        <div className="flex gap-3 items-center">
          <div className="flex bg-gray-800 rounded-full p-1">
            <button ref={homeTabRef} tabIndex="0" onClick={() => { setActiveView('home'); setActiveMovie(null); setActivePerson(null); setActiveCategory(null); }} className={`focusable px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'home' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>🏠</button>
            <button ref={listTabRef} tabIndex="0" onClick={() => { setActiveView('list'); setShowSearch(false); }} className={`focusable px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>📚</button>
          </div>
          <ServerStatusBar status={serverStatus} onDiagnosticsClick={() => setShowDiagnostics(true)} />
          <button ref={autoDownloadRef} tabIndex="0" onClick={() => setShowAutoDownload(true)} className="focusable p-2 hover:bg-gray-800 rounded-full transition-colors" title="Авто-загрузка">📺</button>
          <button ref={refreshRef} tabIndex="0" onClick={fetchStatus} className="focusable p-2 hover:bg-gray-800 rounded-full transition-colors">🔄</button>
          <button ref={settingsBtnRef} tabIndex="0" onClick={() => { setSettingsTab('general'); setShowSettings(!showSettings); }} className="focusable p-2 hover:bg-gray-800 rounded-full transition-colors">⚙️</button>
        </div>
      </div>

      {showDiagnostics && <DiagnosticsPanel serverUrl={serverUrl} tmdbProxyUrl={tmdbProxyUrl} torrents={torrents} onClose={() => setShowDiagnostics(false)} />}
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
            {/* Continue Watching */}
            {lastPlayed?.torrentName && torrents.find(t => t.infoHash === lastPlayed.infoHash) && (
              <div className="mb-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-purple-300 uppercase tracking-wide mb-1">▶ Начать просмотр</div>
                    <div className="text-white font-bold truncate">{cleanTitle(lastPlayed.torrentName)}</div>
                    <div className="text-gray-400 text-sm truncate">Файл: {cleanTitle(lastPlayed.fileName)}</div>
                  </div>
                  <button
                    ref={continuePlayRef}
                    tabIndex="0"
                    onClick={() => handlePlay(lastPlayed.infoHash, lastPlayed.fileIndex, lastPlayed.fileName)}
                    className="focusable ml-4 bg-purple-600 hover:bg-purple-500 px-5 py-3 rounded-lg font-bold text-white flex items-center gap-2 transition-colors"
                  >▶ Play</button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-200">Мои торренты</h2>
              <div className="flex gap-2">
                <button ref={mainSearchBtnRef} tabIndex="0" onClick={() => setShowSearch(!showSearch)} className="focusable bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105">🔍 Поиск</button>
                <button ref={addMagnetBtnRef} tabIndex="0" onClick={() => setShowServerInput(!showServerInput)} className="focusable bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full text-sm font-bold border border-gray-600 transition-transform hover:scale-105">+ Magnet</button>
              </div>
            </div>

            {showSearch && <SearchPanel searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onSearch={searchRuTracker} onClose={() => { setShowSearch(false); setSearchResults([]); setSearchProviders({}); }} onAddTorrent={addFromSearch} searchResults={searchResults} searchLoading={searchLoading} providers={searchProviders} />}

            {showServerInput && (
              <form onSubmit={addTorrent} className="mb-6 flex gap-2">
                <input value={magnet} onChange={(e) => setMagnet(e.target.value)} placeholder="Вставьте Magnet-ссылку..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 outline-none" autoFocus />
                <button type="submit" className="bg-blue-600 px-6 py-3 rounded-lg font-bold">Add</button>
              </form>
            )}

            {/* Categories & Sort */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-3 pt-1">
              {CATEGORIES.map(cat => <ListCategoryButton key={cat.id} cat={cat} active={categoryFilter === cat.id} onClick={() => setCategoryFilter(cat.id)} />)}
            </div>
            <div className="flex gap-2 mb-6 text-xs">
              <span className="text-gray-500 self-center">Сортировка:</span>
              {[{ id: 'name', label: 'Имя' }, { id: 'size', label: 'Размер' }, { id: 'peers', label: 'Пиры' }].map(s => <ListSortButton key={s.id} sort={s} active={sortBy === s.id} onClick={() => saveSortBy(s.id)} />)}
            </div>

            {/* Torrents */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-20">
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
