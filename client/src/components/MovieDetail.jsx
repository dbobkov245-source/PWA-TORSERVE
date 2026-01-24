/**
 * MovieDetail.jsx — Movie/TV Show Detail Page
 * Lampa-style full card view with description and actions
 * 
 * Features:
 * - Large backdrop with gradient overlay
 * - Poster + movie info (title, year, rating, genres)
 * - Description text
 * - Directors and Cast (LAMPA-style)
 * - Trailer link
 * - Action buttons: "Найти торренты", "Назад"
 * - TV navigation support
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { getBackdropUrl, getPosterUrl, getTitle, getYear, getSearchQuery } from '../utils/discover'
import { getGenresForItem, getGenreObjectsForItem } from '../utils/genres'
import { reportBrokenImage, getCredits, getVideos, getImageUrl, getDetails, getSeasonDetails, getRecommendations } from '../utils/tmdbClient'

const MovieDetail = ({
    item,
    onSearch,
    onBack,
    onSelect, // Access to recursion
    onSelectPerson, // Access to actor graph
    onSelectGenre, // Access to genre graph
}) => {
    // Focus Zones
    const ZONES = {
        HEADER: 'header',
        GENRES: 'genres', // New Zone
        SEASONS: 'seasons',
        EPISODES: 'episodes',
        CAST: 'cast',
        SIMILAR: 'similar'
    }

    const containerRef = useRef(null)
    const searchButtonRef = useRef(null)
    const backButtonRef = useRef(null)
    const trailerButtonRef = useRef(null)

    // List container refs for auto-scroll of ITEMS
    const castListRef = useRef(null)
    const similarListRef = useRef(null)
    const genreListRef = useRef(null)

    // Zone State
    const [activeZone, setActiveZone] = useState(ZONES.HEADER)
    const [focusedButton, setFocusedButton] = useState('search') // 'search' | 'back' | 'trailer'

    // Extended info state (LAMPA-style)
    const [directors, setDirectors] = useState([])
    const [cast, setCast] = useState([])
    const [seasons, setSeasons] = useState([])
    const [selectedSeason, setSelectedSeason] = useState(null)
    const [episodes, setEpisodes] = useState([])
    const [imageErrors, setImageErrors] = useState(new Set()) // Track failed images to prevent flip-flop
    const [focusedEpisodeIndex, setFocusedEpisodeIndex] = useState(0)
    const [focusedSeasonIndex, setFocusedSeasonIndex] = useState(0)
    const [focusedCastIndex, setFocusedCastIndex] = useState(0)
    const [focusedSimilarIndex, setFocusedSimilarIndex] = useState(0)
    const [focusedGenreIndex, setFocusedGenreIndex] = useState(0) // New state

    const [recommendations, setRecommendations] = useState([])
    const [trailer, setTrailer] = useState(null)
    const [loadingExtra, setLoadingExtra] = useState(true)
    const [loadingEpisodes, setLoadingEpisodes] = useState(false)

    if (!item) return null

    const backdropUrl = getBackdropUrl(item, 'w1280')
    const posterUrl = getPosterUrl(item, 'w500')
    const title = getTitle(item)
    const year = getYear(item)
    const rating = item.vote_average?.toFixed(1)
    // --- Moved to top ---
    const overview = item.overview || 'Описание отсутствует'
    const mediaType = item.media_type === 'tv' || item.name ? 'tv' : 'movie'
    const mediaTypeLabel = mediaType === 'tv' ? 'Сериал' : 'Фильм'
    const itemGenres = getGenreObjectsForItem(item)
    const genres = getGenresForItem(item)

    // Stable URL helpers that respect imageErrors state
    const getStablePosterUrl = (target, size = 'w500') => {
        const url = getPosterUrl(target, size)
        if (imageErrors.has(url)) return posterUrl // Use main item poster as fallback
        return url
    }

    const getStableImageUrl = (path, size = 'w300') => {
        const url = getImageUrl(path, size)
        if (imageErrors.has(url)) return null
        return url
    }

    // Handle search button click
    const handleSearch = useCallback(() => {
        const query = getSearchQuery(item)
        console.log('[MovieDetail] Searching for:', query)
        onSearch?.(query)
    }, [item, onSearch])

    // Load episodes for a season
    const fetchEpisodes = async (seasonNumber) => {
        setLoadingEpisodes(true)
        try {
            const data = await getSeasonDetails(item.id, seasonNumber)
            setEpisodes(data.episodes || [])
            setFocusedEpisodeIndex(0) // Reset focus to first episode
            // Scroll to episodes list?
        } catch (err) {
            console.error('[MovieDetail] Failed to load episodes:', err)
        } finally {
            setLoadingEpisodes(false)
        }
    }

    // Handle Season Selection
    const handleSeasonSelect = (season, index) => {
        if (selectedSeason?.id === season.id) {
            // Already selected - Toggle? Or just focus episodes?
            setActiveZone(ZONES.EPISODES)
        } else {
            setSelectedSeason(season)
            setFocusedSeasonIndex(index)
            fetchEpisodes(season.season_number)
            // Stay in seasons zone until user moves down? Or auto-move?
            // UX Decision: Stay in seasons, let user see episodes appear, then move down.
        }
    }

    // Play Episode
    const handleEpisodeClick = (episode) => {
        // Find SxxExx
        const s = episode.season_number.toString().padStart(2, '0')
        const e = episode.episode_number.toString().padStart(2, '0')
        const query = `${title} S${s}E${e}`
        console.log('[MovieDetail] Searching Episode:', query)
        onSearch?.(query)
    }

    // ─────────────────────────────────────────────────────────────
    // 🎮 Zone-Based Navigation (The Core Logic)
    // ─────────────────────────────────────────────────────────────
    const handleKeyDown = useCallback((e) => {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault()
                if (activeZone === ZONES.HEADER) {
                    if (focusedButton === 'back') {
                        setFocusedButton('search')
                        searchButtonRef.current?.focus()
                    } else if (focusedButton === 'trailer') {
                        setFocusedButton('search')
                        searchButtonRef.current?.focus()
                    }
                } else if (activeZone === ZONES.GENRES) {
                    setFocusedGenreIndex(prev => Math.max(0, prev - 1))
                } else if (activeZone === ZONES.SEASONS) {
                    setFocusedSeasonIndex(prev => Math.max(0, prev - 1))
                } else if (activeZone === ZONES.CAST) {
                    setFocusedCastIndex(prev => Math.max(0, prev - 1))
                } else if (activeZone === ZONES.SIMILAR) {
                    setFocusedSimilarIndex(prev => Math.max(0, prev - 1))
                }
                break

            case 'ArrowRight':
                e.preventDefault()
                if (activeZone === ZONES.HEADER) {
                    if (focusedButton === 'search') {
                        setFocusedButton('back')
                        backButtonRef.current?.focus()
                    }
                    // Trailer handled via Up from Search
                } else if (activeZone === ZONES.GENRES) {
                    setFocusedGenreIndex(prev => Math.min(itemGenres.length - 1, prev + 1))
                } else if (activeZone === ZONES.SEASONS) {
                    setFocusedSeasonIndex(prev => Math.min(seasons.length - 1, prev + 1))
                } else if (activeZone === ZONES.CAST) {
                    setFocusedCastIndex(prev => Math.min(cast.length - 1, prev + 1))
                } else if (activeZone === ZONES.SIMILAR) {
                    setFocusedSimilarIndex(prev => Math.min(recommendations.length - 1, prev + 1))
                }
                break

            case 'ArrowUp':
                e.preventDefault()
                if (activeZone === ZONES.GENRES) {
                    setActiveZone(ZONES.HEADER)
                    setFocusedButton('search')
                    searchButtonRef.current?.focus()
                } else if (activeZone === ZONES.SEASONS) {
                    if (itemGenres.length > 0) setActiveZone(ZONES.GENRES)
                    else {
                        setActiveZone(ZONES.HEADER)
                        setFocusedButton('search')
                        searchButtonRef.current?.focus()
                    }
                } else if (activeZone === ZONES.EPISODES) {
                    if (focusedEpisodeIndex === 0) {
                        setActiveZone(ZONES.SEASONS)
                    } else {
                        setFocusedEpisodeIndex(prev => Math.max(0, prev - 1))
                    }
                } else if (activeZone === ZONES.CAST) {
                    if (episodes.length > 0) setActiveZone(ZONES.EPISODES)
                    else if (seasons.length > 0) setActiveZone(ZONES.SEASONS)
                    else if (itemGenres.length > 0) setActiveZone(ZONES.GENRES)
                    else {
                        setActiveZone(ZONES.HEADER)
                        setFocusedButton('search')
                        searchButtonRef.current?.focus()
                    }
                } else if (activeZone === ZONES.SIMILAR) {
                    if (cast.length > 0) setActiveZone(ZONES.CAST)
                    else if (episodes.length > 0) setActiveZone(ZONES.EPISODES)
                    else if (seasons.length > 0) setActiveZone(ZONES.SEASONS)
                    else if (itemGenres.length > 0) setActiveZone(ZONES.GENRES)
                    else {
                        setActiveZone(ZONES.HEADER)
                        setFocusedButton('search')
                        searchButtonRef.current?.focus()
                    }
                } else if (activeZone === ZONES.HEADER) {
                    if (trailer && (focusedButton === 'search' || focusedButton === 'back')) {
                        setFocusedButton('trailer')
                        trailerButtonRef.current?.focus()
                    }
                }
                break

            case 'ArrowDown':
                e.preventDefault()
                if (activeZone === ZONES.HEADER) {
                    if (itemGenres.length > 0) {
                        setActiveZone(ZONES.GENRES)
                        setFocusedGenreIndex(0)
                    } else if (seasons.length > 0) {
                        setActiveZone(ZONES.SEASONS)
                    } else if (cast.length > 0) {
                        setActiveZone(ZONES.CAST)
                    } else if (recommendations.length > 0) {
                        setActiveZone(ZONES.SIMILAR)
                    }
                } else if (activeZone === ZONES.GENRES) {
                    if (seasons.length > 0) {
                        setActiveZone(ZONES.SEASONS)
                    } else if (cast.length > 0) {
                        setActiveZone(ZONES.CAST)
                    } else if (recommendations.length > 0) {
                        setActiveZone(ZONES.SIMILAR)
                    }
                } else if (activeZone === ZONES.SEASONS) {
                    if (startEpisodeSelection()) {
                        setActiveZone(ZONES.EPISODES)
                    } else if (cast.length > 0) {
                        setActiveZone(ZONES.CAST)
                    } else if (recommendations.length > 0) {
                        setActiveZone(ZONES.SIMILAR)
                    }
                } else if (activeZone === ZONES.EPISODES) {
                    if (focusedEpisodeIndex < episodes.length - 1) {
                        setFocusedEpisodeIndex(prev => prev + 1)
                    } else {
                        // End of episodes -> Cast -> Similar
                        if (cast.length > 0) setActiveZone(ZONES.CAST)
                        else if (recommendations.length > 0) setActiveZone(ZONES.SIMILAR)
                    }
                } else if (activeZone === ZONES.CAST) {
                    if (recommendations.length > 0) setActiveZone(ZONES.SIMILAR)
                }
                break

            case 'Enter':
            case ' ':
                e.preventDefault()
                if (activeZone === ZONES.HEADER) {
                    if (focusedButton === 'search') handleSearch()
                    else if (focusedButton === 'back') onBack?.()
                    else if (focusedButton === 'trailer') Browser.open({ url: `https://www.youtube.com/watch?v=${trailer.key}` })
                } else if (activeZone === ZONES.GENRES) {
                    const genre = itemGenres[focusedGenreIndex]
                    if (genre) onSelectGenre?.(genre)
                } else if (activeZone === ZONES.SEASONS) {
                    const season = seasons[focusedSeasonIndex]
                    if (season) handleSeasonSelect(season, focusedSeasonIndex)
                } else if (activeZone === ZONES.EPISODES) {
                    const ep = episodes[focusedEpisodeIndex]
                    if (ep) handleEpisodeClick(ep)
                } else if (activeZone === ZONES.CAST) {
                    const actor = cast[focusedCastIndex]
                    if (actor && onSelectPerson) {
                        onSelectPerson(actor)
                        containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
                    }
                } else if (activeZone === ZONES.SIMILAR) {
                    const rec = recommendations[focusedSimilarIndex]
                    if (rec && onSelect) {
                        onSelect(rec)
                        containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
                    }
                }
                break

            case 'Escape':
            case 'Backspace':
                e.preventDefault()
                e.stopPropagation()
                if (activeZone === ZONES.SIMILAR) {
                    if (cast.length > 0) setActiveZone(ZONES.CAST)
                    else setActiveZone(ZONES.HEADER)
                } else if (activeZone === ZONES.CAST) {
                    setActiveZone(ZONES.HEADER)
                } else if (activeZone === ZONES.EPISODES) {
                    setActiveZone(ZONES.SEASONS)
                } else if (activeZone === ZONES.SEASONS) {
                    setActiveZone(ZONES.HEADER)
                    setFocusedButton('search')
                    searchButtonRef.current?.focus()
                } else {
                    onBack?.()
                }
                break
        }
    }, [activeZone, focusedButton, focusedSeasonIndex, focusedEpisodeIndex, focusedSimilarIndex, focusedCastIndex, focusedGenreIndex, seasons, episodes, cast, recommendations, trailer, item, itemGenres])

    const startEpisodeSelection = () => {
        if (selectedSeason && episodes.length > 0) return true
        // Auto-select first season if none selected?
        if (!selectedSeason && seasons.length > 0) {
            handleSeasonSelect(seasons[0], 0)
            return false // Wait for load
        }
        return false
    }

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

    // Load extended info (credits, videos) - LAMPA-style
    useEffect(() => {
        if (!item?.id) return

        const controller = new AbortController()

        const loadExtendedInfo = async () => {
            setLoadingExtra(true)
            try {
                // Load full details (for seasons)
                const details = await getDetails(item.id, mediaType)
                if (controller.signal.aborted) return

                if (details && mediaType === 'tv') {
                    setSeasons(details.seasons || [])
                }

                // Load credits
                const creditsData = await getCredits(item.id, mediaType)
                if (controller.signal.aborted) return

                const directorsList = creditsData.crew?.filter(p => p.job === 'Director') || []
                const castList = creditsData.cast?.slice(0, 8) || [] // Top 8 actors
                setDirectors(directorsList)
                setCast(castList)

                // Load videos
                const videosData = await getVideos(item.id, mediaType)
                if (controller.signal.aborted) return

                const trailerVideo = videosData.results?.find(
                    v => v.type === 'Trailer' && v.site === 'YouTube'
                ) || videosData.results?.[0]
                setTrailer(trailerVideo)

                // Load Recommendations (Graph)
                const recData = await getRecommendations(item.id, mediaType)
                if (controller.signal.aborted) return

                setRecommendations(recData.results || [])

            } catch (err) {
                if (err.name === 'AbortError') return
                console.warn('[MovieDetail] Failed to load extended info:', err.message)
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingExtra(false)
                }
            }
        }

        loadExtendedInfo()
        return () => controller.abort()
    }, [item?.id, mediaType])

    // Reset state on new item
    useEffect(() => {
        setEpisodes([])
        setImageErrors(new Set())
        setSelectedSeason(null)
        setFocusedSeasonIndex(0)
        setFocusedEpisodeIndex(0)
        setFocusedSimilarIndex(0)
        setFocusedCastIndex(0)
        setActiveZone(ZONES.HEADER)
        setFocusedButton('search')
    }, [item?.id])

    // Auto-scroll episodes into view
    const episodesListRef = useRef(null)
    useEffect(() => {
        if (activeZone === ZONES.EPISODES && episodesListRef.current) {
            const el = episodesListRef.current.children[focusedEpisodeIndex]
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [focusedEpisodeIndex, activeZone])

    // Auto-scroll seasons
    const seasonsRef = useRef(null)
    useEffect(() => {
        if (activeZone === ZONES.SEASONS && seasonsRef.current) {
            const el = seasonsRef.current.children[focusedSeasonIndex]
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
    }, [focusedSeasonIndex, activeZone])

    // BUG-B: Auto-scroll Cast section into view when focused
    const castSectionRef = useRef(null)
    useEffect(() => {
        if (activeZone === ZONES.CAST && castSectionRef.current) {
            castSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [activeZone])

    // BUG-B: Auto-scroll Similar section into view when focused
    // BUG-B: Auto-scroll Similar section into view when focused
    const similarSectionRef = useRef(null)
    useEffect(() => {
        if (activeZone === ZONES.SIMILAR && similarSectionRef.current) {
            similarSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [activeZone])

    // --- NEW: Item-level auto-scroll ---

    // Auto-scroll Cast ITEMS
    useEffect(() => {
        if (activeZone === ZONES.CAST && castListRef.current) {
            const el = castListRef.current.children[focusedCastIndex]
            el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
        }
    }, [focusedCastIndex, activeZone])

    // Auto-scroll Similar ITEMS
    useEffect(() => {
        if (activeZone === ZONES.SIMILAR && similarListRef.current) {
            const el = similarListRef.current.children[focusedSimilarIndex]
            el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
        }
    }, [focusedSimilarIndex, activeZone])

    // Auto-scroll Episodes section into view
    const episodesSectionRef = useRef(null)
    useEffect(() => {
        if (activeZone === ZONES.EPISODES && episodesSectionRef.current) {
            episodesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [activeZone])

    // Auto-scroll Episode ITEMS
    useEffect(() => {
        if (activeZone === ZONES.EPISODES && episodesListRef.current) {
            const el = episodesListRef.current.children[focusedEpisodeIndex]
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [focusedEpisodeIndex, activeZone])

    // Auto-scroll Genre ITEMS
    useEffect(() => {
        if (activeZone === ZONES.GENRES && genreListRef.current) {
            const el = genreListRef.current.children[focusedGenreIndex]
            el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
        }
    }, [focusedGenreIndex, activeZone])



    // --- Variables moved to top ---
    // Auto-scroll Genre ITEMS if necessary (though they wrap, so block: nearest is fine)
    // Assuming genres are wrapped manually or handled by layout. 
    // Usually genres are few, but good to reset index if switching items
    useEffect(() => {
        setFocusedGenreIndex(0)
    }, [item?.id])

    // Focus search button on mount
    useEffect(() => {
        searchButtonRef.current?.focus()
    }, [])

    // BUG-FIX: Removed duplicate global keydown listener that was causing double index increment.
    // Navigation is now handled solely by the container's onKeyDown handler (line 500).

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

            {/* Content Container - Transparent to show backdrop */}
            <div className="relative z-10 h-full overflow-y-auto bg-transparent">
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 p-6 md:p-10 max-w-7xl mx-auto">

                    {/* Left: Poster */}
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                        <div
                            className="rounded-xl overflow-hidden shadow-2xl relative z-20"
                            style={{ width: '220px', aspectRatio: '2/3' }}
                        >
                            {posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        reportBrokenImage(e.target.src)
                                        setImageErrors(prev => new Set([...prev, e.target.src]))
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

                    {/* Right: Info - min-w-0 ensures flex children shrink properly */}
                    <div className="flex flex-col gap-4 min-w-0">
                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-md">
                            {title}
                        </h1>

                        {/* Original title */}
                        {item.original_title && item.original_title !== title && (
                            <p className="text-gray-300 text-lg -mt-2 drop-shadow-sm">
                                {item.original_title}
                            </p>
                        )}

                        {/* Meta info row */}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            {/* Rating */}
                            {rating && parseFloat(rating) > 0 && (
                                <span className={`
                                    px-3 py-1 rounded-lg font-bold text-white shadow-sm
                                    ${parseFloat(rating) >= 7 ? 'bg-green-600' :
                                        parseFloat(rating) >= 5 ? 'bg-yellow-600' : 'bg-red-600'}
                                `}>
                                    ★ {rating}
                                </span>
                            )}

                            {/* Year */}
                            {year && (
                                <span className="px-3 py-1 bg-gray-800/80 text-gray-200 rounded-lg shadow-sm backdrop-blur-sm">
                                    {year}
                                </span>
                            )}

                            {/* Media Type */}
                            <span className="px-3 py-1 bg-blue-600/80 text-white rounded-lg shadow-sm backdrop-blur-sm">
                                {mediaType === 'tv' ? '📺' : '🎬'} {mediaTypeLabel}
                            </span>
                        </div>

                        {/* Action Buttons (Moved to Top) */}
                        <div className="flex flex-wrap gap-4 mt-2">
                            <button
                                ref={searchButtonRef}
                                onClick={handleSearch}
                                onFocus={() => {
                                    setFocusedButton('search')
                                    setActiveZone(ZONES.HEADER)
                                }}
                                className={`px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl 
                                         transition-all duration-200 flex items-center gap-2
                                         ${focusedButton === 'search' ? 'ring-4 ring-blue-400 scale-105 shadow-xl' : 'shadow-lg'}
                                `}
                            >
                                <span className="text-xl">🔍</span>
                                Найти торренты
                            </button>

                            <button
                                ref={backButtonRef}
                                onClick={onBack}
                                onFocus={() => {
                                    setFocusedButton('back')
                                    setActiveZone(ZONES.HEADER)
                                }}
                                className={`px-6 py-3 bg-gray-700/80 hover:bg-gray-600 text-white font-semibold rounded-xl 
                                         transition-all duration-200 flex items-center gap-2 backdrop-blur-sm
                                         ${focusedButton === 'back' ? 'ring-4 ring-gray-400 scale-105 shadow-xl' : 'shadow-lg'}
                                `}
                            >
                                <span className="text-xl">⬅️</span>
                                Назад
                            </button>
                        </div>

                        {/* Trailer button */}
                        {trailer && (
                            <div className="mt-2">
                                <button
                                    ref={trailerButtonRef}
                                    onClick={() => Browser.open({ url: `https://www.youtube.com/watch?v=${trailer.key}` })}
                                    onFocus={() => {
                                        setFocusedButton('trailer')
                                        setActiveZone(ZONES.HEADER)
                                    }}
                                    className={`inline-flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-500 
                                             text-white rounded-lg transition-all text-sm backdrop-blur-sm
                                             ${focusedButton === 'trailer' ? 'ring-4 ring-offset-2 ring-red-500 scale-105' : 'shadow-md'}
                                    `}
                                >
                                    ▶️ Смотреть трейлер
                                </button>
                            </div>
                        )}

                        {/* Genres */}
                        {itemGenres.length > 0 && (
                            <div
                                ref={genreListRef}
                                className="flex flex-wrap gap-2 transition-all duration-300"
                            >
                                {itemGenres.map((genre, i) => {
                                    const isFocused = activeZone === ZONES.GENRES && focusedGenreIndex === i
                                    return (
                                        <button
                                            key={genre.id || i}
                                            onClick={() => onSelectGenre?.(genre)}
                                            className={`
                                                px-3 py-1 rounded-full text-sm transition-all duration-200 cursor-pointer shadow-sm
                                                ${isFocused
                                                    ? 'bg-blue-600 text-white ring-2 ring-white scale-105 shadow-lg relative z-20'
                                                    : 'bg-gray-800/60 text-gray-200 hover:bg-gray-700 backdrop-blur-sm'}
                                            `}
                                        >
                                            {genre.name}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Tagline */}
                        {item.tagline && (
                            <p className="text-gray-300 italic text-lg drop-shadow-sm">
                                «{item.tagline}»
                            </p>
                        )}

                        {/* Description */}
                        <div className="mt-2">
                            <h3 className="text-lg font-semibold text-white mb-2 drop-shadow-md">Описание</h3>
                            <p className="text-gray-100 leading-relaxed text-base max-w-2xl drop-shadow-md bg-black/30 p-4 rounded-xl backdrop-blur-sm">
                                {overview}
                            </p>
                        </div>

                        {/* Seasons List (Focus Graph Enabled) */}
                        {seasons.length > 0 && (
                            <div className="mt-8 transition-all duration-300">
                                <h3 className={`text-xl font-bold mb-4 transition-colors drop-shadow-md ${activeZone === ZONES.SEASONS ? 'text-white' : 'text-gray-300'}`}>
                                    📺 Сезоны ({seasons.length})
                                </h3>
                                <div
                                    ref={seasonsRef}
                                    className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide px-2"
                                >
                                    {seasons.filter(s => s.season_number > 0).map((season, idx) => {
                                        const isFocused = activeZone === ZONES.SEASONS && focusedSeasonIndex === idx
                                        const isSelected = selectedSeason?.id === season.id

                                        return (
                                            <div
                                                key={season.id}
                                                // TV-02: .season-card is managed in CSS
                                                className={`season-card flex-shrink-0 group relative bg-gray-800 transition-all duration-200 rounded-lg overflow-hidden
                                                          ${isFocused ? 'ring-4 ring-blue-500 scale-105 z-20 shadow-xl' : 'opacity-90 scale-95 hover:opacity-100'}
                                                          ${isSelected ? 'ring-2 ring-green-500' : ''}
                                                `}
                                                style={{ width: '140px', aspectRatio: '2/3' }}
                                                onClick={() => handleSeasonSelect(season, idx)}
                                            >
                                                <div className="absolute inset-0 bg-gray-900" />
                                                {/* Poster with cascading fallback: season → series poster */}
                                                {season.poster_path ? (
                                                    <img
                                                        src={getStablePosterUrl(season)}
                                                        alt={season.name}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            // Fallback to series poster if season poster fails
                                                            e.target.onerror = null;
                                                            reportBrokenImage(e.target.src)
                                                            setImageErrors(prev => new Set([...prev, e.target.src]))
                                                            if (posterUrl) e.target.src = posterUrl;
                                                            else e.target.style.display = 'none';
                                                        }}
                                                    />
                                                ) : posterUrl ? (
                                                    <img
                                                        src={posterUrl}
                                                        alt={season.name}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                                                        <span className="text-3xl">📺</span>
                                                    </div>
                                                )}

                                                {/* Season Badge */}
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 text-center backdrop-blur-sm">
                                                    <div className="text-white font-bold text-sm">Сезон {season.season_number}</div>
                                                    <div className="text-gray-400 text-xs">{season.episode_count} эп.</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Episodes List (New Zone) */}
                        {episodes.length > 0 && (
                            <div
                                ref={episodesSectionRef}
                                className={`mt-6 animate-fade-in ${activeZone === ZONES.EPISODES ? 'opacity-100' : 'opacity-60'}`}
                            >
                                <h3 className="text-xl font-bold text-white mb-4 pl-2">
                                    Список эпизодов (Сезон {selectedSeason?.season_number})
                                </h3>
                                <div ref={episodesListRef} className="flex flex-col gap-3 pr-2">
                                    {episodes.map((ep, idx) => {
                                        const isFocused = activeZone === ZONES.EPISODES && focusedEpisodeIndex === idx
                                        return (
                                            <div
                                                key={ep.id}
                                                onClick={() => handleEpisodeClick(ep)}
                                                className={`
                                                    flex items-start gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer
                                                    ${isFocused ? 'bg-blue-600 scale-[1.01] shadow-xl z-10' : 'bg-gray-800/50 hover:bg-gray-700'}
                                                `}
                                            >
                                                {/* Still thumbnail */}
                                                <div className="w-40 md:w-48 aspect-video bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                    {ep.still_path && getStableImageUrl(ep.still_path, 'w300') ? (
                                                        <img
                                                            src={getStableImageUrl(ep.still_path, 'w300')}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                reportBrokenImage(e.target.src)
                                                                setImageErrors(prev => new Set([...prev, e.target.src]))
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>
                                                    )}
                                                    {isFocused && (
                                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                            <span className="text-3xl">▶️</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 py-1">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`font-mono text-sm ${isFocused ? 'text-blue-200' : 'text-gray-400'}`}>
                                                            Эпизод {ep.episode_number}
                                                        </span>
                                                        <h4 className="font-bold text-xl text-white break-words leading-tight">
                                                            {ep.name}
                                                        </h4>
                                                    </div>
                                                    <p className={`text-sm mt-3 leading-relaxed ${isFocused ? 'text-blue-50' : 'text-gray-400'} whitespace-normal`}>
                                                        {ep.overview || "Описание отсутствует"}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Directors (LAMPA-style) */}
                        {directors.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                                    🎬 Режиссёр{directors.length > 1 ? 'ы' : ''}
                                </h3>
                                <p className="text-white">
                                    {directors.map(d => d.name).join(', ')}
                                </p>
                            </div>
                        )}

                        {/* CAST List (TMDB-02) */}
                        {cast.length > 0 && (
                            <div ref={castSectionRef} className="mt-8 transition-all duration-300">
                                <h3 className={`text-xl font-bold mb-4 transition-colors ${activeZone === ZONES.CAST ? 'text-white' : 'text-gray-400'}`}>
                                    👥 В ролях
                                </h3>
                                <div
                                    ref={castListRef}
                                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2"
                                >
                                    {cast.map((actor, idx) => {
                                        const isFocused = activeZone === ZONES.CAST && focusedCastIndex === idx
                                        const actorImg = actor.profile_path ? getStableImageUrl(actor.profile_path, 'w185') : null
                                        return (
                                            <div
                                                key={actor.id || idx}
                                                className={`season-card flex-shrink-0 relative bg-gray-800 rounded-lg overflow-hidden transition-all duration-200
                                                          ${isFocused ? 'ring-4 ring-blue-500 scale-105 z-20 shadow-xl' : 'opacity-80 scale-95'}
                                                `}
                                                style={{ width: '100px', height: '140px' }}
                                                onClick={() => onSelectPerson?.(actor)}
                                            >
                                                {actorImg ? (
                                                    <img
                                                        src={actorImg}
                                                        alt={actor.name}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            reportBrokenImage(e.target.src)
                                                            setImageErrors(prev => new Set([...prev, e.target.src]))
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-700">👤</div>
                                                )}
                                                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-center">
                                                    <p className="text-[10px] text-white font-bold truncate">{actor.name}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SIMILAR / RECOMMENDATIONS (TMDB-01) */}
                        {recommendations.length > 0 && (
                            <div ref={similarSectionRef} className="mt-8 mb-20 transition-all duration-300">
                                <h3 className={`text-xl font-bold mb-4 transition-colors ${activeZone === ZONES.SIMILAR ? 'text-white' : 'text-gray-400'}`}>
                                    🔗 Похожие
                                </h3>
                                <div ref={similarListRef} className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide px-2">
                                    {recommendations.map((rec, idx) => {
                                        const isFocused = activeZone === ZONES.SIMILAR && focusedSimilarIndex === idx
                                        return (
                                            <div
                                                key={rec.id}
                                                className={`season-card flex-shrink-0 relative bg-gray-800 rounded-lg overflow-hidden transition-all duration-200
                                                          ${isFocused ? 'ring-4 ring-blue-500 scale-105 z-20 shadow-xl' : 'opacity-80 scale-95'}
                                                `}
                                                style={{ width: '150px', aspectRatio: '2/3' }}
                                                onClick={() => {
                                                    if (onSelect) {
                                                        onSelect(rec)
                                                        containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
                                                    }
                                                }}
                                            >
                                                {rec.poster_path ? (
                                                    <img
                                                        src={getStablePosterUrl(rec)}
                                                        alt={rec.title || rec.name}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            reportBrokenImage(e.target.src)
                                                            setImageErrors(prev => new Set([...prev, e.target.src]))
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-700" />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

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
