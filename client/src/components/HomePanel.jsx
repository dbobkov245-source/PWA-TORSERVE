/**
 * HomePanel.jsx – ADR-003 Compliant Navigation
 * 
 * Key architecture:
 * - activeArea controls which zone handles input ('content' | 'sidebar')
 * - Sidebar is a "dumb" component (no navigation logic)
 * - All keyboard handling centralized here
 * - No double event processing
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import HomeRow from './HomeRow'
import ContinueWatchingRow from './ContinueWatchingRow'
import CategoryPage from './CategoryPage'
import MovieDetail from './MovieDetail'
import PersonDetail from './PersonDetail'
import Sidebar from './Sidebar'
import { DISCOVERY_CATEGORIES, fetchCategoryWithPages, getBackdropUrl } from '../utils/discover'
import tmdbClient, { getDiscoverByGenre } from '../utils/tmdbClient'
import { getFavorites, getHistory, getAIPicks, toTmdbItem } from '../utils/serverApi'
import { getTraktSynced } from '../utils/traktApi'
import { useSpatialItem } from '../hooks/useSpatialNavigation'
import { useQualityBadges } from '../hooks/useQualityBadges'

// Tier-3 lazy row placeholder: fetches its category only once it scrolls near
// the viewport, then the parent swaps it for a real HomeRow. Keeps the home page
// from firing 30+ cascade requests (and NAS quality-badge work) on first paint.
const LazyRow = ({ category, onVisible }) => {
    const ref = useRef(null)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        if (typeof IntersectionObserver === 'undefined') {
            const id = setTimeout(() => onVisible(category), 0)
            return () => clearTimeout(id)
        }
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                onVisible(category)
                obs.disconnect()
            }
        }, { rootMargin: '300px' })
        obs.observe(el)
        return () => obs.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category.id])

    return (
        <div ref={ref} data-category-id={category.id} className="home-row mb-6">
            <div className="flex items-center gap-2 px-8 mb-3">
                <span className="text-2xl">{category.icon}</span>
                <h2 className="text-xl font-bold text-white/70">{category.name}</h2>
            </div>
            <div className="px-8 h-[195px] flex items-center text-gray-600 text-sm">Загрузка…</div>
        </div>
    )
}

const HomePanel = ({
    activeMovie, setActiveMovie,
    activePerson, setActivePerson,
    activeCategory, setActiveCategory,
    showSidebar, setShowSidebar,
    torrentSession,
    onOpenMovieTorrents,
    onSearch, onClose,
    resumeItems = [],
    onResume
}) => {
    // ~2 visible rows; covers the "Есть в 4K" row too. 60 used to trigger
    // ~40s of background jacred searches on the NAS right after home load.
    const MAX_HOME_QUALITY_TITLES = 12
    const [categories, setCategories] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [backdrop, setBackdrop] = useState(null)
    const [focusedItem, setFocusedItem] = useState(null)
    const [visibleRows, setVisibleRows] = useState([])
    // Set of TMDB ids the user already opened/watched — drives the "seen" marker
    // on catalog posters. Merged from server view-history + Trakt watched.
    const [watchedIds, setWatchedIds] = useState(() => new Set())
    // TMDB items resolved from the connected Trakt account's watchlist.
    const [traktWatchlist, setTraktWatchlist] = useState([])

    // ADR-003: Centralized navigation state
    const [activeArea, setActiveArea] = useState('content') // 'content' | 'sidebar'
    const [sidebarIndex, setSidebarIndex] = useState(0)
    const sidebarItemsCount = Sidebar.getItemsCount()

    // Share one quality queue for all rows to avoid request storms and duplicated fetches.
    const homeQualityTitles = useMemo(() => {
        const titles = []
        const seen = new Set()
        const push = (value) => {
            if (!value || seen.has(value)) return
            seen.add(value)
            titles.push(value)
        }

        // Highest priority: focused poster and its original title.
        push(focusedItem?.title || focusedItem?.name)
        push(focusedItem?.original_title || focusedItem?.original_name)

        // Then fill from top rows, cap total to keep discovery responsive.
        for (const row of visibleRows) {
            for (const item of (row?.items || [])) {
                push(item?.title || item?.name)
                push(item?.original_title || item?.original_name)
                if (titles.length >= MAX_HOME_QUALITY_TITLES) {
                    return titles
                }
            }
        }

        return titles
    }, [visibleRows, focusedItem])

    const { badges: qualityBadges, debug: qualityDebug } = useQualityBadges(homeQualityTitles)

    // 💎 "Есть в 4K": items from loaded rows whose torrent quality badges
    // include 4K. Populates progressively as badge discovery completes —
    // zero extra server traffic beyond the shared badge queue above.
    const fourKItems = useMemo(() => {
        const seen = new Set()
        const out = []
        for (const row of visibleRows) {
            for (const item of (row?.items || [])) {
                if (!item?.id || seen.has(item.id)) continue
                const title = item.title || item.name
                const original = item.original_title || item.original_name
                const badges = qualityBadges?.[title] || qualityBadges?.[original] || []
                if (badges.includes('4K')) {
                    seen.add(item.id)
                    out.push(item)
                }
            }
        }
        return out.slice(0, 20)
    }, [visibleRows, qualityBadges])

    // Accumulator + in-flight guard live in refs so a tier-3 row can be loaded
    // lazily (from a LazyRow sentinel) long after the mount effect finished.
    const rowsByIdRef = useRef({})
    const inflightRef = useRef(new Set())
    const emptyRowsRef = useRef(new Set())
    const lazyRetryAtRef = useRef({})
    const pendingLazyIdsRef = useRef([])
    const queuedLazyIdsRef = useRef(new Set())
    const drainingLazyRef = useRef(false)
    const mountedRef = useRef(true)
    const homeScrollRef = useRef(null)
    useEffect(() => () => { mountedRef.current = false }, [])

    const applyRows = useCallback(() => {
        if (!mountedRef.current) return
        const ordered = DISCOVERY_CATEGORIES
            .map(c => rowsByIdRef.current[c.id])
            .filter(row => row?.items?.length > 0)
        setVisibleRows(ordered)
        if (ordered.length > 0) setLoading(false)
        if (ordered[0]?.items?.[0]) {
            setFocusedItem(prev => prev || ordered[0].items[0])
        }
    }, [])

    // Load one category. Idempotent: skips already-loaded or in-flight rows so
    // both the tiered mount load and lazy sentinels can call it freely.
    const loadRow = useCallback(async (category) => {
        if (rowsByIdRef.current[category.id] || inflightRef.current.has(category.id)) return
        inflightRef.current.add(category.id)
        try {
            const row = await fetchCategoryWithPages(category)
            const items = row.items || []
            if (items.length === 0) {
                emptyRowsRef.current.add(category.id)
                inflightRef.current.delete(category.id)
                return
            }
            if (!mountedRef.current) return
            emptyRowsRef.current.delete(category.id)
            rowsByIdRef.current[category.id] = { ...row, items }
            setCategories(prev => ({ ...prev, [category.id]: { ...row, items } }))
            applyRows()
        } catch (err) {
            console.error(`[HomePanel] Failed to load ${category.id}:`, err)
            lazyRetryAtRef.current[category.id] = Date.now() + 60 * 1000
            inflightRef.current.delete(category.id) // allow retry on next intersection
        }
    }, [applyRows])

    const drainLazyQueue = useCallback(async () => {
        if (drainingLazyRef.current) return
        drainingLazyRef.current = true
        try {
            while (mountedRef.current && pendingLazyIdsRef.current.length > 0) {
                const id = pendingLazyIdsRef.current.shift()
                queuedLazyIdsRef.current.delete(id)
                const category = DISCOVERY_CATEGORIES.find(c => c.id === id)
                if (!category || rowsByIdRef.current[id] || emptyRowsRef.current.has(id) || inflightRef.current.has(id)) continue
                await loadRow(category)
            }
        } finally {
            drainingLazyRef.current = false
        }
    }, [loadRow])

    const queueLazyLoad = useCallback((category) => {
        if (!category?.id) return
        const retryAt = lazyRetryAtRef.current[category.id] || 0
        if (retryAt > Date.now()) return
        if (rowsByIdRef.current[category.id] || emptyRowsRef.current.has(category.id) || inflightRef.current.has(category.id)) return
        if (queuedLazyIdsRef.current.has(category.id)) return
        queuedLazyIdsRef.current.add(category.id)
        pendingLazyIdsRef.current.push(category.id)
        drainLazyQueue()
    }, [drainLazyQueue])

    const checkLazyRowsNearViewport = useCallback(() => {
        const scroller = homeScrollRef.current
        if (!scroller) return
        const scrollerRect = scroller.getBoundingClientRect()
        const viewportBottom = scrollerRect.bottom || window.innerHeight || 0
        const nodes = scroller.querySelectorAll('[data-category-id]')
        nodes.forEach(node => {
            const id = node.getAttribute('data-category-id')
            const category = DISCOVERY_CATEGORIES.find(c => c.id === id)
            if (!category) return
            const rect = node.getBoundingClientRect()
            if (rect.top <= viewportBottom + 800) queueLazyLoad(category)
        })
    }, [queueLazyLoad])

    // Data Loading — tiered to keep first paint fast and the NAS calm:
    // Tier 1 immediately, Tier 2 after a short delay, Tier 3 lazily on scroll.
    useEffect(() => {
        let cancelled = false
        setLoading(true)

        const tier1 = DISCOVERY_CATEGORIES.filter(c => (c.tier || 1) === 1)
        const tier2 = DISCOVERY_CATEGORIES.filter(c => c.tier === 2)

        Promise.allSettled(tier1.map(loadRow)).then(() => {
            if (cancelled) return
            setLoading(false)
            if (Object.keys(rowsByIdRef.current).length === 0) {
                setError('Failed to load content')
            }
        })

        const t = setTimeout(() => {
            if (!cancelled) tier2.forEach(loadRow)
        }, 2000)

        return () => { cancelled = true; clearTimeout(t) }
    }, [loadRow])

    useEffect(() => {
        const scroller = homeScrollRef.current
        if (!scroller) return
        const handleScroll = () => checkLazyRowsNearViewport()
        handleScroll()
        scroller.addEventListener('scroll', handleScroll, { passive: true })
        window.addEventListener('resize', handleScroll)
        return () => {
            scroller.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', handleScroll)
        }
    }, [checkLazyRowsNearViewport])

    useEffect(() => {
        const id = setInterval(() => {
            checkLazyRowsNearViewport()
            const next = DISCOVERY_CATEGORIES.find(c =>
                (c.tier || 1) >= 3 &&
                !rowsByIdRef.current[c.id] &&
                !emptyRowsRef.current.has(c.id) &&
                !inflightRef.current.has(c.id) &&
                !queuedLazyIdsRef.current.has(c.id) &&
                (lazyRetryAtRef.current[c.id] || 0) <= Date.now()
            )
            if (next) queueLazyLoad(next)
        }, 1600)
        return () => clearInterval(id)
    }, [checkLazyRowsNearViewport, queueLazyLoad])

    // Fast id→row lookup for the render (loaded rows vs lazy placeholders).
    const loadedById = useMemo(() => {
        const map = {}
        for (const row of visibleRows) map[row.id] = row
        return map
    }, [visibleRows])

    // Watched-id set for the "seen" poster marker — merged from local server
    // history AND the connected Trakt account. Trakt also feeds a watchlist row.
    useEffect(() => {
        let cancelled = false
        Promise.allSettled([getHistory(), getTraktSynced()]).then(async ([h, t]) => {
            if (cancelled) return
            const ids = new Set()
            if (h.status === 'fulfilled') {
                (h.value || []).forEach(x => x.tmdbId && ids.add(x.tmdbId))
            }
            let watchlistIds = []
            if (t.status === 'fulfilled') {
                (t.value?.watched || []).forEach(id => ids.add(id))
                watchlistIds = (t.value?.watchlist || []).map(w => w.tmdbId).filter(Boolean).slice(0, 20)
            }
            setWatchedIds(ids)

            if (watchlistIds.length > 0) {
                const items = await Promise.all(watchlistIds.map(id =>
                    tmdbClient(`/movie/${id}?language=ru-RU`).then(r => (r && r.id ? r : null)).catch(() => null)
                ))
                if (!cancelled) setTraktWatchlist(items.filter(Boolean))
            }
        })
        return () => { cancelled = true }
    }, [])

    // ANTI-06: Prefetch Discovery - warm up bypass layers cache after initial load
    useEffect(() => {
        if (loading || Object.keys(categories).length === 0) return

        const prefetchTimer = setTimeout(async () => {
            console.log('[HomePanel] 🔥 Prefetching popular discovery endpoints...')
            try {
                // Prefetch popular endpoints to warm up cache and bypass layers
                await Promise.allSettled([
                    tmdbClient('/trending/movie/week?page=2'),
                    tmdbClient('/movie/top_rated?page=1'),
                ])
                console.log('[HomePanel] ✅ Prefetch complete')
            } catch {
                // Ignore prefetch errors
            }
        }, 5000) // Wait 5s after initial load

        return () => clearTimeout(prefetchTimer)
    }, [loading, categories])

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
                    const data = await getAIPicks()
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
            torrentSession={torrentSession}
            onOpenMovieTorrents={onOpenMovieTorrents}
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
        <div className="flex h-full w-full bg-[#141414]">
            <Sidebar
                isOpen={showSidebar}
                focusedIndex={sidebarIndex}
                onSelect={handleSidebarSelect}
                onClose={() => setShowSidebar(false)}
            />

            <div className={`flex-1 relative transition-all duration-300 ease-out ${showSidebar ? 'translate-x-64 pointer-events-none' : 'translate-x-0'}`}>
                <div className="absolute inset-0 bg-[#141414]" />

                {/* Content area: vertical scroll enabled, horizontal scroll handled by HomeRow */}
                <div ref={homeScrollRef} className="relative z-10 pt-4 pb-20 h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {!loading && resumeItems.length > 0 && onResume && (
                        <ContinueWatchingRow items={resumeItems} onResume={onResume} />
                    )}
                    {!loading && traktWatchlist.length > 0 && (
                        <HomeRow
                            key="trakt-watchlist"
                            title="Trakt: смотреть позже"
                            icon="📋"
                            items={traktWatchlist}
                            categoryId="trakt-watchlist"
                            onItemClick={handleItemClick}
                            onFocusChange={setFocusedItem}
                            qualityBadges={qualityBadges}
                            qualityDebug={qualityDebug}
                            watchedIds={watchedIds}
                        />
                    )}
                    {!loading && fourKItems.length > 0 && (
                        <HomeRow
                            key="has-4k"
                            title="Есть в 4K"
                            icon="💎"
                            items={fourKItems}
                            categoryId="has-4k"
                            onItemClick={handleItemClick}
                            onFocusChange={setFocusedItem}
                            qualityBadges={qualityBadges}
                            qualityDebug={qualityDebug}
                            watchedIds={watchedIds}
                        />
                    )}
                    {DISCOVERY_CATEGORIES.map((cat) => {
                        const row = loadedById[cat.id]
                        if (row) {
                            return (
                                <HomeRow
                                    key={cat.id}
                                    title={row.name}
                                    icon={cat.icon}
                                    items={row.items}
                                    categoryId={cat.id}
                                    onItemClick={handleItemClick}
                                    onFocusChange={setFocusedItem}
                                    onMoreClick={handleMoreClick}
                                    qualityBadges={qualityBadges}
                                    qualityDebug={qualityDebug}
                                    watchedIds={watchedIds}
                                />
                            )
                        }
                        // Tier 3 not yet loaded → lazy sentinel; Tier 1/2 pending → nothing.
                        if ((cat.tier || 1) >= 3) {
                            return <LazyRow key={cat.id} category={cat} onVisible={queueLazyLoad} />
                        }
                        return null
                    })}
                </div>

                {/* Menu / Sidebar Trigger via ArrowLeft (invisible) */}
            </div>
        </div>
    )
}

export default HomePanel
