/**
 * HomeRow.jsx — Horizontal Content Row
 * Netflix/Lampa-style row with TV navigation support
 * 
 * Features:
 * - Horizontal scroll with arrow indicators
 * - TV D-pad navigation with useTVNavigation
 * - Backdrop change on focus (communicated to parent)
 * - Lazy image loading
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { useTVNavigation } from '../hooks/useTVNavigation'
import { getPosterUrl, getBackdropUrl, getTitle, getYear } from '../utils/discover'
import { formatGenres } from '../utils/genres'

const HomeRow = ({
    title,
    icon,
    items = [],
    categoryId,
    onItemClick,
    onFocusChange,
    onMoreClick,
    isRowFocused = false,
    rowIndex = 0
}) => {
    const containerRef = useRef(null)
    const itemRefs = useRef([])
    const moreButtonRef = useRef(null)
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 })

    // Calculate visible items for virtualization
    const updateVisibleRange = useCallback(() => {
        if (!containerRef.current) return

        const container = containerRef.current
        const scrollLeft = container.scrollLeft
        const containerWidth = container.clientWidth
        const itemWidth = 150 // Approximate poster width + gap

        const start = Math.max(0, Math.floor(scrollLeft / itemWidth) - 2)
        const end = Math.min(items.length, Math.ceil((scrollLeft + containerWidth) / itemWidth) + 2)

        setVisibleRange({ start, end })
    }, [items.length])

    // Handle item selection
    const handleSelect = useCallback((index) => {
        if (onItemClick && items[index]) {
            onItemClick(items[index])
        }
    }, [items, onItemClick])

    // TV Navigation hook
    const { focusedIndex, setFocusedIndex, handleKeyDown, isFocused } = useTVNavigation({
        itemCount: items.length,
        columns: items.length, // Horizontal = all items in one row
        onSelect: handleSelect,
        itemRefs,
        loop: true,
        trapFocus: false,
        initialIndex: isRowFocused ? 0 : -1
    })

    // Notify parent about focus changes
    useEffect(() => {
        if (focusedIndex >= 0 && items[focusedIndex] && onFocusChange) {
            onFocusChange(items[focusedIndex])
        }
    }, [focusedIndex, items, onFocusChange])

    // Update focused index when row focus changes
    useEffect(() => {
        if (isRowFocused && focusedIndex < 0) {
            setFocusedIndex(0)
        } else if (!isRowFocused) {
            setFocusedIndex(-1)
        }
    }, [isRowFocused, focusedIndex, setFocusedIndex])

    // Scroll focused item into view
    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex].scrollIntoView({
                behavior: 'auto',
                // For first row, use 'nearest' to avoid pulling Header off-screen.
                // For others, use 'center' to ensure context.
                block: rowIndex === 0 ? 'nearest' : 'center',
                inline: 'center'
            })
        }
        updateVisibleRange()
    }, [focusedIndex, updateVisibleRange])

    // Track scroll for virtualization
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        container.addEventListener('scroll', updateVisibleRange, { passive: true })
        updateVisibleRange()

        return () => container.removeEventListener('scroll', updateVisibleRange)
    }, [updateVisibleRange])

    // Custom Key Handler to integrate "More" button
    const handleRowKeyDown = (e) => {
        // If we are currently focusing the "More" button
        if (document.activeElement === moreButtonRef.current) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault()
                // Focus the last item
                setFocusedIndex(items.length - 1)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (onMoreClick) onMoreClick(categoryId)
            }
            // ArrowUp/Down let bubble to parent (HomePanel)
            return
        }

        // Normal list navigation
        if (e.key === 'ArrowRight' && focusedIndex === items.length - 1) {
            // At the end of list -> go to "More" button
            e.preventDefault()
            setFocusedIndex(-1) // Deselect items
            setTimeout(() => moreButtonRef.current?.focus(), 0)
        } else {
            handleKeyDown(e)
        }
    }

    if (items.length === 0) return null

    return (
        <div
            className="home-row mb-6 overflow-visible"
            onKeyDown={isRowFocused ? handleRowKeyDown : undefined}
        >
            {/* Row Title */}
            <div className="flex items-center justify-between px-4 mb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    {title}
                    <span className="text-gray-500 text-sm font-normal">({items.length})</span>
                </h2>
                {onMoreClick && (
                    <button
                        onClick={() => onMoreClick(categoryId)}
                        className={`text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 ${!isRowFocused ? 'opacity-50' : ''}`}
                        tabIndex={isRowFocused ? 0 : -1}
                        ref={moreButtonRef}
                    >
                        Ещё
                        <span className="text-xs">→</span>
                    </button>
                )}
            </div>

            {/* Scrollable Container */}
            <div
                ref={containerRef}
                className="flex gap-3 overflow-x-auto pt-2 pb-3 scrollbar-hide scroll-smooth"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    paddingLeft: '32px',
                    paddingRight: '32px',
                    paddingTop: '12px',
                    paddingBottom: '12px'
                }}
            >
                {items.map((item, index) => {
                    // Virtualization: only render visible items
                    const isVisible = index >= visibleRange.start && index <= visibleRange.end
                    const posterUrl = getPosterUrl(item)
                    const itemTitle = getTitle(item)
                    const year = getYear(item)
                    const isItemFocused = isFocused(index)

                    return (
                        <button
                            key={item.id || index}
                            ref={el => itemRefs.current[index] = el}
                            onClick={() => handleSelect(index)}
                            className={`
                flex-shrink-0 rounded-lg transition-all duration-200 relative
                focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-105 focus:z-10
                hover:scale-105 overflow-visible
                ${isItemFocused ? 'ring-4 ring-blue-500 scale-105 z-10' : ''}
              `}
                            style={{
                                width: '130px',
                                aspectRatio: '2/3'
                            }}
                            tabIndex={isRowFocused ? 0 : -1}
                            aria-label={`${itemTitle} ${year || ''}`}
                        >
                            {isVisible && posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={itemTitle}
                                    className="w-full h-full object-cover rounded-lg"
                                    loading="lazy"
                                />
                            ) : (
                                <div
                                    className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center p-2 rounded-lg"
                                >
                                    <span className="text-white text-xs text-center line-clamp-3 font-medium">
                                        {itemTitle}
                                    </span>
                                </div>
                            )}

                            {/* Rating Badge */}
                            {item.vote_average > 0 && (
                                <div className={`
                  absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded
                  ${item.vote_average >= 7 ? 'bg-green-500' :
                                        item.vote_average >= 5 ? 'bg-yellow-500 text-black' : 'bg-red-500'}
                  text-white shadow-lg
                `}>
                                    {item.vote_average.toFixed(1)}
                                </div>
                            )}

                            {/* Title Overlay (only when no poster or focused on gradient) */}
                            {isItemFocused && !posterUrl && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                                    <p className="text-white text-xs font-medium line-clamp-2">
                                        {itemTitle}
                                    </p>
                                    {year && (
                                        <p className="text-gray-400 text-[10px]">{year}</p>
                                    )}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default HomeRow
