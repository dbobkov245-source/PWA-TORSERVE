/**
 * HomePanel.jsx — Discovery Home Page
 * Netflix/Lampa-style home with content rows
 * 
 * Features:
 * - Unified Navigation Stack (History)
 * - Multiple category rows (Trending, Popular, Top)
 * - Dynamic backdrop from focused item
 * - TV navigation between rows
 * - Integration with TorServe search
 */

import React, { useState, useEffect, useCallback } from 'react'
import HomeRow from './HomeRow'
import CategoryPage from './CategoryPage'
import MovieDetail from './MovieDetail'
import PersonDetail from './PersonDetail'
import { fetchAllDiscovery, getBackdropUrl, getTitle, getSearchQuery, DISCOVERY_CATEGORIES } from '../utils/discover'
import { getDiscoverByGenre } from '../utils/tmdbClient'
import { contentRowsRegistry } from '../utils/ContentRowsRegistry'

const HomePanel = ({ onSearch, onClose }) => {
    // Data State
    const [categories, setCategories] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [backdrop, setBackdrop] = useState(null)

    // Home Grid State
    const [focusedRowIndex, setFocusedRowIndex] = useState(0)
    const [focusedItem, setFocusedItem] = useState(null)
    const [visibleRows, setVisibleRows] = useState([])

    // Unified Navigation Stack
    // Stack items: { type: 'movie'|'person'|'genre'|'category', data: any }
    const [navigationStack, setNavigationStack] = useState([])

    // ─── Stack Management ───────────────────────────────────────────

    const pushView = useCallback((type, data) => {
        setNavigationStack(prev => [...prev, { type, data }])
    }, [])

    const popView = useCallback(() => {
        setNavigationStack(prev => {
            if (prev.length === 0) return prev
            const newStack = prev.slice(0, -1)
            return newStack
        })
    }, [])

    // ─── Data Loading ───────────────────────────────────────────────

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)
                const results = await fetchAllDiscovery()
                setCategories(results)

                // Filter out empty results
                const nonEmptyRows = Object.values(results).filter(row => row.items && row.items.length > 0)
                setVisibleRows(nonEmptyRows)

                if (nonEmptyRows.length > 0 && nonEmptyRows[0].items.length > 0) {
                    setFocusedItem(nonEmptyRows[0].items[0])
                }
            } catch (err) {
                console.error('[HomePanel] Data load error:', err)
                setError(err.message || 'Failed to load content')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Update backdrop based on focused item (only when on Home)
    useEffect(() => {
        if (navigationStack.length === 0 && focusedItem) {
            setBackdrop(getBackdropUrl(focusedItem))
        }
    }, [focusedItem, navigationStack.length])

    // ─── Handlers ───────────────────────────────────────────────────

    // Open Movie Detail
    const handleItemClick = useCallback((item) => {
        pushView('movie', item)
    }, [pushView])

    // Open Person Detail
    const handlePersonClick = useCallback((person) => {
        pushView('person', person)
    }, [pushView])

    // Open Genre Category
    const handleGenreClick = useCallback((genre, type = 'movie') => {
        pushView('genre', { ...genre, type })
    }, [pushView])

    // Open Full Category (from Home Header or "More")
    const handleMoreClick = useCallback((categoryId) => {
        pushView('category', categoryId)
    }, [pushView])

    // Handle Search request from Movie Detail
    const handleSearchFromDetail = useCallback((query) => {
        // Clear stack and trigger search
        setNavigationStack([])
        if (onSearch) onSearch(query)
    }, [onSearch])

    // Handle Focus Change (keep track for backdrop)
    const handleFocusChange = useCallback((item) => {
        setFocusedItem(item)
    }, [])

    // ─── Input Handling ─────────────────────────────────────────────

    // Keyboard navigation (Home Grid Only)
    // When stack is present, child components handle their own navigation calls to onBack
    const handleKeyDown = useCallback((e) => {
        // If viewing detailed content (Stack > 0), simple navigation is blocked, 
        // relying on the focused component to handle keys or call onBack.
        // HOWEVER, we need to ensure global Backspace/Escape works if component doesn't catch it?
        // Components usually stopPropagation if they handle it.
        // Let's implement global BACK logic if nothing else caught it.

        // Actually, React events bubble. If Child handles it, they should e.stopPropagation().
        // Be careful: if Child uses onBack prop, they might call it.
        // If Child doesn't handle, it bubbles here.

        if (e.key === 'Escape' || e.key === 'Backspace') {
            if (navigationStack.length > 0) {
                e.preventDefault()
                popView()
                return
            } else {
                e.preventDefault()
                if (onClose) onClose()
                return
            }
        }

        if (navigationStack.length > 0) return

        // Standard Home Grid Navigation would go here or be delegated
    }, [onClose, navigationStack.length, popView])

    // Global Key Listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])


    // ─── Render Logic ───────────────────────────────────────────────

    // 1. Render Top View Logic
    const currentView = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null

    const renderCurrentView = () => {
        if (!currentView) return null

        if (currentView.type === 'genre') {
            const selectedGenre = currentView.data
            const dynamicCategory = {
                id: `genre-${selectedGenre.id}`,
                name: selectedGenre.name,
                icon: '🏷️',
                fetcher: (page) => getDiscoverByGenre(selectedGenre.id, selectedGenre.type || 'movie', page)
            }
            return (
                <div className="fixed inset-0 z-50 bg-[#141414] overflow-y-auto">
                    <CategoryPage
                        customCategory={dynamicCategory}
                        onBack={popView}
                        onItemClick={handleItemClick}
                        onFocusChange={handleFocusChange}
                    />
                </div>
            )
        }

        if (currentView.type === 'category') {
            const categoryId = currentView.data
            const categoryData = categories[categoryId]
            // Build customCategory with fetcher for pagination support
            const dynamicCategory = {
                id: categoryId,
                name: categoryData?.name,
                icon: categoryData?.icon,
                fetcher: categoryData?.fetcher
            }
            return (
                <div className="fixed inset-0 z-50 bg-[#141414] overflow-y-auto">
                    <CategoryPage
                        customCategory={dynamicCategory}
                        items={categoryData?.items || []}
                        onItemClick={handleItemClick}
                        onBack={popView}
                        onFocusChange={handleFocusChange}
                    />
                </div>
            )
        }

        if (currentView.type === 'person') {
            return (
                <PersonDetail
                    personId={currentView.data.id || currentView.data} // handle object or id
                    onBack={popView}
                    onSelectMovie={handleItemClick}
                />
            )
        }

        if (currentView.type === 'movie') {
            return (
                <MovieDetail
                    item={currentView.data}
                    onSearch={handleSearchFromDetail}
                    onBack={popView}
                    onSelect={handleItemClick}
                    onSelectPerson={handlePersonClick}
                    onSelectGenre={handleGenreClick}
                />
            )
        }
        return null
    }

    // 2. Render Home Grid (always rendered, hidden if stack not empty to preserve state?)
    // Actually, simple unmounting is fine for now, standard React behavior.

    const orderedCategories = visibleRows

    return (
        <div className="home-panel relative min-h-screen bg-[#141414]">

            {/* Home Content (Visible only when stack is empty) */}
            {!currentView && (
                <>
                    {/* Static Dark Background (solid, no backdrop) */}
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#141414] to-[#141414]" />

                    {/* Content */}
                    <div className="relative z-10 pt-4 pb-8">
                        {/* Header with focused item info */}
                        {focusedItem && !loading && (
                            <div className="px-4 mb-6 max-w-2xl transition-all duration-300">
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
                            <div className="space-y-6">
                                {orderedCategories.map((row, index) => (
                                    <HomeRow
                                        key={row.category ? row.category.id : row.id} // row structure from discover.js
                                        title={row.name || (row.category && row.category.name)}
                                        icon={row.icon || (row.category && row.category.icon)}
                                        categoryId={row.id || (row.category && row.category.id)}
                                        items={row.items || []}
                                        onItemClick={handleItemClick}
                                        onFocusChange={handleFocusChange}
                                        onMoreClick={handleMoreClick}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Overlay View (Stack) - Rendered AFTER home content to ensure it's on top */}
            {currentView && renderCurrentView()}
        </div>
    )
}

export default HomePanel
