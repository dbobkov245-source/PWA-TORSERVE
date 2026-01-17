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
    onItemClick,
    onFocusChange,
    isRowFocused = false
}) => {
    const containerRef = useRef(null)
    const itemRefs = useRef([])
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
                behavior: 'smooth',
                block: 'nearest',
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

    if (items.length === 0) return null

    return (
        <div
            className="home-row mb-6"
            onKeyDown={isRowFocused ? handleKeyDown : undefined}
        >
            {/* Row Title */}
            <h2 className="text-lg font-bold text-white mb-3 px-4 flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                {title}
                <span className="text-gray-500 text-sm font-normal">({items.length})</span>
            </h2>

            {/* Scrollable Container */}
            <div
                ref={containerRef}
                className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200
                focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-110 focus:z-10
                hover:scale-105
                ${isItemFocused ? 'ring-4 ring-blue-500 scale-110 z-10' : ''}
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
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div
                                    className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center p-2"
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

                            {/* Title Overlay (for focused items) */}
                            {isItemFocused && (
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
