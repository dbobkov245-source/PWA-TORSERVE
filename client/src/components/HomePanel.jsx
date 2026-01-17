/**
 * HomePanel.jsx — Discovery Home Page
 * Netflix/Lampa-style home with content rows
 * 
 * Features:
 * - Multiple category rows (Trending, Popular, Top)
 * - Dynamic backdrop from focused item
 * - TV navigation between rows
 * - Integration with TorServe search
 */

import { useState, useEffect, useCallback } from 'react'
import HomeRow from './HomeRow'
import { fetchAllDiscovery, getBackdropUrl, getTitle, getSearchQuery, DISCOVERY_CATEGORIES } from '../utils/discover'

const HomePanel = ({ onSearch, onClose }) => {
    const [categories, setCategories] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [backdrop, setBackdrop] = useState(null)
    const [focusedRowIndex, setFocusedRowIndex] = useState(0)
    const [focusedItem, setFocusedItem] = useState(null)

    // Fetch all discovery categories on mount
    useEffect(() => {
        const loadDiscovery = async () => {
            setLoading(true)
            setError(null)

            try {
                const data = await fetchAllDiscovery()
                setCategories(data)

                // Set initial backdrop from first trending item
                if (data.trending?.items?.[0]) {
                    const firstItem = data.trending.items[0]
                    setBackdrop(getBackdropUrl(firstItem))
                    setFocusedItem(firstItem)
                }
            } catch (e) {
                console.error('[HomePanel] Failed to load:', e)
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }

        loadDiscovery()
    }, [])

    // Handle item click — search for torrents
    const handleItemClick = useCallback((item) => {
        const query = getSearchQuery(item)
        console.log('[HomePanel] Searching for:', query)

        if (onSearch) {
            onSearch(query)
        }
    }, [onSearch])

    // Handle focus change — update backdrop
    const handleFocusChange = useCallback((item) => {
        setFocusedItem(item)
        const newBackdrop = getBackdropUrl(item)
        if (newBackdrop) {
            setBackdrop(newBackdrop)
        }
    }, [])

    // Keyboard navigation between rows
    const handleKeyDown = useCallback((e) => {
        const categoryIds = DISCOVERY_CATEGORIES.map(c => c.id)
        const rowCount = categoryIds.length

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setFocusedRowIndex(prev => Math.min(prev + 1, rowCount - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                if (focusedRowIndex === 0) {
                    // At top — close panel or go to search
                    if (onClose) onClose()
                } else {
                    setFocusedRowIndex(prev => Math.max(prev - 1, 0))
                }
                break
            case 'Escape':
            case 'Backspace':
                e.preventDefault()
                if (onClose) onClose()
                break
        }
    }, [focusedRowIndex, onClose])

    // Add global key listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // Get ordered categories
    const orderedCategories = DISCOVERY_CATEGORIES
        .map(cat => categories[cat.id])
        .filter(Boolean)

    return (
        <div className="home-panel relative min-h-screen bg-gray-900">
            {/* Dynamic Backdrop */}
            <div
                className="absolute inset-0 transition-all duration-700 ease-out"
                style={{
                    background: backdrop
                        ? `linear-gradient(to bottom, transparent 0%, rgba(17,24,39,0.7) 30%, rgba(17,24,39,1) 70%), url(${backdrop}) center top / cover no-repeat`
                        : 'linear-gradient(to bottom, #1f2937 0%, #111827 100%)'
                }}
            />

            {/* Content */}
            <div className="relative z-10 pt-4 pb-8">
                {/* Header with focused item info */}
                {focusedItem && (
                    <div className="px-4 mb-6 max-w-2xl">
                        <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                            {getTitle(focusedItem)}
                        </h1>

                        <div className="flex items-center gap-3 mb-2">
                            {/* Rating */}
                            {focusedItem.vote_average > 0 && (
                                <span className={`
                  px-2 py-0.5 rounded text-sm font-bold
                  ${focusedItem.vote_average >= 7 ? 'bg-green-500' :
                                        focusedItem.vote_average >= 5 ? 'bg-yellow-500 text-black' : 'bg-red-500'}
                  text-white
                `}>
                                    ★ {focusedItem.vote_average.toFixed(1)}
                                </span>
                            )}

                            {/* Year */}
                            {(focusedItem.release_date || focusedItem.first_air_date) && (
                                <span className="text-gray-300 text-sm">
                                    {(focusedItem.release_date || focusedItem.first_air_date).substring(0, 4)}
                                </span>
                            )}

                            {/* Media Type */}
                            <span className="text-gray-400 text-sm">
                                {focusedItem.media_type === 'tv' ? '📺 Сериал' : '🎬 Фильм'}
                            </span>
                        </div>

                        {/* Overview */}
                        {focusedItem.overview && (
                            <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
                                {focusedItem.overview}
                            </p>
                        )}

                        {/* Action hint */}
                        <p className="text-blue-400 text-xs mt-3 opacity-80">
                            ↵ Enter — найти торренты
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="text-gray-400">Загрузка контента...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="text-center py-20">
                        <p className="text-red-400 text-lg mb-2">❌ Ошибка загрузки</p>
                        <p className="text-gray-500 text-sm">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                        >
                            Попробовать снова
                        </button>
                    </div>
                )}

                {/* Content Rows */}
                {!loading && !error && (
                    <div className="space-y-2">
                        {orderedCategories.map((category, index) => (
                            <HomeRow
                                key={category.id}
                                title={category.name}
                                icon={category.icon}
                                items={category.items || []}
                                onItemClick={handleItemClick}
                                onFocusChange={handleFocusChange}
                                isRowFocused={focusedRowIndex === index}
                            />
                        ))}
                    </div>
                )}

                {/* Debug: Source info */}
                {!loading && orderedCategories.length > 0 && (
                    <div className="px-4 mt-8 text-gray-600 text-xs">
                        Источники: {orderedCategories.map(c => `${c.name} (${c.method || c.source})`).join(' • ')}
                    </div>
                )}
            </div>
        </div>
    )
}

export default HomePanel
