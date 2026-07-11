import React, { useCallback, useRef, useState, forwardRef } from 'react'
import { getPosterUrl, getTitle } from '../utils/discover'
import { reportBrokenImage, getNextImageUrl } from '../utils/tmdbClient'
import { useSpatialItem } from '../hooks/useSpatialNavigation'
import { getBadgeStyle } from '../hooks/useQualityBadges'
import useTVNavigation from '../hooks/useTVNavigation'

const createImageErrorCache = () => {
    const urls = new Set()
    return {
        has: url => urls.has(url),
        add: url => urls.add(url)
    }
}

// O3: MovieCard now has local isBroken state to prevent full row re-renders
const MovieCard = ({ item, index, registerItem, onItemClick, onFocus, imageErrors, qualityBadges, watched, focused }) => {
    const spatialRef = useSpatialItem('main')
    const posterUrl = getPosterUrl(item)
    const title = getTitle(item)
    // Per-image fallback chain: mirror → server proxy → wsrv → broken
    const [imgSrc, setImgSrc] = useState(posterUrl)
    const [isBroken, setIsBroken] = useState(() => imageErrors.has(posterUrl))
    const originalTitle = item?.original_title || item?.original_name
    const badges = qualityBadges?.[title] || qualityBadges?.[originalTitle] || []
    const setCardRef = useCallback((node) => {
        spatialRef(node)
        registerItem(index, node)
    }, [index, registerItem, spatialRef])

    const handleImageError = () => {
        if (!imgSrc) return
        reportBrokenImage?.(imgSrc)
        const next = getNextImageUrl(imgSrc)
        if (next) {
            setImgSrc(next)
            return
        }
        imageErrors.add(posterUrl)
        setIsBroken(true)
    }

    return (
        // Using div instead of button to allow touch scroll on mobile
        // TV remote works via focus/Enter key which works on any focusable element
        <div
            ref={setCardRef}
            role="button"
            aria-label={title}
            tabIndex={focused ? 0 : -1}
            className={`focusable tv-card snap-item w-[130px] aspect-[2/3] rounded-lg bg-gray-800 border overflow-hidden relative ${focused ? 'focused border-white scale-[1.05]' : 'border-transparent'}`}
            onClick={() => onItemClick?.(item)}
            onFocus={onFocus}
        >
            {imgSrc && !isBroken ? (
                <img
                    src={imgSrc}
                    alt={title}
                    className={`w-full h-full object-cover pointer-events-none ${watched ? 'opacity-60' : ''}`}
                    loading="lazy"
                    onError={handleImageError}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-white">
                    {title}
                </div>
            )}

            {/* Quality Badges - top left */}
            {badges.length > 0 && (
                <div className="absolute top-1 left-1 flex gap-0.5">
                    {badges.slice(0, 2).map((badge, i) => (
                        <span key={i} className={`${getBadgeStyle(badge)} text-white text-[8px] font-black px-1 py-0.5 rounded shadow-sm`}>
                            {badge}
                        </span>
                    ))}
                </div>
            )}

            {/* Rating Badge - top right */}
            {item.vote_average > 0 && (
                <div className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${item.vote_average >= 7 ? 'bg-green-500' :
                    item.vote_average >= 5 ? 'bg-yellow-500 text-black' : 'bg-red-500'
                    }`}>
                    {item.vote_average.toFixed(1)}
                </div>
            )}

            {/* Watched marker - bottom left (already opened/seen) */}
            {watched && (
                <div className="absolute bottom-1 left-1 bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold shadow-sm pointer-events-none">
                    ✓
                </div>
            )}
        </div>
    )
}

const RowAction = ({ index, registerItem, focused, label, icon, onClick, onFocus }) => {
    const spatialRef = useSpatialItem('main')
    const setActionRef = useCallback((node) => {
        spatialRef(node)
        registerItem(index, node)
    }, [index, registerItem, spatialRef])

    return (
        <button
            ref={setActionRef}
            type="button"
            tabIndex={focused ? 0 : -1}
            onClick={onClick}
            onFocus={onFocus}
            className={`focusable snap-item w-[130px] aspect-[2/3] rounded-lg bg-gray-800/60 border-2 flex flex-col items-center justify-center gap-2 ${focused ? 'focused border-white scale-[1.05]' : 'border-gray-600'}`}
        >
            <span className="text-5xl text-gray-300" aria-hidden="true">{icon}</span>
            <span className="text-gray-300 text-sm font-semibold">{label}</span>
        </button>
    )
}

const HomeRow = forwardRef(({
    title,
    icon,
    source,
    items = [],
    categoryId,
    onItemClick,
    onFocusChange,
    onMoreClick,
    qualityBadges,
    qualityDebug,
    watchedIds,
    isActive = true,
    initialIndex = -1
}, ref) => {
    // O3: useRef instead of useState to prevent row re-renders on image errors
    const [imageErrors] = useState(createImageErrorCache)
    const scrollRef = useRef(null)
    const itemRefs = useRef([])
    const registerItem = useCallback((index, node) => {
        itemRefs.current[index] = node
    }, [])
    const [showStart, setShowStart] = useState(false)
    const actionCount = (showStart ? 1 : 0) + (onMoreClick ? 1 : 0)
    const itemCount = items.length + actionCount
    const startIndex = items.length
    const moreIndex = items.length + (showStart ? 1 : 0)

    function goToStart() {
        if (!scrollRef.current) return
        scrollRef.current.scrollLeft = 0
        setShowStart(false)
        setFocusedIndex(0)
        itemRefs.current[0]?.focus()
    }

    function handleSelect(index) {
        if (index < items.length) {
            onItemClick?.(items[index])
            return
        }
        if (showStart && index === startIndex) {
            goToStart()
            return
        }
        if (onMoreClick && index === moreIndex) onMoreClick(categoryId)
    }

    const { setFocusedIndex, containerProps, isFocused } = useTVNavigation({
        itemCount,
        columns: Math.max(itemCount, 1),
        itemRefs,
        initialIndex,
        trapFocus: false,
        isActive,
        onSelect: handleSelect
    })

    const handleScroll = () => {
        const el = scrollRef.current
        if (!el) return
        setShowStart(wasShown => (
            wasShown ? el.scrollLeft !== 0 : el.scrollLeft > el.clientWidth
        ))
    }

    const handleKeyDown = (event) => {
        containerProps.onKeyDown(event)
        if (event.defaultPrevented) event.stopPropagation()
    }

    // Touch scroll handler for mobile
    const touchStartX = useRef(0)
    const scrollStartX = useRef(0)

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX
        scrollStartX.current = scrollRef.current?.scrollLeft || 0
    }

    const handleTouchMove = (e) => {
        if (!scrollRef.current) return
        const deltaX = touchStartX.current - e.touches[0].clientX
        scrollRef.current.scrollLeft = scrollStartX.current + deltaX
    }

    if (items.length === 0) return null

    return (
        <div ref={ref} className="home-row mb-6">
            {/* Row Title */}
            <div className="flex items-center justify-between px-8 mb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
                    <span className="text-2xl">{icon}</span>
                    {title}
                    <span className="text-gray-500 text-sm font-normal">({items.length})</span>
                    {import.meta.env.DEV && qualityDebug && (
                        <span className="text-[11px] font-mono text-cyan-300/80">
                            q:{qualityDebug.queueSize} f:{qualityDebug.fetchCount}
                        </span>
                    )}
                </h2>
                {source && (
                    <span className="rounded bg-[#141821] px-2 py-1 text-[11px] font-medium tracking-[0.14em] text-white/60 uppercase">
                        {source}
                    </span>
                )}
            </div>

            {/* Snap Container (with touch scroll support) */}
            <div
                ref={scrollRef}
                tabIndex={containerProps.tabIndex}
                className="snap-container px-8 gap-4 overflow-x-auto scroll-smooth scrollbar-hide py-6 -my-4"
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
            >
                {items.map((item, index) => (
                    <MovieCard
                        key={item.id || index}
                        item={item}
                        index={index}
                        registerItem={registerItem}
                        onItemClick={onItemClick}
                        onFocus={() => {
                            setFocusedIndex(index)
                            onFocusChange?.(item)
                        }}
                        imageErrors={imageErrors}
                        qualityBadges={qualityBadges}
                        watched={watchedIds?.has(item.id)}
                        focused={isFocused(index)}
                    />
                ))}

                {showStart && (
                    <RowAction
                        index={startIndex}
                        registerItem={registerItem}
                        focused={isFocused(startIndex)}
                        label="В начало"
                        icon="←"
                        onClick={goToStart}
                        onFocus={() => setFocusedIndex(startIndex)}
                    />
                )}

                {onMoreClick && (
                    <RowAction
                        index={moreIndex}
                        registerItem={registerItem}
                        focused={isFocused(moreIndex)}
                        label="Показать все"
                        icon="→"
                        onClick={() => onMoreClick(categoryId)}
                        onFocus={() => setFocusedIndex(moreIndex)}
                    />
                )}
            </div>
        </div>
    )
})

HomeRow.displayName = 'HomeRow'

export default HomeRow
