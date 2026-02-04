/**
 * HomePanel.jsx – ADR-003 Compliant Navigation
 * 
 * Key architecture:
 * - activeArea controls which zone handles input ('content' | 'sidebar')
 * - Sidebar is a "dumb" component (no navigation logic)
 * - All keyboard handling centralized here
 * - No double event processing
 */

import React, { useState, useEffect, useCallback } from 'react'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import HomeRow from './HomeRow'
import CategoryPage from './CategoryPage'
import MovieDetail from './MovieDetail'
import PersonDetail from './PersonDetail'
import Sidebar from './Sidebar'
import { fetchAllDiscovery, getBackdropUrl } from '../utils/discover'
import tmdbClient, { getDiscoverByGenre, searchMulti, filterDiscoveryResults } from '../utils/tmdbClient'
import { getFavorites, getHistory, toTmdbItem } from '../utils/serverApi'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const HomeHeaderButtons = ({ onMenuClick, onVoiceClick, isListening }) => {
    const menuRef = useSpatialItem('main')
    const voiceRef = useSpatialItem('main')
    return (
        <div className="fixed top-4 left-4 z-50 flex gap-2">
            <button
                ref={menuRef}
                onClick={onMenuClick}
                className="focusable p-3 bg-gray-800 focus:bg-blue-600 rounded-full text-white shadow-xl transition-all"
            >☰</button>
            <button
                ref={voiceRef}
                onClick={onVoiceClick}
                className={`focusable p-3 rounded-full text-white shadow-xl transition-all ${isListening ? 'bg-red-600 animate-pulse' : 'bg-gray-800 focus:bg-blue-600'}`}
            >🎤</button>
        </div>
    )
}

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

    // ADR-003: Centralized navigation state
    const [activeArea, setActiveArea] = useState('content') // 'content' | 'sidebar'
    const [sidebarIndex, setSidebarIndex] = useState(0)
    const sidebarItemsCount = Sidebar.getItemsCount()

    // VOICE-01: Voice search on Home
    const [isListening, setIsListening] = useState(false)

    const handleVoiceSearch = useCallback(async () => {
        let query = null
        try {
            const { available } = await SpeechRecognition.available()
            if (available) {
                await SpeechRecognition.requestPermissions()
                setIsListening(true)
                const result = await SpeechRecognition.start({
                    language: 'ru-RU', maxResults: 1,
                    prompt: 'Что хотите посмотреть?', partialResults: false, popup: true
                })
                setIsListening(false)
                query = result?.matches?.[0]?.trim()
            } else {
                query = prompt('Что хотите посмотреть?')?.trim()
            }
        } catch {
            setIsListening(false)
            query = prompt('Что хотите посмотреть?')?.trim()
        }

        if (!query) return

        try {
            const data = await searchMulti(query)
            const filtered = filterDiscoveryResults(data.results || [])
            if (filtered.length > 0) {
                setActiveMovie(filtered[0])
            }
        } catch (err) {
            console.warn('[VoiceSearch] TMDB search failed:', err)
        }
    }, [setActiveMovie])

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

    // Sync activeArea with showSidebar
    useEffect(() => {
        if (showSidebar) {
            setActiveArea('sidebar')
        } else {
            setActiveArea('content')
        }
    }, [showSidebar])

    // ADR-003: ArrowLeft at edge → open sidebar (enables remote control access)
    useEffect(() => {
        // Don't add this handler if sidebar is open or we're in a sub-view
        if (showSidebar || activeMovie || activePerson || activeCategory) return

        const handleArrowLeftAtEdge = (e) => {
            if (e.key !== 'ArrowLeft') return

            const activeEl = document.activeElement
            // Use rAF to check if focus moved after spatial navigation processed the key
            requestAnimationFrame(() => {
                // If focus didn't change, we hit the left edge → open sidebar
                if (document.activeElement === activeEl) {
                    console.log('[HomePanel] ArrowLeft at edge → opening sidebar')
                    setShowSidebar(true)
                }
            })
        }

        // Use capture phase to run after SpatialEngine (which uses bubbling)
        window.addEventListener('keydown', handleArrowLeftAtEdge)
        return () => window.removeEventListener('keydown', handleArrowLeftAtEdge)
    }, [showSidebar, activeMovie, activePerson, activeCategory, setShowSidebar])

    // ADR-003: Centralized keyboard handler
    useEffect(() => {
        // Only handle keys when sidebar is open and we're on home (no sub-views)
        if (!showSidebar || activeMovie || activePerson || activeCategory) return

        const handleKeyDown = (e) => {
            if (activeArea !== 'sidebar') return

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault()
                    e.stopPropagation()
                    setSidebarIndex(prev => Math.max(0, prev - 1))
                    break

                case 'ArrowDown':
                    e.preventDefault()
                    e.stopPropagation()
                    setSidebarIndex(prev => Math.min(sidebarItemsCount - 1, prev + 1))
                    break

                case 'ArrowRight':
                    e.preventDefault()
                    e.stopPropagation()
                    setShowSidebar(false)
                    setActiveArea('content')
                    break

                case 'Enter':
                    e.preventDefault()
                    e.stopPropagation()
                    // Get the item at current index and trigger selection
                    const allItems = getSidebarItems()
                    if (allItems[sidebarIndex]) {
                        handleSidebarSelect(allItems[sidebarIndex])
                    }
                    break

                case 'Escape':
                case 'Backspace':
                    e.preventDefault()
                    e.stopPropagation()
                    setShowSidebar(false)
                    setActiveArea('content')
                    break

                default:
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [showSidebar, activeArea, sidebarIndex, sidebarItemsCount, activeMovie, activePerson, activeCategory])

    // Handle Menu button (ContextMenu) to open sidebar
    useEffect(() => {
        if (activeMovie || activePerson || activeCategory) return

        const handleContextMenu = (e) => {
            if (e.key === 'ContextMenu' || e.code === 'ContextMenu') {
                e.preventDefault()
                setShowSidebar(prev => !prev)
            }
        }

        window.addEventListener('keydown', handleContextMenu)
        return () => window.removeEventListener('keydown', handleContextMenu)
    }, [activeMovie, activePerson, activeCategory, setShowSidebar])

    // Helper: get sidebar items list
    const getSidebarItems = () => {
        const years = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => 2026 - i)
        const menuItems = [
            { id: 'close', icon: '❌', label: 'Закрыть' },
            { id: 'search', icon: '🔍', label: 'Поиск' },
            { id: 'filter_year_2025', icon: '🎬', label: 'Новые фильмы 2025', type: 'year', year: 2025 },
            { id: 'tv_new', icon: '📺', label: 'Новые сериалы', categoryId: 'tv' },
            { id: 'cartoons', icon: '🎨', label: 'Мультфильмы', categoryId: 'genre_16' },
            { id: 'anime', icon: '🍥', label: 'Аниме', categoryId: 'genre_16' },
            { id: 'top_rated', icon: '⭐', label: 'Лучшие фильмы', categoryId: 'top' },
            { id: 'favorites', icon: '❤️', label: 'Избранное' },
            { id: 'history', icon: '🕒', label: 'История' },
            { id: 'ai_picks', icon: '🤖', label: 'Подборки AI' },
        ]
        return [
            ...menuItems,
            ...years.map(year => ({ id: `year_${year}`, icon: '📅', label: String(year), type: 'year', year }))
        ]
    }

    // Handlers
    const handleItemClick = (item) => setActiveMovie(item)

    const handlePersonClick = (person) => {
        setActiveMovie(null)
        setActivePerson(person)
    }

    const handleGenreClick = (genre, type = 'movie') => {
        setActiveMovie(null)
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
        if (item.id === 'close') {
            setShowSidebar(false)
            return
        }
        if (item.id === 'search') {
            onSearch?.('')
        } else if (item.id === 'favorites') {
            // FAV-01: Show favorites as CategoryPage
            setActiveCategory({
                id: 'favorites',
                name: 'Избранное',
                icon: '❤️',
                fetcher: async () => {
                    const favs = await getFavorites()
                    return { results: favs.map(toTmdbItem), total_pages: 1 }
                }
            })
        } else if (item.id === 'history') {
            // HIST-01: Show history as CategoryPage
            setActiveCategory({
                id: 'history',
                name: 'История просмотров',
                icon: '🕒',
                fetcher: async () => {
                    const hist = await getHistory()
                    return { results: hist.map(toTmdbItem), total_pages: 1 }
                }
            })
        } else if (item.id === 'ai_picks') {
            // AI-01: Show AI recommendations as CategoryPage
            setActiveCategory({
                id: 'ai_picks',
                name: 'Подборки AI',
                icon: '🤖',
                fetcher: async () => {
                    const base = localStorage.getItem('serverUrl')?.replace(/\/$/, '') || window.location.origin
                    const res = await fetch(`${base}/api/ai-picks`)
                    if (!res.ok) return { results: [], total_pages: 1 }
                    const data = await res.json()
                    return { results: data.map(toTmdbItem), total_pages: 1 }
                }
            })
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
            onSelectPerson={handlePersonClick}
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
                focusedIndex={sidebarIndex}
                onSelect={handleSidebarSelect}
                onClose={() => setShowSidebar(false)}
            />

            <div className={`flex-1 relative transition-all duration-300 ${showSidebar ? 'opacity-50 blur-sm pointer-events-none' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#141414] to-[#141414]" />

                <div className="relative z-10 pt-4 pb-20 px-8 h-full overflow-y-auto custom-scrollbar">
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

                {/* Menu / Sidebar Trigger + Voice Search */}
                {!showSidebar && (
                    <HomeHeaderButtons
                        onMenuClick={() => setShowSidebar(true)}
                        onVoiceClick={handleVoiceSearch}
                        isListening={isListening}
                    />
                )}
            </div>
        </div>
    )
}

export default HomePanel