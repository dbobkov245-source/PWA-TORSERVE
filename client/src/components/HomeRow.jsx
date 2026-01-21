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
import { getPosterUrl, getTitle, getYear } from '../utils/discover'

const HomeRow = ({
    title,
    icon,
    items = [],
    categoryId,
    onItemClick,
    onFocusChange,
    onMoreClick
}) => {
    const [focusedIndex, setFocusedIndex] = useState(0)
    const [translateX, setTranslateX] = useState(0)
    const containerRef = useRef(null)
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 15 })

    const ITEM_WIDTH = 130
    const ITEM_GAP = 12
    const FULL_ITEM_WIDTH = ITEM_WIDTH + ITEM_GAP

    // Calculate visible items for virtualization based on translateX
    const updateVisibleRange = useCallback(() => {
        if (!containerRef.current) return

        const containerWidth = containerRef.current.clientWidth
        const scrollOffset = -translateX

        // Render buffer: 2 screens worth
        const start = Math.max(0, Math.floor((scrollOffset - containerWidth) / FULL_ITEM_WIDTH))
        const end = Math.min(items.length + 1, Math.ceil((scrollOffset + containerWidth * 2) / FULL_ITEM_WIDTH))

        setVisibleRange({ start, end })
    }, [items.length, translateX])

    // Update transform when focus changes
    useEffect(() => {
        if (!containerRef.current) return
        const containerWidth = containerRef.current.clientWidth

        // Centering logic:
        // Item Center = index * FULL_ITEM_WIDTH + ITEM_WIDTH/2
        // Container Center = containerWidth / 2
        // TranslateX = ContainerCenter - ItemCenter

        // Boundaries: 
        // Left: 0 (Align first item to left)
        // Right: Max Width (Align last item to right) - Optional, simpler to just center always or clamp.

        // Lampa Logic: Always center active item unless near edges.
        // Actually, for simple carousel, centering is nicer.

        const itemCenter = focusedIndex * FULL_ITEM_WIDTH + ITEM_WIDTH / 2
        const centerOffset = containerWidth / 2 - itemCenter

        // Clamp to left edge (start)
        let newTranslate = Math.min(0, centerOffset)

        // Clamp to right edge? (Optional, prevents empty space on right)
        // const maxTranslate = -(items.length * FULL_ITEM_WIDTH - containerWidth)
        // newTranslate = Math.max(newTranslate, maxTranslate)

        // For TV feeling, pure center (with start clamp) is usually best.
        // If we want left-align for first item:
        if (focusedIndex === 0) newTranslate = 0

        setTranslateX(newTranslate)
    }, [focusedIndex, items.length])

    // Trigger virtualization calc when translate changes
    useEffect(() => {
        updateVisibleRange()
    }, [translateX, updateVisibleRange])

    if (items.length === 0) return null

    return (
        <div className="home-row mb-4" style={{ overflow: 'hidden' }}>
            {/* Row Title */}
            <div className="flex items-center justify-between px-4 mb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    {title}
                    <span className="text-gray-500 text-sm font-normal">({items.length})</span>
                </h2>
            </div>

            {/* Scrollable Container (Mask) */}
            <div
                ref={containerRef}
                className="relative h-[220px] w-full"
            >
                {/* Transform Layer */}
                <div
                    className="flex gap-3 absolute top-0 left-0 transition-transform duration-300 ease-out will-change-transform px-4"
                    style={{
                        transform: `translate3d(${translateX}px, 0, 0)`,
                        width: `${(items.length + 1) * FULL_ITEM_WIDTH}px` // Ensure width for all items
                    }}
                >
                    {items.map((item, index) => {
                        const isVisible = index >= visibleRange.start && index <= visibleRange.end
                        const posterUrl = getPosterUrl(item)
                        const itemTitle = getTitle(item)

                        if (!isVisible) {
                            return (
                                <div
                                    key={item.id || index}
                                    style={{ width: `${ITEM_WIDTH}px`, height: '195px', flexShrink: 0 }}
                                />
                            )
                        }

                        return (
                            <button
                                key={item.id || index}
                                className="focusable flex-shrink-0 rounded-lg transition-all duration-200 relative
                                         focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-105 focus:z-10
                                         bg-gray-800 border border-transparent focus:border-white"
                                style={{
                                    width: `${ITEM_WIDTH}px`,
                                    aspectRatio: '2/3'
                                }}
                                onClick={() => onItemClick && onItemClick(item)}
                                onFocus={() => {
                                    setFocusedIndex(index)
                                    onFocusChange && onFocusChange(item)
                                }}
                            >
                                {posterUrl ? (
                                    <img
                                        src={posterUrl}
                                        alt={itemTitle}
                                        className="w-full h-full object-cover rounded-lg"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center p-2">
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
                            </button>
                        )
                    })}

                    {/* "More" Card */}
                    {onMoreClick && (
                        <button
                            className="focusable flex-shrink-0 rounded-lg transition-all duration-200
                                     bg-gray-800/60 border-2 border-gray-600
                                     hover:border-blue-500 hover:bg-gray-700/70
                                     focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-105 focus:z-10
                                     flex flex-col items-center justify-center gap-2"
                            style={{
                                width: `${ITEM_WIDTH}px`,
                                aspectRatio: '2/3'
                            }}
                            onClick={() => onMoreClick(categoryId)}
                            onFocus={() => {
                                setFocusedIndex(items.length)
                                // No item change on "More" focus? Or clear info?
                                // onFocusChange(null) 
                            }}
                        >
                            <span className="text-5xl text-gray-300">→</span>
                            <span className="text-gray-300 text-sm font-semibold">Ещё</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default HomeRow
