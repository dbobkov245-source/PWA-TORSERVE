/**
 * SearchPanel Component - Unified Search UI (API v2)
 * Stage 6: TV Navigation Hook, Enhanced Provider Status, Accessibility
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { useTVNavigation } from '../hooks/useTVNavigation'
import { useDebounce } from '../hooks/useDebounce'

// ─── Helper Functions ─────────────────────────────────────────

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

const getProviderInfo = (status, count) => {
    if (count > 0) return { icon: '✅', style: 'bg-green-900/40 text-green-400 border-green-500/40', label: 'OK' }
    switch (status) {
        case 'ok': return { icon: '✅', style: 'bg-green-900/30 text-green-400 border-green-500/30', label: 'OK' }
        case 'timeout': return { icon: '⏱️', style: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/40', label: 'Timeout' }
        case 'circuit_open': return { icon: '🔒', style: 'bg-gray-800/50 text-gray-500 border-gray-600/30', label: 'Disabled' }
        case 'error': return { icon: '❌', style: 'bg-red-900/40 text-red-400 border-red-500/40', label: 'Error' }
        default: return { icon: '○', style: 'bg-gray-800/30 text-gray-400 border-gray-600/30', label: 'Unknown' }
    }
}

const getTagStyle = (tag) => {
    const styles = {
        '2160p': 'bg-purple-900/50 text-purple-300 border-purple-500/30',
        '1080p': 'bg-blue-900/50 text-blue-300 border-blue-500/30',
        '720p': 'bg-gray-700/50 text-gray-300 border-gray-500/30',
        'hevc': 'bg-green-900/50 text-green-300 border-green-500/30',
        'hdr': 'bg-yellow-900/50 text-yellow-300 border-yellow-500/30',
        'dv': 'bg-pink-900/50 text-pink-300 border-pink-500/30',
        'cam': 'bg-red-900/50 text-red-300 border-red-500/30'
    }
    return styles[tag] || 'bg-gray-700/50 text-gray-400 border-gray-500/30'
}

const getHealthIcon = (health) => {
    switch (health) {
        case 'excellent': return '🟢'
        case 'good': return '🟡'
        case 'poor': return '🟠'
        default: return '🔴'
    }
}

// ─── Main Component ───────────────────────────────────────────

const SearchPanel = ({
    searchQuery,
    onSearchQueryChange,
    onSearch,
    onClose,
    onAddTorrent,
    searchResults,
    searchLoading,
    providers = {}
}) => {
    const [activeFilters, setActiveFilters] = useState([])
    const [sortBy, setSortBy] = useState('seeders')
    const [isListening, setIsListening] = useState(false)
    const [voiceAvailable, setVoiceAvailable] = useState(false)
    const [providerTooltip, setProviderTooltip] = useState(null)

    // Refs for navigation
    const inputRef = useRef(null)
    const micBtnRef = useRef(null)
    const searchBtnRef = useRef(null)
    const closeBtnRef = useRef(null)
    const resultRefs = useRef([])

    // UX-01: Debounce filter changes for performance
    const debouncedFilters = useDebounce(activeFilters, 150)

    // Filter and sort with useMemo for performance (UX-01)
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

    // Provider status analysis
    const providerEntries = Object.entries(providers)
    const allFailed = providerEntries.length > 0 && providerEntries.every(([, data]) =>
        data.status === 'error' || data.status === 'timeout' || data.status === 'circuit_open'
    )

    // TV Navigation for results
    const { focusedIndex, handleKeyDown: handleResultsKeyDown, isFocused } = useTVNavigation({
        itemCount: sortedResults.length,
        columns: 1,
        onSelect: (idx) => {
            const r = sortedResults[idx]
            if (r) onAddTorrent(r.magnet || r.id, r.title)
        },
        onBack: onClose,
        itemRefs: resultRefs,
        trapFocus: true
    })

    // Voice recognition
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

    // Reset refs when results change
    useEffect(() => {
        resultRefs.current = []
    }, [searchResults, activeFilters])

    const startVoiceSearch = async () => {
        if (!voiceAvailable) {
            const query = prompt('🎤 Введите запрос:')
            if (query?.trim()) {
                onSearchQueryChange(query.trim())
                setTimeout(() => onSearch(), 200)
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
                    setTimeout(() => onSearch(), 300)
                }
            }
        } catch { setIsListening(false) }
    }

    const toggleFilter = (filter) => {
        setActiveFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter])
    }

    // Input and button navigation
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            onSearch()
        } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
            e.preventDefault()
            micBtnRef.current?.focus()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (sortedResults.length > 0) resultRefs.current[0]?.focus()
        }
    }

    const handleBtnKeyDown = (e, prevRef, nextRef) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault()
            prevRef?.current?.focus()
        } else if (e.key === 'ArrowRight' && nextRef) {
            e.preventDefault()
            nextRef.current?.focus()
        } else if (e.key === 'ArrowDown' && sortedResults.length > 0) {
            e.preventDefault()
            resultRefs.current[0]?.focus()
        }
    }

    return (
        <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-purple-600/50">
            {/* Search Row */}
            <div className="flex gap-2 mb-4">
                <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Поиск торрентов..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 
                               focus:ring-2 focus:ring-purple-500 outline-none"
                    autoFocus
                    aria-label="Поиск торрентов"
                />
                <button
                    ref={micBtnRef}
                    onClick={startVoiceSearch}
                    onKeyDown={(e) => handleBtnKeyDown(e, inputRef, searchBtnRef)}
                    className={`px-4 py-3 rounded-lg font-bold focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none
                               ${isListening ? 'bg-red-600 focus:ring-red-400 animate-pulse' : 'bg-gray-700 focus:ring-purple-400'}`}
                    aria-label="Голосовой поиск"
                >🎤</button>
                <button
                    ref={searchBtnRef}
                    onClick={onSearch}
                    onKeyDown={(e) => handleBtnKeyDown(e, micBtnRef, closeBtnRef)}
                    disabled={searchLoading}
                    className="bg-purple-600 px-6 py-3 rounded-lg font-bold disabled:opacity-50 
                               focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-400 focus:outline-none"
                    aria-label="Искать"
                >{searchLoading ? '...' : '🔍'}</button>
                <button
                    ref={closeBtnRef}
                    onClick={onClose}
                    onKeyDown={(e) => handleBtnKeyDown(e, searchBtnRef, null)}
                    className="bg-gray-800 px-4 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-400 focus:outline-none"
                    aria-label="Закрыть поиск"
                >✕</button>
            </div>

            {/* Provider Status with Tooltips */}
            {providerEntries.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 text-xs">
                    {providerEntries.map(([name, data]) => {
                        const info = getProviderInfo(data.status, data.count || 0)
                        const hasError = data.status === 'error' || data.status === 'timeout'

                        return (
                            <button
                                key={name}
                                onClick={() => hasError && setProviderTooltip(providerTooltip === name ? null : name)}
                                className={`px-2 py-1 rounded-full border ${info.style} 
                                           ${hasError ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                                           focus:outline-none focus:ring-1 focus:ring-white/50`}
                                aria-label={`${name}: ${info.label}`}
                            >
                                {info.icon} {name}
                                {data.count > 0 && <span className="ml-1">({data.count})</span>}
                            </button>
                        )
                    })}

                    {/* Tooltip for error details */}
                    {providerTooltip && providers[providerTooltip]?.error && (
                        <div className="w-full mt-1 p-2 bg-red-900/30 border border-red-500/30 rounded text-red-300 text-xs">
                            ⚠️ {providerTooltip}: {providers[providerTooltip].error}
                        </div>
                    )}
                </div>
            )}

            {/* All Sources Failed Banner */}
            {allFailed && !searchLoading && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-center">
                    <div className="text-red-400 font-medium">⚠️ Все источники недоступны</div>
                    <p className="text-xs text-red-300/70 mt-1">Проверьте интернет-соединение или настройки VPN</p>
                </div>
            )}

            {/* Filters & Sort */}
            {searchResults.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    {filterOptions.length > 0 && (
                        <>
                            {filterOptions.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleFilter(tag)}
                                    className={`px-2.5 py-1 rounded-full text-xs border 
                                               focus:ring-2 focus:ring-purple-400 focus:outline-none
                                               ${activeFilters.includes(tag)
                                            ? 'bg-purple-600 text-white border-purple-400'
                                            : 'bg-gray-800/50 text-gray-400 border-gray-600/50'}`}
                                    aria-pressed={activeFilters.includes(tag)}
                                    aria-label={`Фильтр ${tag}`}
                                >{tag.toUpperCase()}</button>
                            ))}
                            {activeFilters.length > 0 && (
                                <button onClick={() => setActiveFilters([])} className="text-xs text-gray-500" aria-label="Сбросить фильтры">✕</button>
                            )}
                        </>
                    )}
                    <div className="flex-1" />
                    {['seeders', 'size', 'date'].map(opt => (
                        <button
                            key={opt}
                            onClick={() => setSortBy(opt)}
                            className={`px-2.5 py-1 rounded text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none
                                       ${sortBy === opt ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                            aria-pressed={sortBy === opt}
                        >{opt === 'seeders' ? '⬆' : opt === 'size' ? '📦' : '📅'}</button>
                    ))}
                </div>
            )}

            {/* Results count */}
            {searchResults.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">{sortedResults.length} результатов</div>
            )}

            {/* Results with TV Navigation */}
            {sortedResults.length > 0 && (
                <div
                    className="max-h-[50vh] overflow-y-auto space-y-2 pr-1"
                    onKeyDown={handleResultsKeyDown}
                >
                    {sortedResults.map((r, i) => (
                        <div
                            key={r.id || i}
                            ref={el => resultRefs.current[i] = el}
                            tabIndex={0}
                            className={`flex items-start justify-between p-3 bg-gray-800 rounded-lg cursor-pointer
                                       focus:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none
                                       ${isFocused(i) ? 'ring-2 ring-purple-500 bg-gray-700' : ''}`}
                            onClick={() => onAddTorrent(r.magnet || r.id, r.title)}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{r.title}</div>
                                <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 mt-1">
                                    <span>📀 {r.size}</span>
                                    <span className="text-green-400">{getHealthIcon(r.health)} {r.seeders}</span>
                                    {r.tracker && <span className="text-purple-400">{r.tracker}</span>}
                                    {r.dateTs && <span className="text-gray-500">{formatRelativeDate(r.dateTs)}</span>}
                                </div>
                                {r.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {r.tags.map(tag => (
                                            <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] border ${getTagStyle(tag)}`}>{tag.toUpperCase()}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddTorrent(r.magnet || r.id, r.title) }}
                                className="ml-2 bg-green-600 px-2.5 py-1 rounded text-xs font-bold opacity-70 hover:opacity-100"
                                tabIndex={-1}
                                aria-label={`Добавить ${r.title}`}
                            >+</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty states */}
            {searchResults.length > 0 && sortedResults.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                    <button onClick={() => setActiveFilters([])} className="text-purple-400">Сбросить фильтры</button>
                </div>
            )}

            {!searchLoading && searchResults.length === 0 && providerEntries.length > 0 && !allFailed && (
                <div className="text-center text-gray-500 py-6">🔍 Ничего не найдено</div>
            )}

            {searchLoading && (
                <div className="text-center text-gray-400 py-6">
                    <div className="text-3xl mb-2 animate-bounce">🔍</div>
                    <span className="animate-pulse">Поиск...</span>
                </div>
            )}

            {isListening && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="text-7xl mb-4 animate-pulse">🎤</div>
                        <p className="text-xl text-white">Говорите...</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SearchPanel
