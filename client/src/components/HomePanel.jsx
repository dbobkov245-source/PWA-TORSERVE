/**
 * HomePanel.jsx – FIXED TV Navigation
 * 
 * Key fixes:
 * - Proper ref passing to HomeRow
 * - Clean ArrowUp/Down handling
 * - No double event processing
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import HomeRow from './HomeRow'
import CategoryPage from './CategoryPage'
import MovieDetail from './MovieDetail'
import PersonDetail from './PersonDetail'
import Sidebar from './Sidebar'
import { fetchAllDiscovery, getBackdropUrl, getTitle } from '../utils/discover'
import tmdbClient, { getDiscoverByGenre } from '../utils/tmdbClient'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const HomePanel = ({
    activeMovie, setActiveMovie,
    activePerson, setActivePerson,
    activeCategory, setActiveCategory,
    showSidebar, setShowSidebar,
    onSearch, onClose
}) => {
    const [categories, setCategories] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [backdrop, setBackdrop] = useState(null)
    const [focusedItem, setFocusedItem] = useState(null)
    const [visibleRows, setVisibleRows] = useState([])

    const sidebarTriggerRef = useSpatialItem('main')

    // Data Loading
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)
                const results = await fetchAllDiscovery()
                setCategories(results)
                const nonEmptyRows = Object.values(results).filter(row => row.items?.length > 0)
                setVisibleRows(nonEmptyRows)
                if (nonEmptyRows[0]?.items?.[0]) setFocusedItem(nonEmptyRows[0].items[0])
            } catch (err) {
                console.error(err)
                setError(err.message || 'Failed to load content')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Update backdrop
    useEffect(() => {
        if (!activeMovie && !activePerson && !activeCategory && focusedItem) {
            setBackdrop(getBackdropUrl(focusedItem))
        }
    }, [focusedItem, activeMovie, activePerson, activeCategory])

    // NAV-01: Header Bridge (Removed as per User Request to restore natural navigation)
    // Effect removed.

    // Handlers
    const handleItemClick = (item) => setActiveMovie(item)
    const handlePersonClick = (person) => setActivePerson(person)
    const handleGenreClick = (genre, type = 'movie') => {
        setActiveCategory({
            id: `genre-${genre.id}`,
            name: genre.name,
            icon: '🏷️',
            fetcher: (page) => getDiscoverByGenre(genre.id, type, page)
        })
    }
    const handleMoreClick = (categoryId) => {
        const cat = categories[categoryId]
        if (cat) setActiveCategory(cat)
    }

    const handleSidebarSelect = (item) => {
        if (item.id === 'search') {
            onSearch?.('')
        } else if (item.type === 'year') {
            setActiveCategory({
                id: `year_${item.year}`,
                name: `${item.year} год`,
                icon: '📅',
                fetcher: (page) => tmdbClient(`/discover/movie?primary_release_year=${item.year}&sort_by=popularity.desc&include_adult=false&language=ru-RU&page=${page}`)
            })
        } else if (item.categoryId?.startsWith('genre_')) {
            const genreId = parseInt(item.categoryId.split('_')[1])
            setActiveCategory({ id: genreId, name: item.label, type: 'movie', fetcher: (page) => getDiscoverByGenre(genreId, 'movie', page) })
        } else if (item.categoryId) {
            handleMoreClick(item.categoryId)
        }
        setShowSidebar(false)
    }

    // Render Sub-Views
    if (activeMovie) return (
        <MovieDetail
            item={activeMovie}
            onBack={() => setActiveMovie(null)}
            onSearch={onSearch}
            onSelect={setActiveMovie}
            onSelectPerson={setActivePerson}
            onSelectGenre={handleGenreClick}
        />
    )

    if (activePerson) return (
        <PersonDetail
            personId={activePerson.id || activePerson}
            onBack={() => setActivePerson(null)}
            onSelectMovie={setActiveMovie}
        />
    )

    if (activeCategory) return (
        <CategoryPage
            customCategory={activeCategory}
            onBack={() => setActiveCategory(null)}
            onItemClick={setActiveMovie}
            onFocusChange={setFocusedItem}
        />
    )

    return (
        <div className="flex h-full w-full bg-[#141414] overflow-hidden">
            <Sidebar
                isOpen={showSidebar}
                onSelect={handleSidebarSelect}
                onClose={() => setShowSidebar(false)}
            />

            <div className={`flex-1 relative transition-all duration-300 ${showSidebar ? 'opacity-50 blur-sm' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#141414] to-[#141414]" />

                <div className="relative z-10 pt-4 pb-20 px-8 h-full overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    {focusedItem && !loading && (
                        <div className="px-4 mb-10 max-w-2xl">
                            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{getTitle(focusedItem)}</h1>
                            <div className="flex items-center gap-4 mb-4">
                                {focusedItem.vote_average > 0 && <span className="bg-green-600 px-2 py-0.5 rounded font-bold text-xs text-white">★ {focusedItem.vote_average.toFixed(1)}</span>}
                                {focusedItem.release_date && <span className="text-gray-300">{(focusedItem.release_date || focusedItem.first_air_date)?.substring(0, 4)}</span>}
                            </div>
                            <p className="text-gray-300 line-clamp-3 text-lg leading-relaxed">{focusedItem.overview}</p>
                        </div>
                    )}

                    {!loading && visibleRows.map((row) => (
                        <HomeRow
                            key={row.id}
                            title={row.name}
                            items={row.items}
                            categoryId={row.id}
                            onItemClick={handleItemClick}
                            onFocusChange={setFocusedItem}
                            onMoreClick={handleMoreClick}
                        />
                    ))}
                </div>

                {/* Menu / Sidebar Trigger */}
                {!showSidebar && (
                    <button
                        ref={sidebarTriggerRef}
                        onClick={() => setShowSidebar(true)}
                        className="focusable fixed top-4 left-4 z-50 p-3 bg-gray-800 focus:bg-blue-600 rounded-full text-white shadow-xl transition-all"
                    >☰</button>
                )}
            </div>
        </div>
    )
}

export default HomePanel