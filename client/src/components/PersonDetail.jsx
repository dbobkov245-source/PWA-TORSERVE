import { useRef, useEffect, useCallback, useState } from 'react'
import { getImageUrl, getPersonDetails, getPersonCredits } from '../utils/tmdbClient'
import { getPosterUrl } from '../utils/discover'

const PersonDetail = ({
    personId,
    onBack,
    onSelectMovie // Callback for recursion (open movie from actor)
}) => {
    const [person, setPerson] = useState(null)
    const [credits, setCredits] = useState([])
    const [loading, setLoading] = useState(true)
    const [focusedIndex, setFocusedIndex] = useState(-1) // -1 = Back Button, 0+ = Grid Items

    // Manual columns calculation for grid nav
    const GRID_COLUMNS = 5

    const containerRef = useRef(null)
    const backButtonRef = useRef(null)
    const gridRef = useRef(null)

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                const [details, creditsData] = await Promise.all([
                    getPersonDetails(personId),
                    getPersonCredits(personId)
                ])
                setPerson(details)
                setCredits(creditsData.cast || [])
            } catch (err) {
                console.error('[PersonDetail] Failed to load:', err)
            } finally {
                setLoading(false)
            }
        }
        if (personId) loadData()
    }, [personId])

    // Focus Management
    useEffect(() => {
        // Initial focus on back button
        if (!loading) {
            backButtonRef.current?.focus()
            setFocusedIndex(-1)
        }
    }, [loading])

    // Auto-scroll
    useEffect(() => {
        if (focusedIndex >= 0 && gridRef.current) {
            const el = gridRef.current.children[focusedIndex]
            el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
        }
    }, [focusedIndex])

    const handleKeyDown = useCallback((e) => {
        if (loading) return

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault()
                if (focusedIndex === -1) {
                    // Already at back button
                } else if (focusedIndex % GRID_COLUMNS === 0) {
                    // Leftmost column -> Go to Back Button
                    setFocusedIndex(-1)
                    backButtonRef.current?.focus()
                } else {
                    setFocusedIndex(prev => Math.max(0, prev - 1))
                }
                break

            case 'ArrowRight':
                e.preventDefault()
                if (focusedIndex === -1) {
                    // From back button -> First item
                    if (credits.length > 0) setFocusedIndex(0)
                } else {
                    setFocusedIndex(prev => Math.min(credits.length - 1, prev + 1))
                }
                break

            case 'ArrowUp':
                e.preventDefault()
                if (focusedIndex === -1) {
                    // Top of page
                } else if (focusedIndex < GRID_COLUMNS) {
                    // First row -> Back button
                    setFocusedIndex(-1)
                    backButtonRef.current?.focus()
                } else {
                    setFocusedIndex(prev => prev - GRID_COLUMNS)
                }
                break

            case 'ArrowDown':
                e.preventDefault()
                if (focusedIndex === -1) {
                    // From header -> First item
                    if (credits.length > 0) setFocusedIndex(0)
                } else {
                    if (focusedIndex + GRID_COLUMNS < credits.length) {
                        setFocusedIndex(prev => prev + GRID_COLUMNS)
                    }
                }
                break

            case 'Enter':
            case ' ':
                e.preventDefault()
                if (focusedIndex === -1) {
                    onBack()
                } else {
                    const item = credits[focusedIndex]
                    if (item) onSelectMovie(item)
                }
                break

            case 'Escape':
            case 'Backspace':
                e.preventDefault()
                onBack()
                break
        }
    }, [focusedIndex, credits, loading, onBack, onSelectMovie])

    // Add global key listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])


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
            ref={containerRef}
            className="fixed inset-0 z-50 bg-[#141414] overflow-y-auto animate-fade-in"
        >
            {/* Header */}
            <div className="relative w-full">
                <div className="absolute top-6 left-6 z-20">
                    <button
                        ref={backButtonRef}
                        onClick={onBack}
                        onFocus={() => setFocusedIndex(-1)}
                        className={`
                            px-6 py-3 bg-gray-800/80 hover:bg-gray-700 text-white font-bold rounded-xl flex items-center gap-2 backdrop-blur-md transition-all
                            ${focusedIndex === -1 ? 'ring-4 ring-blue-500 scale-105 shadow-xl' : ''}
                        `}
                    >
                        <span className="text-xl">←</span>
                        Назад
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-8 p-8 pt-24">
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
            </div>

            {/* Filmography Grid */}
            <div className="p-8 pb-20">
                <h2 className="text-2xl font-bold text-white mb-6">Фильмография ({credits.length})</h2>

                <div
                    ref={gridRef}
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6"
                >
                    {credits.map((item, idx) => {
                        const isFocused = focusedIndex === idx
                        return (
                            <div
                                key={`${item.id}-${item.media_type}`}
                                className={`
                                    relative aspect-[2/3] bg-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-200
                                    ${isFocused ? 'ring-4 ring-blue-500 scale-105 z-10 shadow-xl' : 'opacity-90 hover:opacity-100'}
                                `}
                                onClick={() => onSelectMovie(item)}
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

                                {/* Rating Badge */}
                                {item.vote_average > 0 && (
                                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-bold text-white">
                                        ★ {item.vote_average.toFixed(1)}
                                    </div>
                                )}

                                {/* Title Overlay */}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8">
                                    <div className="text-white font-bold text-sm truncate">{item.title || item.name}</div>
                                    <div className="text-gray-400 text-xs truncate">
                                        {item.character ? `как ${item.character}` : (item.job || 'Актёр')}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default PersonDetail
