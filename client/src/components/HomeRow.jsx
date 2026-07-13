import React, { useCallback, useRef, useState, useEffect, forwardRef } from 'react'
import { getPosterUrl, getTitle, getBackdropUrl, getYear } from '../utils/discover'
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
const MovieCard = ({ item, index, layout, registerItem, onItemClick, onFocus, imageErrors, qualityBadges, watched, focused }) => {
    const spatialRef = useSpatialItem('main')
    const isBackdrop = layout === 'backdrop_below'
    const isPosterBelow = layout === 'poster_below'

    const imageUrl = isBackdrop ? getBackdropUrl(item, 'w500') : getPosterUrl(item)
    const title = getTitle(item)
    const [imgSrc, setImgSrc] = useState(imageUrl)
    const [isBroken, setIsBroken] = useState(() => imageErrors.has(imageUrl))
    const originalTitle = item?.original_title || item?.original_name
    const badges = qualityBadges?.[title] || qualityBadges?.[originalTitle] || []

    useEffect(() => {
        setImgSrc(imageUrl)
        setIsBroken(imageErrors.has(imageUrl))
    }, [imageUrl, imageErrors])

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
        imageErrors.add(imageUrl)
        setIsBroken(true)
    }
    if (isBackdrop || isPosterBelow) {
        return (
            <div
                ref={setCardRef}
                role="button"
                aria-label={title}
                tabIndex={focused ? 0 : -1}
                className={`focusable tv-card snap-item rounded-lg relative outline-none cursor-pointer transition-all duration-300 ${
                    isBackdrop ? 'w-[240px]' : 'w-[130px]'
                }`}
                onClick={() => onItemClick?.(item)}
                onFocus={onFocus}
            >
                {/* Image Container with focus scaling and mint border */}
                <div className={`relative w-full overflow-hidden rounded-lg bg-gray-800 border transition-all duration-300 ${
                    isBackdrop ? 'aspect-[16/9]' : 'aspect-[2/3]'
                } ${
                    focused ? 'border-[#63F5C7] scale-105 shadow-[0_12px_24px_rgba(0,0,0,0.55)] z-10' : 'border-transparent'
                }`}>
                    {imgSrc && !isBroken ? (
                        <img
                            src={imgSrc}
                            alt={title}
                            className={`w-full h-full object-cover pointer-events-none ${watched ? 'opacity-50' : ''}`}
                            loading="lazy"
                            onError={handleImageError}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-white">
                            {title}
                        </div>
                    )}

                    {/* Overlay with title, rating, year — same style for both backdrop and poster_below */}
                    <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080A0F] via-[#080A0F]/70 to-transparent flex flex-col justify-end ${
                        isBackdrop ? 'p-2.5' : 'p-1.5 pt-8'
                    }`}>
                        <h3 className={`min-w-0 truncate font-extrabold text-[#F4F7FA] leading-tight mb-0.5 ${
                            isBackdrop ? 'text-[11px]' : 'text-[10px]'
                        }`}>{title}</h3>
                        {isBackdrop && item.overview && (
                            <p className="line-clamp-1 text-[9px] text-[#F4F7FA]/75 mb-1 leading-normal font-medium">
                                {item.overview}
                            </p>
                        )}
                        <div className={`flex items-center gap-1.5 font-semibold text-[#F4F7FA]/70 ${
                            isBackdrop ? 'text-[8px]' : 'text-[7px]'
                        }`}>
                            {item.vote_average > 0 && (
                                <span className="text-[#63F5C7] font-bold">★ {item.vote_average.toFixed(1)}</span>
                            )}
                            {getYear(item) && <span>{getYear(item)}</span>}
                            {badges.slice(0, 1).map((badge, i) => (
                                <span key={i} className="rounded bg-[#F6D365]/90 px-1 py-0.2 font-black text-[#080A0F] text-[7px]">
                                    {badge}
                                </span>
                            ))}
                            {watched && (
                                <span className="text-blue-400 font-extrabold ml-auto">✓</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        // Using div instead of button to allow touch scroll on mobile
        // TV remote works via focus/Enter key which works on any focusable element
        <div
            ref={setCardRef}
            role="button"
            aria-label={title}
            tabIndex={focused ? 0 : -1}
            className={`focusable tv-card snap-item w-[130px] aspect-[2/3] rounded-lg bg-gray-800 border overflow-hidden relative ${focused ? 'focused border-[#63F5C7] scale-[1.05]' : 'border-transparent'}`}
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
    layout,
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
    const startIndex = 0
    const mediaOffset = showStart ? 1 : 0
    const moreIndex = items.length + mediaOffset
    const rowCardWidth = layout === 'backdrop_below' ? 240 : 130
    const centerRowStyle = {
        '--tv-row-card-width': `${rowCardWidth}px`,
        '--tv-row-card-half-width': `${rowCardWidth / 2}px`
    }

    function goToStart() {
        if (!scrollRef.current) return
        const firstMedia = itemRefs.current[mediaOffset]
        scrollRef.current.scrollLeft = 0
        firstMedia?.focus()
        setShowStart(false)
        requestAnimationFrame(() => {
            setFocusedIndex(0)
            itemRefs.current[0]?.focus()
        })
    }

    function handleSelect(index) {
        if (showStart && index === startIndex) {
            goToStart()
            return
        }
        const mediaIndex = index - mediaOffset
        if (mediaIndex >= 0 && mediaIndex < items.length) {
            onItemClick?.(items[mediaIndex])
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
        const shouldShow = showStart ? el.scrollLeft !== 0 : el.scrollLeft > el.clientWidth
        if (shouldShow === showStart) return
        setFocusedIndex(index => index < 0 ? index : Math.max(0, index + (shouldShow ? 1 : -1)))
        setShowStart(shouldShow)
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
                className="snap-container tv-center-row gap-4 overflow-x-auto scrollbar-hide py-6 -my-4"
                style={centerRowStyle}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
            >
                <div className="tv-row-edge-spacer tv-row-leading-spacer" aria-hidden="true" />

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

                {items.map((item, index) => (
                    <MovieCard
                        key={item.id || index}
                        item={item}
                        index={index + mediaOffset}
                        layout={layout}
                        registerItem={registerItem}
                        onItemClick={onItemClick}
                        onFocus={() => {
                            setFocusedIndex(index + mediaOffset)
                            onFocusChange?.(item, index, categoryId, scrollRef.current?.scrollLeft || 0)
                        }}
                        imageErrors={imageErrors}
                        qualityBadges={qualityBadges}
                        watched={watchedIds?.has(item.id)}
                        focused={isFocused(index + mediaOffset)}
                    />
                ))}

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

                <div className="tv-row-edge-spacer tv-row-trailing-spacer" aria-hidden="true" />
            </div>
        </div>
    )
})

HomeRow.displayName = 'HomeRow'

export default HomeRow
