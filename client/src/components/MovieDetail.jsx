/**
 * MovieDetail.jsx — Movie/TV Show Detail Page
 * Lampa-style full card view with description and actions
 * 
 * Features:
 * - Large backdrop with gradient overlay
 * - Poster + movie info (title, year, rating, genres)
 * - Description text
 * - Action buttons: "Найти торренты", "Назад"
 * - TV navigation support
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { getBackdropUrl, getPosterUrl, getTitle, getYear, getSearchQuery } from '../utils/discover'
import { getGenresForItem } from '../utils/genres'
import { reportBrokenImage } from '../utils/tmdbClient'

const MovieDetail = ({
    item,
    onSearch,
    onBack,
}) => {
    const containerRef = useRef(null)
    const searchButtonRef = useRef(null)
    const backButtonRef = useRef(null)
    const [focusedButton, setFocusedButton] = useState('search') // 'search' | 'back'

    if (!item) return null

    const backdropUrl = getBackdropUrl(item, 'w1280')
    const posterUrl = getPosterUrl(item, 'w500')
    const title = getTitle(item)
    const year = getYear(item)
    const rating = item.vote_average?.toFixed(1)
    const genres = getGenresForItem(item)
    const overview = item.overview || 'Описание отсутствует'
    const mediaType = item.media_type === 'tv' || item.name ? 'Сериал' : 'Фильм'

    // Handle search button click
    const handleSearch = useCallback(() => {
        const query = getSearchQuery(item)
        console.log('[MovieDetail] Searching for:', query)
        onSearch?.(query)
    }, [item, onSearch])

    // Keyboard navigation
    const handleKeyDown = useCallback((e) => {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault()
                if (focusedButton === 'back') {
                    setFocusedButton('search')
                    searchButtonRef.current?.focus()
                }
                break
            case 'ArrowRight':
                e.preventDefault()
                if (focusedButton === 'search') {
                    setFocusedButton('back')
                    backButtonRef.current?.focus()
                }
                break
            case 'Enter':
            case ' ':
                e.preventDefault()
                if (focusedButton === 'search') {
                    handleSearch()
                } else {
                    onBack?.()
                }
                break
            case 'Escape':
            case 'Backspace':
                e.preventDefault()
                e.stopPropagation()
                console.log('[MovieDetail] Back button pressed')
                onBack?.()
                break
        }
    }, [focusedButton, handleSearch, onBack])

    // Capacitor hardware back button (Android TV remote)
    useEffect(() => {
        const backHandler = CapacitorApp.addListener('backButton', () => {
            console.log('[MovieDetail] Capacitor back button pressed')
            onBack?.()
        })

        return () => {
            backHandler.then(h => h.remove())
        }
    }, [onBack])

    // Focus search button on mount
    useEffect(() => {
        searchButtonRef.current?.focus()
    }, [])

    return (
        <div
            ref={containerRef}
            className="movie-detail fixed inset-0 z-50 bg-gray-900 overflow-hidden"
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{
                    background: backdropUrl
                        ? `linear-gradient(to right, rgba(17,24,39,1) 0%, rgba(17,24,39,0.9) 30%, rgba(17,24,39,0.7) 50%, rgba(17,24,39,0.4) 100%), url(${backdropUrl}) center/cover no-repeat`
                        : 'linear-gradient(to bottom, #1f2937"#111827 100%)'
                }}
            />

            {/* Content */}
            <div className="relative z-10 h-full overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-6 p-6 md:p-10 max-w-6xl mx-auto">

                    {/* Left: Poster */}
                    <div className="flex-shrink-0">
                        <div
                            className="rounded-xl overflow-hidden shadow-2xl"
                            style={{ width: '200px', aspectRatio: '2/3' }}
                        >
                            {posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        reportBrokenImage(e.target.src)
                                        e.target.style.display = 'none'
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                                    <span className="text-white text-4xl">🎬</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 flex flex-col gap-4">
                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                            {title}
                        </h1>

                        {/* Original title */}
                        {item.original_title && item.original_title !== title && (
                            <p className="text-gray-400 text-lg -mt-2">
                                {item.original_title}
                            </p>
                        )}

                        {/* Meta info row */}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            {/* Rating */}
                            {rating && parseFloat(rating) > 0 && (
                                <span className={`
                                    px-3 py-1 rounded-lg font-bold text-white
                                    ${parseFloat(rating) >= 7 ? 'bg-green-600' :
                                        parseFloat(rating) >= 5 ? 'bg-yellow-600' : 'bg-red-600'}
                                `}>
                                    ★ {rating}
                                </span>
                            )}

                            {/* Year */}
                            {year && (
                                <span className="px-3 py-1 bg-gray-700/80 text-gray-200 rounded-lg">
                                    {year}
                                </span>
                            )}

                            {/* Media Type */}
                            <span className="px-3 py-1 bg-blue-600/80 text-white rounded-lg">
                                {mediaType === 'Сериал' ? '📺' : '🎬'} {mediaType}
                            </span>
                        </div>

                        {/* Genres */}
                        {genres && genres.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {genres.map((genre, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1 bg-gray-700/50 text-gray-300 rounded-full text-sm"
                                    >
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Tagline */}
                        {item.tagline && (
                            <p className="text-gray-400 italic text-lg">
                                «{item.tagline}»
                            </p>
                        )}

                        {/* Description */}
                        <div className="mt-2">
                            <h3 className="text-lg font-semibold text-white mb-2">Описание</h3>
                            <p className="text-gray-300 leading-relaxed text-base max-w-2xl">
                                {overview}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-4 mt-6">
                            <button
                                ref={searchButtonRef}
                                onClick={handleSearch}
                                onFocus={() => setFocusedButton('search')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl 
                                         transition-all duration-200 flex items-center gap-2
                                         focus:outline-none focus:ring-4 focus:ring-blue-400 focus:scale-105"
                            >
                                <span className="text-xl">🔍</span>
                                Найти торренты
                            </button>

                            <button
                                ref={backButtonRef}
                                onClick={onBack}
                                onFocus={() => setFocusedButton('back')}
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl 
                                         transition-all duration-200 flex items-center gap-2
                                         focus:outline-none focus:ring-4 focus:ring-gray-500"
                            >
                                <span className="text-xl">←</span>
                                Назад
                            </button>
                        </div>

                        {/* Additional info (seasons/episodes for TV) */}
                        {item.number_of_seasons && (
                            <div className="mt-4 text-gray-400 text-sm">
                                📺 {item.number_of_seasons} сезонов
                                {item.number_of_episodes && ` • ${item.number_of_episodes} эпизодов`}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MovieDetail
