import { useRef, useEffect, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { getBackdropUrl, getPosterUrl, getTitle, getYear, getSearchQuery, getImageUrl } from '../utils/discover'
import { getGenreObjectsForItem } from '../utils/genres'
import { reportBrokenImage, getCredits, getVideos, getDetails, getSeasonDetails, getRecommendations, getCollection, getKeywords, getDiscoverByKeywords } from '../utils/tmdbClient'
import { getFavorites, addFavorite, removeFavorite, recordHistory } from '../utils/serverApi'
import { Capacitor } from '@capacitor/core'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

// ─── Sub-Components ─────────────────────────────────────────

const GenreButton = ({ genre, onClick }) => {
    const spatialRef = useSpatialItem('detail')
    return (
        <button
            ref={spatialRef}
            onClick={() => onClick?.(genre)}
            className="focusable px-3 py-1 bg-gray-800/60 focus:bg-blue-600 focus:text-white rounded-full text-sm text-gray-300"
        >{genre.name}</button>
    )
}

const CastButton = ({ actor, onClick, subtitle }) => {
    const spatialRef = useSpatialItem('detail')
    return (
        <button
            ref={spatialRef}
            onClick={() => onClick?.(actor)}
            className="focusable relative flex-shrink-0 w-24 h-36 bg-gray-800 rounded-lg overflow-hidden focus:ring-4 focus:ring-blue-500 shadow-xl"
        >
            <img src={getImageUrl(actor.profile_path, 'w185')} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1">
                <p className="text-[10px] text-white font-bold truncate">{actor.name}</p>
                {subtitle && <p className="text-[9px] text-gray-400 truncate">{subtitle}</p>}
            </div>
        </button>
    )
}

const SeasonButton = ({ season, active, onClick, posterUrl }) => {
    const spatialRef = useSpatialItem('detail')
    return (
        <button
            ref={spatialRef}
            onClick={() => onClick?.(season)}
            className={`focusable relative flex-shrink-0 w-32 aspect-[2/3] rounded-xl overflow-hidden focus:ring-4 focus:ring-blue-500 transition-all ${active ? 'ring-2 ring-green-500' : ''}`}
        >
            <img src={getPosterUrl(season, 'w342') || posterUrl} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-black/80 p-2 text-xs text-white font-bold">
                Сезон {season.season_number}
            </div>
        </button>
    )
}

const EpisodeRow = ({ ep, onClick }) => {
    const spatialRef = useSpatialItem('detail')
    return (
        <button
            ref={spatialRef}
            onClick={() => onClick?.(ep)}
            className="focusable w-full flex items-center gap-4 p-3 bg-gray-800/40 focus:bg-blue-600 text-left rounded-xl transition-all"
        >
            <div className="w-24 aspect-video bg-black rounded overflow-hidden flex-shrink-0">
                <img src={getImageUrl(ep.still_path, 'w300')} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
                <div className="text-sm font-bold text-white">E{ep.episode_number}. {ep.name}</div>
                <div className="text-xs text-gray-400 line-clamp-1">{ep.overview}</div>
            </div>
        </button>
    )
}

const RecButton = ({ rec, onClick }) => {
    const spatialRef = useSpatialItem('detail')
    return (
        <button
            ref={spatialRef}
            onClick={() => onClick?.(rec)}
            className="focusable relative flex-shrink-0 w-32 aspect-[2/3] rounded-xl shadow-lg focus:ring-4 focus:ring-blue-500 transition-all overflow-hidden"
        >
            <img src={getPosterUrl(rec, 'w342')} className="w-full h-full object-cover" />
        </button>
    )
}

// ─── Main Component ───────────────────────────────────────────

const MovieDetail = ({
    item,
    onSearch,
    onBack,
    onSelect,
    onSelectPerson,
    onSelectGenre,
}) => {
    const [directors, setDirectors] = useState([])
    const [crew, setCrew] = useState([])
    const [cast, setCast] = useState([])
    const [seasons, setSeasons] = useState([])
    const [selectedSeason, setSelectedSeason] = useState(null)
    const [episodes, setEpisodes] = useState([])
    const [recommendations, setRecommendations] = useState([])
    const [trailer, setTrailer] = useState(null)
    const [collection, setCollection] = useState(null)
    const [keywords, setKeywords] = useState([])
    const [keywordRecs, setKeywordRecs] = useState([])
    const [showTrailerInline, setShowTrailerInline] = useState(false)
    const [loadingExtra, setLoadingExtra] = useState(true)
    const [allowInteraction, setAllowInteraction] = useState(false)
    // FAV-01: Favorite state
    const [isFavorite, setIsFavorite] = useState(false)
    const [favLoading, setFavLoading] = useState(false)

    // Spatial Refs
    const searchBtnRef = useSpatialItem('detail')
    const backBtnRef = useSpatialItem('detail')
    const trailerBtnRef = useSpatialItem('detail')
    const favBtnRef = useSpatialItem('detail')

    useEffect(() => {
        // Prevent phantom clicks from previous screen (common on TV)
        const timer = setTimeout(() => setAllowInteraction(true), 500)
        return () => clearTimeout(timer)
    }, [])

    // FAV-01: Check if item is in favorites
    useEffect(() => {
        if (!item?.id) return
        getFavorites().then(favs => {
            setIsFavorite(favs.some(f => f.tmdbId === item.id))
        }).catch(() => {})
    }, [item?.id])

    // HIST-01: Auto-record view in history
    useEffect(() => {
        if (!item?.id) return
        recordHistory(item).catch(() => {})
    }, [item?.id])

    // FAV-01: Toggle favorite
    const handleToggleFavorite = async () => {
        if (favLoading) return
        setFavLoading(true)
        try {
            if (isFavorite) {
                await removeFavorite(item.id)
                setIsFavorite(false)
            } else {
                await addFavorite(item)
                setIsFavorite(true)
            }
        } catch (err) {
            console.warn('[Favorites] Toggle failed:', err)
        } finally {
            setFavLoading(false)
        }
    }

    if (!item) return null

    const backdropUrl = getBackdropUrl(item, 'w1280')
    const posterUrl = getPosterUrl(item, 'w500')
    const title = getTitle(item)
    const year = getYear(item)
    const rating = item.vote_average?.toFixed(1)
    const overview = item.overview || 'Описание отсутствует'
    const mediaType = item.media_type === 'tv' || item.name ? 'tv' : 'movie'
    const mediaTypeLabel = mediaType === 'tv' ? 'Сериал' : 'Фильм'
    const itemGenres = getGenreObjectsForItem(item)

    const fetchEpisodes = async (seasonNumber) => {
        try {
            const data = await getSeasonDetails(item.id, seasonNumber)
            setEpisodes(data.episodes || [])
        } catch (err) {
            console.error(err)
        }
    }

    const handleSeasonSelect = (season) => {
        setSelectedSeason(season)
        fetchEpisodes(season.season_number)
    }

    const handleEpisodeClick = (episode) => {
        const s = episode.season_number.toString().padStart(2, '0')
        const e = episode.episode_number.toString().padStart(2, '0')
        onSearch?.(`${title} S${s}E${e}`)
    }

    useEffect(() => {
        if (!item?.id) return
        const controller = new AbortController()
        const load = async () => {
            setLoadingExtra(true)
            setCollection(null)
            setKeywords([])
            setKeywordRecs([])
            setShowTrailerInline(false)
            try {
                const details = await getDetails(item.id, mediaType)
                if (details && mediaType === 'tv') setSeasons(details.seasons || [])

                // Коллекция / Франшиза (COLL-01)
                if (details?.belongs_to_collection) {
                    getCollection(details.belongs_to_collection.id).then(c => {
                        if (!controller.signal.aborted && c?.parts) setCollection(c)
                    }).catch(() => {})
                }

                const creditsData = await getCredits(item.id, mediaType)
                setDirectors(creditsData.crew?.filter(p => p.job === 'Director') || [])
                setCast(creditsData.cast?.slice(0, 8) || [])

                // Расширенный Crew (CREW-01)
                const CREW_JOBS = ['Screenplay', 'Writer', 'Original Music Composer', 'Director of Photography', 'Producer']
                const keyCrew = creditsData.crew
                    ?.filter(p => CREW_JOBS.includes(p.job) && p.profile_path)
                    ?.reduce((acc, p) => {
                        if (!acc.find(x => x.id === p.id)) acc.push(p)
                        return acc
                    }, [])
                    ?.slice(0, 6) || []
                setCrew(keyCrew)

                const videosData = await getVideos(item.id, mediaType)
                setTrailer(videosData.results?.find(v => v.type === 'Trailer') || videosData.results?.[0])
                const recData = await getRecommendations(item.id, mediaType)
                setRecommendations(recData.results || [])

                // Ключевые слова (KW-01)
                getKeywords(item.id, mediaType).then(kwData => {
                    if (controller.signal.aborted) return
                    const kws = kwData.keywords || kwData.results || []
                    setKeywords(kws.slice(0, 8))
                    // Discover по топ-3 ключевым словам
                    if (kws.length > 0) {
                        const kwIds = kws.slice(0, 3).map(k => k.id).join(',')
                        getDiscoverByKeywords(kwIds, mediaType).then(dr => {
                            if (!controller.signal.aborted) {
                                const filtered = (dr.results || []).filter(r => r.id !== item.id && r.poster_path)
                                setKeywordRecs(filtered.slice(0, 10))
                            }
                        }).catch(() => {})
                    }
                }).catch(() => {})

            } catch (err) { console.warn(err) }
            finally { if (!controller.signal.aborted) setLoadingExtra(false) }
        }
        load()
        return () => controller.abort()
    }, [item?.id])

    return (
        <div className="movie-detail fixed inset-0 z-50 bg-gray-900 overflow-hidden">
            <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{
                    background: backdropUrl
                        ? `linear-gradient(to right, rgba(17,24,39,1) 0%, rgba(17,24,39,0.8) 50%, rgba(17,24,39,0.4) 100%), url(${backdropUrl}) center/cover no-repeat`
                        : 'linear-gradient(to bottom, #1f2937, #111827)'
                }}
            />

            <div className="relative z-10 h-full overflow-y-auto custom-scrollbar p-6 md:p-10">
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10 max-w-7xl mx-auto">
                    {/* Poster */}
                    <div className="hidden md:block">
                        <img src={posterUrl} className="w-[220px] aspect-[2/3] rounded-xl shadow-2xl object-cover border border-gray-700" />
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-6 min-w-0">
                        <h1 className="text-4xl font-bold text-white drop-shadow-lg">{title}</h1>

                        <div className="flex flex-wrap gap-4 items-center">
                            {rating > 0 && <span className="px-3 py-1 bg-green-600 rounded-lg font-bold text-white">★ {rating}</span>}
                            {year && <span className="px-3 py-1 bg-gray-800 rounded-lg text-gray-200">{year}</span>}
                            <span className="px-3 py-1 bg-blue-600 rounded-lg text-white font-medium">{mediaTypeLabel}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-4">
                            <button
                                ref={searchBtnRef}
                                onClick={() => allowInteraction && onSearch?.(getSearchQuery(item))}
                                className={`focusable px-8 py-3 bg-blue-600 focus:bg-yellow-400 focus:text-black focus:ring-4 focus:ring-yellow-400 text-white font-bold rounded-xl transition-all ${!allowInteraction ? 'opacity-50' : ''}`}
                            >🔍 Найти торренты</button>
                            <button
                                ref={backBtnRef}
                                onClick={onBack}
                                className="focusable px-8 py-3 bg-gray-800 focus:bg-white focus:text-black focus:ring-4 focus:ring-white text-white font-bold rounded-xl transition-all"
                            >⬅️ Назад</button>
                            {trailer && (
                                <button
                                    ref={trailerBtnRef}
                                    onClick={() => {
                                        if (!allowInteraction) return
                                        if (Capacitor.isNativePlatform()) {
                                            Browser.open({ url: `https://www.youtube.com/watch?v=${trailer.key}` })
                                        } else {
                                            setShowTrailerInline(prev => !prev)
                                        }
                                    }}
                                    className="focusable px-6 py-3 bg-red-600 focus:bg-red-400 focus:ring-4 focus:ring-red-300 text-white font-bold rounded-xl transition-all"
                                >{showTrailerInline ? '✕ Закрыть' : '▶️ Трейлер'}</button>
                            )}
                            {/* FAV-01: Favorite button */}
                            <button
                                ref={favBtnRef}
                                onClick={() => allowInteraction && handleToggleFavorite()}
                                className={`focusable px-6 py-3 font-bold rounded-xl transition-all focus:ring-4 ${
                                    isFavorite
                                        ? 'bg-pink-600 focus:bg-pink-400 focus:ring-pink-300 text-white'
                                        : 'bg-gray-800 focus:bg-pink-600 focus:ring-pink-300 text-white'
                                } ${favLoading ? 'opacity-50' : ''}`}
                            >{isFavorite ? '❤️ В избранном' : '🤍 Избранное'}</button>
                        </div>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-2">
                            {itemGenres.map((genre) => (
                                <GenreButton key={genre.id} genre={genre} onClick={onSelectGenre} />
                            ))}
                        </div>

                        {/* Inline Trailer (TRAIL-01) */}
                        {showTrailerInline && trailer && (
                            <div className="mt-2 rounded-2xl overflow-hidden shadow-2xl max-w-3xl aspect-video">
                                <iframe
                                    src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                                    className="w-full h-full"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                    title="Trailer"
                                />
                            </div>
                        )}

                        {/* Description */}
                        <div className="bg-black/40 p-5 rounded-2xl backdrop-blur-sm max-w-3xl">
                            <p className="text-gray-200 leading-relaxed">{overview}</p>
                        </div>

                        {/* Directors + Crew (CREW-01) */}
                        {(directors.length > 0 || crew.length > 0) && (
                            <div className="mt-4">
                                <h3 className="text-xl font-bold text-white mb-4">🎬 Создатели</h3>
                                <div className="flex gap-4 overflow-x-auto py-4 custom-scrollbar px-2 -my-2">
                                    {directors.map((d) => (
                                        <CastButton key={`dir-${d.id}`} actor={d} subtitle="Режиссёр" onClick={onSelectPerson} />
                                    ))}
                                    {crew.map((c) => (
                                        <CastButton key={`crew-${c.id}-${c.job}`} actor={c} subtitle={c.job === 'Screenplay' ? 'Сценарий' : c.job === 'Writer' ? 'Автор' : c.job === 'Original Music Composer' ? 'Композитор' : c.job === 'Director of Photography' ? 'Оператор' : c.job === 'Producer' ? 'Продюсер' : c.job} onClick={onSelectPerson} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cast */}
                        {cast.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-xl font-bold text-white mb-4">🎭 В ролях</h3>
                                <div className="flex gap-4 overflow-x-auto py-4 custom-scrollbar px-2 -my-2">
                                    {cast.map((actor) => (
                                        <CastButton key={actor.id} actor={actor} onClick={onSelectPerson} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Seasons */}
                        {seasons.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-xl font-bold text-white mb-4">📺 Сезоны</h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar px-2">
                                    {seasons.filter(s => s.season_number > 0).map((season) => (
                                        <SeasonButton
                                            key={season.id}
                                            season={season}
                                            active={selectedSeason?.id === season.id}
                                            onClick={handleSeasonSelect}
                                            posterUrl={posterUrl}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Episodes */}
                        {episodes.length > 0 && (
                            <div className="mt-6 bg-black/20 p-4 rounded-2xl">
                                <h3 className="text-xl font-bold text-white mb-4">🎬 Эпизоды ({selectedSeason?.name})</h3>
                                <div className="space-y-2">
                                    {episodes.map((ep) => (
                                        <EpisodeRow key={ep.id} ep={ep} onClick={handleEpisodeClick} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Collection / Franchise (COLL-01) */}
                        {collection && collection.parts?.length > 1 && (
                            <div className="mt-8">
                                <h3 className="text-xl font-bold text-white mb-4">🎞️ {collection.name}</h3>
                                <div className="flex gap-4 overflow-x-auto py-4 custom-scrollbar px-2 -my-2">
                                    {collection.parts
                                        .sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''))
                                        .map((part) => (
                                            <RecButton
                                                key={part.id}
                                                rec={part}
                                                onClick={() => onSelect?.({ ...part, media_type: 'movie' })}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {recommendations.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-xl font-bold text-white mb-4">✨ Похожее</h3>
                                <div className="flex gap-4 overflow-x-auto py-4 custom-scrollbar px-2 -my-2">
                                    {recommendations.slice(0, 10).map((rec) => (
                                        <RecButton key={rec.id} rec={rec} onClick={onSelect} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Keywords + Discover (KW-01) */}
                        {keywordRecs.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-xl font-bold text-white mb-2">🏷️ По теме</h3>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {keywords.map(kw => (
                                        <span key={kw.id} className="px-2 py-1 bg-gray-800/60 rounded-full text-xs text-gray-400">{kw.name}</span>
                                    ))}
                                </div>
                                <div className="flex gap-4 overflow-x-auto pt-4 pb-12 custom-scrollbar px-2 -my-4">
                                    {keywordRecs.map((rec) => (
                                        <RecButton key={rec.id} rec={rec} onClick={onSelect} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottom padding for last scrollable row */}
                        {recommendations.length === 0 && keywordRecs.length === 0 && (
                            <div className="pb-12" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MovieDetail
