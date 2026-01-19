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

    // TV Navigation hook - only for select/focus state, we handle arrows manually
    const { focusedIndex, setFocusedIndex, isFocused } = useTVNavigation({
        itemCount: items.length,
        columns: 1, // Use 1 = list mode, we handle horizontal arrows manually
        onSelect: handleSelect,
        itemRefs,
        loop: false,
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

    // Scroll focused item into view (debounced to prevent jitter)
    const scrollTimeoutRef = useRef(null)
    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
            // Debounce scroll to prevent jitter when holding button
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current)
            }
            scrollTimeoutRef.current = setTimeout(() => {
                itemRefs.current[focusedIndex]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                })
            }, 100) // Increased delay for smoother batch navigation
        }
        updateVisibleRange()
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        }
    }, [focusedIndex, updateVisibleRange])

    // Track scroll for virtualization
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        container.addEventListener('scroll', updateVisibleRange, { passive: true })
        updateVisibleRange()

        return () => container.removeEventListener('scroll', updateVisibleRange)
    }, [updateVisibleRange])

    // Custom Key Handler - FULL horizontal navigation (manual control)
    const handleRowKeyDown = (e) => {
        // If "More" button is focused
        if (document.activeElement === moreButtonRef.current) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault()
                e.stopPropagation()
                // Go back to last item
                const lastIdx = items.length - 1
                setFocusedIndex(lastIdx)
                setTimeout(() => itemRefs.current[lastIdx]?.focus(), 0)
            } else if (e.key === 'ArrowRight') {
                // At the end, stop here
                e.preventDefault()
                e.stopPropagation()
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (onMoreClick) onMoreClick(categoryId)
            }
            // ArrowUp/Down bubble to parent (HomePanel handles row switching)
            return
        }

        // Regular item navigation
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            e.stopPropagation()
            if (focusedIndex < items.length - 1) {
                // Move to next item
                const newIdx = focusedIndex + 1
                setFocusedIndex(newIdx)
                setTimeout(() => itemRefs.current[newIdx]?.focus(), 0)
            } else if (focusedIndex === items.length - 1 && onMoreClick && moreButtonRef.current) {
                // At end -> go to "More" button
                setFocusedIndex(-1)
                setTimeout(() => moreButtonRef.current?.focus(), 0)
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            e.stopPropagation()
            if (focusedIndex > 0) {
                const newIdx = focusedIndex - 1
                setFocusedIndex(newIdx)
                setTimeout(() => itemRefs.current[newIdx]?.focus(), 0)
            }
            // At start, just stop
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (focusedIndex >= 0) {
                handleSelect(focusedIndex)
            }
        }
        // ArrowUp/Down bubble to HomePanel for row switching
    }

    if (items.length === 0) return null

    return (
        <div
            className="home-row mb-4"
            style={{ overflow: 'visible' }}
            onKeyDown={isRowFocused ? handleRowKeyDown : undefined}
        >
            {/* Row Title */}
            <div className="flex items-center justify-between px-4 mb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    {title}
                    <span className="text-gray-500 text-sm font-normal">({items.length})</span>
                </h2>
                {/* Removed old header More button - now inline at end of row */}
            </div>

            {/* Scrollable Container */}
            <div
                ref={containerRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '16px',
                    paddingBottom: '16px'
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

                {/* "More" Card at End (Lampa style) */}
                {onMoreClick && (
                    <button
                        ref={moreButtonRef}
                        onClick={() => onMoreClick(categoryId)}
                        className={`
                            flex-shrink-0 rounded-lg transition-all duration-200
                            bg-gray-800/60 border-2 border-gray-600
                            hover:border-blue-500 hover:bg-gray-700/70
                            focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-105 focus:z-10
                            flex flex-col items-center justify-center gap-2
                        `}
                        style={{
                            width: '130px',
                            aspectRatio: '2/3',
                            minWidth: '130px'
                        }}
                        tabIndex={isRowFocused ? 0 : -1}
                        aria-label="Показать больше"
                    >
                        <span className="text-5xl text-gray-300">→</span>
                        <span className="text-gray-300 text-sm font-semibold">Ещё</span>
                    </button>
                )}
            </div>
        </div>
    )
}

export default HomeRow
