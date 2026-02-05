import React, { useRef, useState, forwardRef } from 'react'
import { getPosterUrl, getTitle } from '../utils/discover'
import { reportBrokenImage } from '../utils/tmdbClient'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const MovieCard = ({ item, onItemClick, onFocus, imageErrors, setImageErrors }) => {
    const spatialRef = useSpatialItem('main')
    const posterUrl = getPosterUrl(item)
    const title = getTitle(item)

    return (
        // Using div instead of button to allow touch scroll on mobile
        // TV remote works via focus/Enter key which works on any focusable element
        <div
            ref={spatialRef}
            role="button"
            tabIndex={0}
            className="focusable tv-card snap-item w-[130px] aspect-[2/3] rounded-lg bg-gray-800 border border-transparent overflow-hidden"
            onClick={() => onItemClick?.(item)}
            onKeyDown={(e) => { if (e.key === 'Enter') onItemClick?.(item) }}
            onFocus={onFocus}
        >
            {posterUrl && !imageErrors.has(posterUrl) ? (
                <img
                    src={posterUrl}
                    alt={title}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                    onError={() => {
                        reportBrokenImage?.(posterUrl)
                        setImageErrors(prev => new Set(prev).add(posterUrl))
                    }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-white">
                    {title}
                </div>
            )}

            {/* Rating Badge */}
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
    const [imageErrors, setImageErrors] = useState(new Set())
    const moreRef = useSpatialItem('main')
    const scrollRef = useRef(null)

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
                        imageErrors={imageErrors}
                        setImageErrors={setImageErrors}
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