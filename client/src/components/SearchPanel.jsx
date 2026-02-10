import { useState, useEffect, useMemo, useRef } from 'react'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { useDebounce } from '../hooks/useDebounce'
import SpatialEngine, { useSpatialItem } from '../hooks/useSpatialNavigation'

// ─── Sub-Components ─────────────────────────────────────────

const formatRelativeDate = (timestamp) => {
    if (!timestamp) return null
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} мин`
    if (hours < 24) return `${hours} ч`
    if (days < 7) return `${days} дн`
    return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const getHealthIcon = (health) => {
    switch (health) {
        case 'excellent': return '🟢'
        case 'good': return '🟡'
        case 'poor': return '🟠'
        default: return '🔴'
    }
}

const SearchResultItem = ({ item, index, onAdd }) => {
    const rowRef = useSpatialItem('search')

    return (
        <div
            ref={rowRef}
            className="focusable flex items-start justify-between p-3 bg-gray-800 rounded-lg cursor-pointer focus:bg-purple-700 focus:ring-2 focus:ring-purple-500 group transition-colors"
            onClick={() => onAdd(item.magnet || item.id, item.title)}
        >
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{item.title}</div>
                <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 mt-1">
                    <span>📦 {item.size}</span>
                    <span className="text-green-400">{getHealthIcon(item.health)} {item.seeders}</span>
                    {item.tracker && <span className="text-purple-400">{item.tracker}</span>}
                    {item.dateTs && <span className="text-gray-500">{formatRelativeDate(item.dateTs)}</span>}
                </div>
            </div>
            {/* Visual hint that Enter/OK will add */}
            <span className="ml-2 text-gray-500 group-focus:text-green-400 text-lg transition-colors">➕</span>
        </div>
    )
}

const SearchFilter = ({ tag, active, onClick }) => {
    const spatialRef = useSpatialItem('search')
    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            className={`focusable px-4 py-2 rounded-full text-sm border focus:ring-4 focus:ring-purple-500 focus:scale-110 transition-all ${active ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-800 text-gray-400 border-gray-600'}`}
        >{tag.toUpperCase()}</button>
    )
}

const SearchSort = ({ opt, active, onClick }) => {
    const spatialRef = useSpatialItem('search')
    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            className={`focusable px-4 py-2 rounded text-sm focus:ring-4 focus:ring-purple-500 focus:scale-110 transition-all ${active ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >{opt === 'seeders' ? '⬆ Сиды' : opt === 'size' ? '📦 Размер' : '📅 Дата'}</button>
    )
}

const getProviderInfo = (status, count) => {
    if (count > 0) return { icon: '✅', style: 'bg-green-900/40 text-green-400 border-green-500/40', label: 'OK' }
    switch (status) {
        case 'empty': return { icon: '⚪', style: 'bg-gray-800/40 text-gray-300 border-gray-500/30', label: 'Empty' }
        case 'ok': return { icon: '✅', style: 'bg-green-900/30 text-green-400 border-green-500/30', label: 'OK' }
        case 'timeout': return { icon: '⏱️', style: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/40', label: 'Timeout' }
        case 'circuit_open': return { icon: '🔒', style: 'bg-gray-800/50 text-gray-500 border-gray-600/30', label: 'Disabled' }
        case 'error': return { icon: '❌', style: 'bg-red-900/40 text-red-400 border-red-500/40', label: 'Error' }
        default: return { icon: '○', style: 'bg-gray-800/30 text-gray-400 border-gray-600/30', label: 'Unknown' }
    }
}

// ─── Main Component ───────────────────────────────────────────

const SearchPanel = ({
    searchQuery,
    onSearchQueryChange,
    onSearch,
    onForceRefresh,
    onClose,
    onAddTorrent,
    searchResults,
    searchLoading,
    providers = {},
    searchMeta = null
}) => {
    const [activeFilters, setActiveFilters] = useState([])
    const [sortBy, setSortBy] = useState('seeders')
    const [isListening, setIsListening] = useState(false)
    const [voiceAvailable, setVoiceAvailable] = useState(false)
    const [providerTooltip, setProviderTooltip] = useState(null)

    // Activate 'search' zone on mount
    // NOTE: Zone cleanup is handled by App.jsx's zone management useEffect
    useEffect(() => {
        SpatialEngine.setActiveZone('search')
    }, [])

    // Spatial Refs
    const inputRef = useSpatialItem('search')
    const micRef = useSpatialItem('search')
    const searchRef = useSpatialItem('search')
    const refreshRef = useSpatialItem('search')
    const closeRef = useSpatialItem('search')

    const debouncedFilters = useDebounce(activeFilters, 150)

    const filteredResults = useMemo(() => {
        return searchResults.filter(r => {
            if (debouncedFilters.length === 0) return true
            return debouncedFilters.every(filter => (r.tags || []).includes(filter))
        })
    }, [searchResults, debouncedFilters])

    const sortedResults = useMemo(() => {
        return [...filteredResults].sort((a, b) => {
            switch (sortBy) {
                case 'seeders': return (b.seeders || 0) - (a.seeders || 0)
                case 'size': return (b.sizeBytes || 0) - (a.sizeBytes || 0)
                case 'date': return (b.dateTs || 0) - (a.dateTs || 0)
                default: return 0
            }
        })
    }, [filteredResults, sortBy])

    const availableTags = useMemo(() =>
        [...new Set(searchResults.flatMap(r => r.tags || []))]
        , [searchResults])
    const filterOptions = ['2160p', '1080p', '720p', 'hevc', 'hdr'].filter(t => availableTags.includes(t))

    const providerEntries = Object.entries(providers)

    useEffect(() => {
        const checkVoice = async () => {
            try {
                const { available } = await SpeechRecognition.available()
                setVoiceAvailable(available)
                if (available) await SpeechRecognition.requestPermissions()
            } catch { setVoiceAvailable(false) }
        }
        checkVoice()
    }, [])

    const startVoiceSearch = async () => {
        if (!voiceAvailable) {
            const query = prompt('🎤 Введите запрос:')
            if (query?.trim()) {
                const normalized = query.trim()
                onSearchQueryChange(normalized)
                setTimeout(() => onSearch(normalized), 200)
            }
            return
        }

        try {
            setIsListening(true)
            const result = await SpeechRecognition.start({
                language: 'ru-RU', maxResults: 1,
                prompt: 'Произнесите название', partialResults: false, popup: true
            })
            setIsListening(false)

            if (result.matches?.[0]) {
                const transcript = result.matches[0].trim()
                if (transcript) {
                    onSearchQueryChange(transcript)
                    setTimeout(() => onSearch(transcript), 300)
                }
            }
        } catch { setIsListening(false) }
    }

    const toggleFilter = (filter) => {
        setActiveFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter])
    }

    return (
        <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-purple-600/50">
            {/* Search Row */}
            <div className="flex gap-2 mb-4">
                <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            onSearch(searchQuery)
                        }
                    }}
                    placeholder="Поиск торрентов..."
                    className="focusable flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                    autoFocus
                />
                <button
                    ref={micRef}
                    onClick={startVoiceSearch}
                    tabIndex="0"
                    className={`focusable px-4 py-3 rounded-lg font-bold ${isListening ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}
                >🎤</button>
                <button
                    ref={searchRef}
                    onClick={() => onSearch(searchQuery)}
                    disabled={searchLoading}
                    tabIndex="0"
                    className="focusable bg-purple-600 px-6 py-3 rounded-lg font-bold disabled:opacity-50"
                >{searchLoading ? '...' : '🔍'}</button>
                <button
                    ref={refreshRef}
                    onClick={() => onForceRefresh?.(searchQuery)}
                    disabled={searchLoading || !searchQuery?.trim()}
                    tabIndex="0"
                    className="focusable bg-gray-700 px-4 py-3 rounded-lg font-bold disabled:opacity-50"
                    title="Искать без кэша"
                >↻</button>
                <button
                    ref={closeRef}
                    onClick={onClose}
                    tabIndex="0"
                    className="focusable bg-gray-800 px-4 rounded-lg"
                >✕</button>
            </div>

            {searchMeta && (
                <div className="mb-3 text-[11px] text-gray-400 font-mono">
                    {searchMeta.cached ? 'CACHE' : 'LIVE'} · {searchMeta.ms} ms
                    {searchMeta.fresh ? ' · fresh' : ''}
                </div>
            )}

            {/* Provider Status */}
            {providerEntries.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 text-xs">
                    {providerEntries.map(([name, data]) => {
                        const info = getProviderInfo(data.status, data.count || 0)
                        const hasError = data.status === 'error' || data.status === 'timeout'

                        return (
                            <button
                                key={name}
                                onClick={() => hasError && setProviderTooltip(providerTooltip === name ? null : name)}
                                className={`px-2 py-1 rounded-full border ${info.style} ${hasError ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                {info.icon} {name}
                                {data.count > 0 && <span className="ml-1">({data.count})</span>}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Filters & Sort */}
            {searchResults.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-4 py-2">
                    {filterOptions.map(tag => (
                        <SearchFilter
                            key={tag}
                            tag={tag}
                            active={activeFilters.includes(tag)}
                            onClick={() => toggleFilter(tag)}
                        />
                    ))}
                    <div className="flex-1" />
                    {['seeders', 'size', 'date'].map(opt => (
                        <SearchSort
                            key={opt}
                            opt={opt}
                            active={sortBy === opt}
                            onClick={() => setSortBy(opt)}
                        />
                    ))}
                </div>
            )}

            {/* Results */}
            {sortedResults.length > 0 && (
                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {sortedResults.map((r, i) => (
                        <SearchResultItem
                            key={r.id || i}
                            item={r}
                            onAdd={onAddTorrent}
                        />
                    ))}
                </div>
            )}

            {searchLoading && (
                <div className="text-center text-gray-400 py-6">
                    <div className="text-3xl mb-2 animate-bounce">🔍</div>
                    <span className="animate-pulse">Поиск...</span>
                </div>
            )}
        </div>
    )
}

export default SearchPanel
