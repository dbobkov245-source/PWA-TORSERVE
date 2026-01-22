/**
 * CategoryPage.jsx — Full Category View
 * Displays all items from a single category in a grid layout
 * 
 * Features:
 * - Grid of posters (4-5 per row)
 * - Infinite scroll / pagination
 * - TV navigation support
 * - Back button
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { useTVNavigation } from '../hooks/useTVNavigation'
import { getPosterUrl, getTitle, getYear, DISCOVERY_CATEGORIES } from '../utils/discover'
import { reportBrokenImage, filterDiscoveryResults } from '../utils/tmdbClient'

const CategoryPage = ({
    categoryId,
    customCategory, // { name, icon, fetcher } - dynamic overrides
    items: initialItems = [],
    onItemClick,
    onBack,
    onFocusChange
}) => {
    const [displayedItems, setDisplayedItems] = useState(initialItems)
    const [page, setPage] = useState(initialItems.length > 0 ? 1 : 0) // Start at 0 if no items
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const itemRefs = useRef([])
    const observerTarget = useRef(null)
    const containerRef = useRef(null) // For auto-focus on mount

    // Resolve category strategy
    const category = customCategory || DISCOVERY_CATEGORIES.find(c => c.id === categoryId)

    // Reset state when category changes
    // Reset state when category changes
    useEffect(() => {
        setDisplayedItems(initialItems)
        setPage(initialItems.length > 0 ? 1 : 0)
        setHasMore(true)
        // Reset load trigger
        hasInitiallyLoaded.current = false
    }, [categoryId, customCategory?.name]) // Don't depend on initialItems reference to prevent flickering on parent re-renders

    // Handle item selection
    const handleSelect = useCallback((index) => {
        if (onItemClick && displayedItems[index]) {
            onItemClick(displayedItems[index])
        }
    }, [displayedItems, onItemClick])


    // TV Navigation hook
    const { focusedIndex, setFocusedIndex, handleKeyDown, isFocused } = useTVNavigation({
        itemCount: displayedItems.length,
        columns: 5,
        onSelect: handleSelect,
        itemRefs,
        loop: false,
        trapFocus: false // BUG-FIX: Allow navigation to back button
    })

    // BUG-FIX: Focus zone management (header vs grid)
    const [focusZone, setFocusZone] = useState('grid') // 'header' | 'grid'
    const backButtonRef = useRef(null)

    // Load More Logic
    const loadMore = useCallback(async () => {
        if (loading || !hasMore || !category) return

        setLoading(true)
        try {
            const nextPage = page + 1
            console.log(`[CategoryPage] Loading page ${nextPage}...`)

            // Call fetcher with next page
            const response = await category.fetcher(nextPage)
            console.log(`[CategoryPage] Loaded ${response?.results?.length} items`)

            if (response && response.results && response.results.length > 0) {
                // Filter new items using shared logic
                const newItems = filterDiscoveryResults(response.results)

                if (newItems.length === 0) {
                    // If we got results but filtered them all out, maybe try next page?
                    // For now, just stop or let user scroll more (sentinel remains)
                    // If we behave like "end", user gets stuck.
                    // Ideally we should try next page recursively, but let's just append nothing and update page.
                    setPage(nextPage)
                } else {
                    setDisplayedItems(prev => [...prev, ...newItems])
                    setPage(nextPage)
                }

                // If native results were fewer than 20, we reached end
                if (response.results.length < 20) {
                    setHasMore(false)
                }
            } else {
                setHasMore(false)
            }
        } catch (e) {
            console.error('[CategoryPage] Load error:', e)
            setHasMore(false)
        } finally {
            setLoading(false)
        }
    }, [loading, hasMore, page, category])

    // BUG-FIX: Trigger initial load ONCE when component mounts with empty items
    const hasInitiallyLoaded = useRef(false)
    useEffect(() => {
        // Only trigger on mount when page is 0 and we haven't loaded yet
        if (page === 0 && !hasInitiallyLoaded.current && category) {
            hasInitiallyLoaded.current = true
            console.log('[CategoryPage] Initial load for:', category.name)
            loadMore()
        }
    }, [category]) // Only depend on category, not on loadMore or other state

    // Reset hasLoaded when category changes
    useEffect(() => {
        hasInitiallyLoaded.current = false
    }, [categoryId, customCategory?.id])

    // Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    loadMore()
                }
            },
            { threshold: 1.0 }
        )

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => observer.disconnect()
    }, [loadMore])


    // Notify parent about focus changes
    useEffect(() => {
        if (focusedIndex >= 0 && displayedItems[focusedIndex] && onFocusChange) {
            onFocusChange(displayedItems[focusedIndex])
        }
    }, [focusedIndex, displayedItems, onFocusChange])

    // Scroll focused item into view
    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex].scrollIntoView({
                behavior: 'auto',
                block: 'center'
            })
        }
    }, [focusedIndex])

    // Handle keyboard for back and zone navigation
    const handleKeyDownWrapper = useCallback((e) => {
        if (e.key === 'Escape' || e.key === 'Backspace') {
            e.preventDefault()
            onBack?.()
            return
        }

        // BUG-FIX: Zone navigation for back button
        if (focusZone === 'header') {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setFocusZone('grid')
                if (focusedIndex < 0) setFocusedIndex(0)
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onBack?.()
            }
            return
        }

        // In grid zone - check if we should go to header
        if (focusZone === 'grid' && e.key === 'ArrowUp') {
            const columns = 5
            if (focusedIndex < columns) {
                // First row - go to header
                e.preventDefault()
                setFocusZone('header')
                backButtonRef.current?.focus()
                return
            }
        }

        handleKeyDown(e)
    }, [focusZone, focusedIndex, onBack, handleKeyDown, setFocusedIndex])

    // Auto-focus back button when in header zone
    useEffect(() => {
        if (focusZone === 'header') {
            backButtonRef.current?.focus()
        }
    }, [focusZone])

    // Auto-focus container on mount for keyboard navigation
    useEffect(() => {
        containerRef.current?.focus()
    }, [])

    // Global keyboard listener as fallback (ensures keyboard works even without focus)
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Only handle if CategoryPage container is in the DOM
            if (!containerRef.current) return
            handleKeyDownWrapper(e)
        }
        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [handleKeyDownWrapper])

    if (!category) return null

    return (
        <div
            ref={containerRef}
            className="category-page min-h-screen bg-gray-900 p-6 overflow-y-auto overflow-x-hidden"
            onKeyDown={handleKeyDownWrapper}
            tabIndex={0}
        >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    ref={backButtonRef}
                    onClick={onBack}
                    className={`text-white hover:text-blue-400 transition-colors p-2 rounded-lg focus:outline-none
                        ${focusZone === 'header' ? 'ring-4 ring-blue-500 scale-110' : 'focus:ring-2 focus:ring-blue-500'}
                    `}
                    aria-label="Назад"
                >
                    <span className="text-2xl">←</span>
                </button>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">{category.icon}</span>
                    {category.name}
                    <span className="text-gray-500 text-lg font-normal">({displayedItems.length})</span>
                </h1>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {displayedItems.map((item, index) => {
                    const posterUrl = getPosterUrl(item)
                    const itemTitle = getTitle(item)
                    const year = getYear(item)
                    const isItemFocused = isFocused(index)

                    return (
                        <button
                            key={item.id + '-' + index} // Use composite key to avoid dupes issues
                            ref={el => itemRefs.current[index] = el}
                            onClick={() => handleSelect(index)}
                            className={`
                                rounded-lg transition-all duration-200 relative overflow-visible
                                focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-105 focus:z-10
                                hover:scale-105
                                ${isItemFocused ? 'ring-4 ring-blue-500 scale-105 z-10' : ''}
                            `}
                            style={{ aspectRatio: '2/3' }}
                            aria-label={`${itemTitle} ${year || ''}`}
                        >
                            {posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={itemTitle}
                                    className="w-full h-full object-cover rounded-lg"
                                    loading="lazy"
                                    onError={(e) => {
                                        reportBrokenImage(e.target.src)
                                        e.target.style.display = 'none'
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center p-2 rounded-lg">
                                    <span className="text-white text-xs text-center line-clamp-3 font-medium">
                                        {itemTitle}
                                    </span>
                                </div>
                            )}

                            {/* Rating Badge */}
                            {item.vote_average > 0 && (
                                <div className={`
                                    absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded shadow-lg
                                    ${item.vote_average >= 7 ? 'bg-green-500' :
                                        item.vote_average >= 5 ? 'bg-yellow-500 text-black' : 'bg-red-500'}
                                    text-white
                                `}>
                                    {item.vote_average.toFixed(1)}
                                </div>
                            )}

                            {/* Title on hover/focus */}
                            {isItemFocused && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 rounded-b-lg">
                                    <p className="text-white text-sm font-medium line-clamp-2">
                                        {itemTitle}
                                    </p>
                                    {year && (
                                        <p className="text-gray-400 text-xs">{year}</p>
                                    )}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Load More Sentinel */}
            {hasMore && (
                <div ref={observerTarget} className="h-20 flex items-center justify-center mt-8">
                    {loading && (
                        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    )}
                </div>
            )}

            {/* Empty state */}
            {displayedItems.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <span className="text-4xl mb-4">📭</span>
                    <p>Нет результатов</p>
                </div>
            )}
        </div>
    )
}

export default CategoryPage
