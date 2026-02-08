import React, { useRef, useState, forwardRef, useMemo } from 'react'
import { getPosterUrl, getTitle } from '../utils/discover'
import { reportBrokenImage } from '../utils/tmdbClient'
import { useSpatialItem } from '../hooks/useSpatialNavigation'
import { useQualityBadges, getBadgeStyle } from '../hooks/useQualityBadges'

// O3: MovieCard now has local isBroken state to prevent full row re-renders
const MovieCard = ({ item, onItemClick, onFocus, imageErrorsRef, qualityBadges }) => {
    const spatialRef = useSpatialItem('main')
    const posterUrl = getPosterUrl(item)
    const title = getTitle(item)
    const [isBroken, setIsBroken] = useState(() => imageErrorsRef.current.has(posterUrl))
    const badges = qualityBadges?.[title] || []

    const handleImageError = () => {
        if (posterUrl) {
            imageErrorsRef.current.add(posterUrl)
            reportBrokenImage?.(posterUrl)
            setIsBroken(true)
        }
    }

    return (
        // Using div instead of button to allow touch scroll on mobile
        // TV remote works via focus/Enter key which works on any focusable element
        <div
            ref={spatialRef}
            role="button"
            tabIndex={0}
            className="focusable tv-card snap-item w-[130px] aspect-[2/3] rounded-lg bg-gray-800 border border-transparent overflow-hidden relative"
            onClick={() => onItemClick?.(item)}
            onKeyDown={(e) => { if (e.key === 'Enter') onItemClick?.(item) }}
            onFocus={onFocus}
        >
            {posterUrl && !isBroken ? (
                <img
                    src={posterUrl}
                    alt={title}
                    className="w-full h-full object-cover pointer-events-none"
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
        </div>
    )
}

const HomeRow = forwardRef(({
    title,
    icon,
    items = [],
    categoryId,
    onItemClick,
    onFocusChange,
    onMoreClick
}, ref) => {
    // O3: useRef instead of useState to prevent row re-renders on image errors
    const imageErrorsRef = useRef(new Set())
    const moreRef = useSpatialItem('main')
    const scrollRef = useRef(null)

    // Quality Discovery: collect titles for batch fetch
    const titles = useMemo(() => items.map(item => getTitle(item)).filter(Boolean), [items])
    const qualityBadges = useQualityBadges(titles)

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
        <div className="home-row mb-6">
            {/* Row Title */}
            <div className="flex items-center justify-between px-8 mb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
                    <span className="text-2xl">{icon}</span>
                    {title}
                    <span className="text-gray-500 text-sm font-normal">({items.length})</span>
                </h2>
            </div>

            {/* Snap Container (with touch scroll support) */}
            <div
                ref={scrollRef}
                className="snap-container px-8 gap-4 overflow-x-auto scroll-smooth scrollbar-hide py-6 -my-4"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
            >
                {items.map((item, index) => (
                    <MovieCard
                        key={item.id || index}
                        item={item}
                        onItemClick={onItemClick}
                        onFocus={() => onFocusChange?.(item)}
                        imageErrorsRef={imageErrorsRef}
                        qualityBadges={qualityBadges}
                    />
                ))}

                {/* "More" Card */}
                {onMoreClick && (
                    <button
                        onClick={() => onMoreClick(categoryId)}
                        className="focusable snap-item w-[130px] aspect-[2/3] rounded-lg bg-gray-800/60 border-2 border-gray-600 flex flex-col items-center justify-center gap-2"
                        ref={moreRef}
                    >
                        <span className="text-5xl text-gray-300">→</span>
                        <span className="text-gray-300 text-sm font-semibold">Ещё</span>
                    </button>
                )}
            </div>
        </div>
    )
})

HomeRow.displayName = 'HomeRow'

export default HomeRow