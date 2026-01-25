import { useEffect, useState } from 'react'
import { getImageUrl, getPersonDetails, getPersonCredits } from '../utils/tmdbClient'
import { getPosterUrl } from '../utils/discover'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

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
    const [credits, setCredits] = useState([])
    const [loading, setLoading] = useState(true)

    // Spatial Refs
    const backBtnRef = useSpatialItem('person')

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
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        if (personId) loadData()
    }, [personId])

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-[#141414] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        )
    }

    if (!person) return null

    return (
        <div className="fixed inset-0 z-50 bg-[#141414] overflow-y-auto animate-fade-in custom-scrollbar">
            {/* Header */}
            <div className="relative w-full">
                <div className="absolute top-6 left-6 z-20">
                    <button
                        ref={backBtnRef}
                        onClick={onBack}
                        className="focusable px-6 py-3 bg-gray-800/80 hover:bg-gray-700 text-white font-bold rounded-xl flex items-center gap-2 backdrop-blur-md transition-all focus:ring-4 focus:ring-blue-500 scale-100 focus:scale-105"
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

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {credits.map((item, idx) => (
                        <FilmItem
                            key={`${item.id}-${idx}`}
                            item={item}
                            onClick={() => onSelectMovie(item)}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default PersonDetail
