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
import CategoryPage from './CategoryPage'
import MovieDetail from './MovieDetail'
import { fetchAllDiscovery, getBackdropUrl, getTitle, getSearchQuery, DISCOVERY_CATEGORIES } from '../utils/discover'
import { contentRowsRegistry } from '../utils/ContentRowsRegistry'

const HomePanel = ({ onSearch, onClose }) => {
    const [categories, setCategories] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [backdrop, setBackdrop] = useState(null)
    const [focusedRowIndex, setFocusedRowIndex] = useState(0)
    const [focusedItem, setFocusedItem] = useState(null)
    const [activeCategoryId, setActiveCategoryId] = useState(null) // For full category view
    const [selectedItem, setSelectedItem] = useState(null) // For movie detail view
    const [visibleRows, setVisibleRows] = useState([])

    // Initialize Registry and Fetch Discovery
    useEffect(() => {
        const loadDiscovery = async () => {
            setLoading(true)
            setError(null)

            try {
                // 1. Initialize Registry with default categories (Phase 4.1)
                contentRowsRegistry.init(DISCOVERY_CATEGORIES)

                // 2. Fetch data (Unified fetcher for now)
                const data = await fetchAllDiscovery()
                setCategories(data)

                // 3. Get ordered rows from registry
                const rows = contentRowsRegistry.getAll()
                setVisibleRows(rows)

                // Set initial backdrop from first row's first item
                const firstRowId = rows[0]?.id
                if (firstRowId && data[firstRowId]?.items?.[0]) {
                    const firstItem = data[firstRowId].items[0]
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

    // ... handler functions unchanged ...

    // Handle item click — open movie detail
    const handleItemClick = useCallback((item) => {
        console.log('[HomePanel] Opening movie detail:', getTitle(item))
        setSelectedItem(item)
    }, [])

    // Handle search from movie detail
    const handleSearchFromDetail = useCallback((query) => {
        console.log('[HomePanel] Searching from detail:', query)
        setSelectedItem(null) // Close detail first
        if (onSearch) {
            onSearch(query)
        }
    }, [onSearch])

    // Handle back from movie detail
    const handleDetailBack = useCallback(() => {
        setSelectedItem(null)
    }, [])

    // Handle focus change — update focused item info (NO backdrop change)
    const handleFocusChange = useCallback((item) => {
        setFocusedItem(item)
        // Removed: backdrop change for static background
    }, [])

    // Handle "More" button click — open full category view
    const handleMoreClick = useCallback((categoryId) => {
        console.log('[HomePanel] Opening category:', categoryId)
        setActiveCategoryId(categoryId)
    }, [])

    // Handle back from category view
    const handleCategoryBack = useCallback(() => {
        setActiveCategoryId(null)
    }, [])

    // Keyboard navigation between rows
    const handleKeyDown = useCallback((e) => {
        // Disable global navigation if viewing detail or category page
        if (selectedItem || activeCategoryId) return

        const rowCount = visibleRows.length

        switch (e.key) {
            case 'Escape':
            case 'Backspace':
                e.preventDefault()
                if (onClose) onClose()
                break
        }
    }, [onClose, selectedItem, activeCategoryId])

    // Validates scroll position when row changes
    useEffect(() => {
        if (focusedRowIndex === 0) {
            // If focusing the first row, always scroll to top to show Header/Hero
            window.scrollTo({ top: 0, behavior: 'auto' })
        }
    }, [focusedRowIndex])

    // Add global key listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // Get ordered categories data mapping
    const orderedCategories = visibleRows
        .map(row => categories[row.id])
        .filter(Boolean)

    // If viewing movie detail, show MovieDetail
    if (selectedItem) {
        return (
            <MovieDetail
                item={selectedItem}
                onSearch={handleSearchFromDetail}
                onBack={handleDetailBack}
            />
        )
    }

    // If viewing a full category, show CategoryPage
    if (activeCategoryId) {
        const categoryData = categories[activeCategoryId]
        return (
            <CategoryPage
                categoryId={activeCategoryId}
                items={categoryData?.items || []}
                onItemClick={handleItemClick}
                onBack={handleCategoryBack}
                onFocusChange={handleFocusChange}
            />
        )
    }

    return (
        <div className="home-panel relative min-h-screen bg-[#141414]">
            {/* Static Dark Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#141414] to-[#141414]" />

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
                                key={category.id || index}
                                title={category.name}
                                icon={category.icon}
                                categoryId={category.id}
                                items={category.items || []}
                                onItemClick={handleItemClick}
                                onFocusChange={handleFocusChange}
                                onMoreClick={handleMoreClick}
                            />
                        ))}
                    </div>
                )}


            </div>
        </div>
    )
}

export default HomePanel
