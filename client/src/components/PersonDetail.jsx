import { useEffect, useState, useRef, useCallback } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { getImageUrl, getPersonDetails, getPersonCredits, getPersonImages } from '../utils/tmdbClient'
import { getPosterUrl } from '../utils/discover'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const FilterTab = ({ label, active, onClick }) => {
    const spatialRef = useSpatialItem('person')
    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            className={`focusable px-4 py-2 rounded-lg font-bold text-sm transition-all focus:ring-4 focus:ring-blue-500 ${active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >{label}</button>
    )
}

const FilmItem = ({ item, onClick }) => {
    const spatialRef = useSpatialItem('person')
    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            className="focusable relative aspect-[2/3] bg-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-blue-500 scale-100 focus:scale-105 z-10 shadow-xl"
        >
            {item.poster_path ? (
                <img
                    src={getPosterUrl(item)}
                    loading="lazy"
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">?</div>
            )}

            {item.vote_average > 0 && (
                <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-bold text-white">
                    ★ {item.vote_average.toFixed(1)}
                </div>
            )}

            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8 text-left">
                <div className="text-white font-bold text-sm truncate">{item.title || item.name}</div>
                <div className="text-gray-400 text-xs truncate">
                    {item.character ? `как ${item.character}` : (item.job || 'Актёр')}
                </div>
            </div>
        </button>
    )
}

const PersonDetail = ({
    personId,
    onBack,
    onSelectMovie
}) => {
    const [person, setPerson] = useState(null)
    const [castCredits, setCastCredits] = useState([])
    const [crewCredits, setCrewCredits] = useState([])
    const [photos, setPhotos] = useState([])
    const [filter, setFilter] = useState('all') // 'all' | 'cast' | 'crew'
    const [loading, setLoading] = useState(true)

    // Spatial Refs — dual ref pattern: callback ref for spatial + useRef for programmatic focus
    const backBtnDomRef = useRef(null)
    const backBtnSpatialRef = useSpatialItem('person')
    const backBtnRef = useCallback((node) => {
        backBtnDomRef.current = node
        backBtnSpatialRef(node)
    }, [backBtnSpatialRef])

    // Handle Hardware Back Button
    useEffect(() => {
        const handleHardwareBack = async () => {
            onBack()
        }

        const listener = CapacitorApp.addListener('backButton', handleHardwareBack)
        return () => { listener.then(h => h.remove()) }
    }, [onBack])

    // Load Data
    useEffect(() => {
        if (!personId) return

        const loadData = async () => {
            setLoading(true)
            setFilter('all')
            try {
                const id = typeof personId === 'object' ? personId.id : personId

                const [details, creditsData] = await Promise.all([
                    getPersonDetails(id),
                    getPersonCredits(id)
                ])

                setPerson(details)
                setCastCredits(creditsData.cast || [])

                // Crew: дедупликация по id, фильтрация без постеров, сортировка по популярности
                const crewRaw = creditsData.crew || []
                const crewDeduped = crewRaw
                    .filter(c => c.poster_path)
                    .reduce((acc, c) => {
                        if (!acc.find(x => x.id === c.id)) acc.push(c)
                        return acc
                    }, [])
                    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                setCrewCredits(crewDeduped)

                // Фото (декоративные)
                getPersonImages(id).then(imgData => {
                    setPhotos((imgData.profiles || []).slice(0, 8))
                }).catch(() => {})

            } catch (err) {
                console.error('Failed to load person details:', err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [personId])

    // Global ArrowUp handler: if spatial nav can't find anything above, jump to Back button
    useEffect(() => {
        const handleArrowUp = (e) => {
            if (e.key !== 'ArrowUp') return
            const current = document.activeElement
            if (!current || current === backBtnDomRef.current) return

            // After spatial nav processes, check if focus stayed on the same element
            requestAnimationFrame(() => {
                if (document.activeElement === current && current !== backBtnDomRef.current) {
                    // Focus didn't move — edge reached, jump to Back button
                    backBtnDomRef.current?.focus()
                    backBtnDomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            })
        }

        window.addEventListener('keydown', handleArrowUp)
        return () => window.removeEventListener('keydown', handleArrowUp)
    }, [])

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-[#141414] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        )
    }

    if (!person) return null

    return (
        <div
            className="fixed inset-0 z-50 bg-[#141414] animate-fade-in overflow-y-auto custom-scrollbar"
        >
            <div className="min-h-full relative p-8">
                {/* Back Button - Standard Flow */}
                <div className="pb-8 z-[60] relative">
                    <button
                        ref={backBtnRef}
                        onClick={onBack}
                        className="focusable px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all focus:ring-4 focus:ring-blue-500 scale-100 focus:scale-105 shadow-xl"
                        autoFocus
                    >
                        <span className="text-xl">←</span>
                        Назад
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-8 pt-4">
                    {/* Photo */}
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                        <div className="w-64 h-96 rounded-xl overflow-hidden shadow-2xl bg-gray-800">
                            {person.profile_path ? (
                                <img
                                    src={getImageUrl(person.profile_path, 'h632')}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-6xl">👤</div>
                            )}
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="flex-1 text-white">
                        <h1 className="text-4xl font-bold mb-2">{person.name}</h1>
                        <div className="text-gray-400 mb-6 flex gap-4">
                            {person.birthday && <span>🎂 {person.birthday}</span>}
                            {person.place_of_birth && <span>📍 {person.place_of_birth}</span>}
                        </div>

                        <h3 className="text-xl font-bold mb-2">Биография</h3>
                        <p className="text-gray-300 leading-relaxed max-w-3xl text-sm md:text-base">
                            {person.biography || "Биография отсутствует."}
                        </p>
                    </div>
                </div>

                {/* Photo Gallery (decorative) */}
                {photos.length > 1 && (
                    <div className="mt-10">
                        <h2 className="text-xl font-bold text-white mb-4">Фото</h2>
                        <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                            {photos.map((photo, idx) => (
                                <div key={idx} className="flex-shrink-0 w-28 h-40 rounded-lg overflow-hidden bg-gray-800">
                                    <img src={getImageUrl(photo.file_path, 'w185')} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Best Works */}
                {castCredits.length > 0 && (() => {
                    const topRated = [...castCredits]
                        .filter(c => c.vote_average > 0 && c.vote_count > 50)
                        .sort((a, b) => b.vote_average - a.vote_average)
                        .slice(0, 5)
                    if (topRated.length === 0) return null
                    return (
                        <div className="mt-10">
                            <h2 className="text-xl font-bold text-white mb-4">Лучшие работы</h2>
                            <div className="flex gap-4 overflow-x-auto py-4 custom-scrollbar px-2 -my-2">
                                {topRated.map((item, idx) => (
                                    <FilmItem
                                        key={`top-${item.id}-${idx}`}
                                        item={item}
                                        onClick={() => onSelectMovie(item)}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                })()}

                {/* Filmography Grid */}
                <div className="mt-12 pb-20">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-white">Фильмография</h2>
                        {crewCredits.length > 0 && (
                            <div className="flex gap-2">
                                <FilterTab label="Все" active={filter === 'all'} onClick={() => setFilter('all')} />
                                <FilterTab label={`Актёр (${castCredits.length})`} active={filter === 'cast'} onClick={() => setFilter('cast')} />
                                <FilterTab label={`За кадром (${crewCredits.length})`} active={filter === 'crew'} onClick={() => setFilter('crew')} />
                            </div>
                        )}
                    </div>

                    <div
                        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6"
                    >
                        {(filter === 'all' ? [...castCredits, ...crewCredits].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)) :
                          filter === 'cast' ? castCredits :
                          crewCredits
                        ).map((item, idx) => (
                            <FilmItem
                                key={`${item.id}-${idx}`}
                                item={item}
                                onClick={() => onSelectMovie(item)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PersonDetail
