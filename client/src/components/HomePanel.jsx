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
import EditorialRow from './EditorialRow'
import RankedRow from './RankedRow'
import SwipeHero from './SwipeHero'
import SwipePicker from './SwipePicker'
import ContinueWatchingRow from './ContinueWatchingRow'
import CategoryPage from './CategoryPage'
import MovieDetail from './MovieDetail'
import PersonDetail from './PersonDetail'
import Sidebar from './Sidebar'
import tmdbClient, { getDiscoverByGenre } from '../utils/tmdbClient'
import { addFavorite, getFavorites, getHistory, getAIPicks, toTmdbItem } from '../utils/serverApi'
import { getTraktSynced } from '../utils/traktApi'
import { useQualityBadges } from '../hooks/useQualityBadges'
import { contentRowsRegistry } from '../utils/ContentRowsRegistry'
import {
    buildSwipeCandidates,
    createHybridRows,
    enrichRankedItems,
    filterPersonalItems,
    softDedupeRows
} from '../utils/homeRows'
import {
    readHomeFocus,
    readHomeSnapshot,
    writeHomeFocus,
    writeHomeSnapshot
} from '../utils/homeSnapshot'

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
                <h2 className="text-xl font-bold text-white/70">{category.title || category.name}</h2>
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
    const registryRows = useMemo(() => {
        contentRowsRegistry.reset()
        contentRowsRegistry.add(createHybridRows({ getHistory }))
        return contentRowsRegistry.getAll()
    }, [])
    const savedFocusRef = useRef()
    if (savedFocusRef.current === undefined) savedFocusRef.current = readHomeFocus()
    const cachedRowsRef = useRef()
    if (cachedRowsRef.current === undefined) {
        const snapshotRows = readHomeSnapshot()?.rows || []
        const cachedById = Object.fromEntries(snapshotRows.map(row => [row.id, row]))
        cachedRowsRef.current = registryRows
            .filter(row => cachedById[row.id]?.items?.length > 0)
            .map(row => ({ ...cachedById[row.id], ...row, items: cachedById[row.id].items }))
    }
    const cachedRows = cachedRowsRef.current
    const [categories, setCategories] = useState(() => Object.fromEntries(
        registryRows.map(row => [row.id, row])
    ))
    const [loading, setLoading] = useState(cachedRows.length === 0)
    const [focusedItem, setFocusedItem] = useState(cachedRows[0]?.items?.[0] || null)
    const [visibleRows, setVisibleRows] = useState(cachedRows)
    const [pickerOpen, setPickerOpen] = useState(false)
    // Set of TMDB ids the user already opened/watched — drives the "seen" marker
    // on catalog posters. Merged from server view-history + Trakt watched.
    const [watchedIds, setWatchedIds] = useState(() => new Set())
    // TMDB items resolved from the connected Trakt account's watchlist.
    const [traktWatchlist, setTraktWatchlist] = useState([])

    // ADR-003: Centralized navigation state
    const [activeArea, setActiveArea] = useState('content') // 'content' | 'sidebar'
    const [sidebarIndex, setSidebarIndex] = useState(0)
    const sidebarItemsCount = Sidebar.getItemsCount()

    const displayRows = useMemo(() => {
        const excludedIds = new Set(
            visibleRows
                .filter(row => row.layout === 'editorial' || row.layout === 'ranked')
                .flatMap(row => (row.items || []).map(item => item.id).filter(Boolean))
        )
        const filteredRows = visibleRows.map(row => row.id === 'for_you'
            ? { ...row, items: filterPersonalItems(row.items, watchedIds, excludedIds) }
            : row
        )
        return softDedupeRows(filteredRows)
    }, [visibleRows, watchedIds])

    const swipeCandidates = useMemo(
        () => buildSwipeCandidates(displayRows, watchedIds),
        [displayRows, watchedIds]
    )
    const pickerActive = pickerOpen && swipeCandidates.length > 0

    // Share one quality queue for all rows to avoid request storms and duplicated fetches.
    const homeQualityTitles = useMemo(() => {
        const titles = []
        const seen = new Set()
        const push = (value) => {
            if (!value || seen.has(value) || titles.length >= MAX_HOME_QUALITY_TITLES) return
            seen.add(value)
            titles.push(value)
        }

        // Highest priority: focused poster and its original title.
        push(focusedItem?.title || focusedItem?.name)
        push(focusedItem?.original_title || focusedItem?.original_name)

        // Then fill from top rows, cap total to keep discovery responsive.
        for (const row of displayRows) {
            for (const item of (row?.items || [])) {
                push(item?.title || item?.name)
                push(item?.original_title || item?.original_name)
                if (titles.length >= MAX_HOME_QUALITY_TITLES) {
                    return titles
                }
            }
        }

        return titles
    }, [displayRows, focusedItem])

    const { badges: qualityBadges, debug: qualityDebug } = useQualityBadges(homeQualityTitles)

    // 💎 "Есть в 4K": items from loaded rows whose torrent quality badges
    // include 4K. Populates progressively as badge discovery completes —
    // zero extra server traffic beyond the shared badge queue above.
    const fourKItems = useMemo(() => {
        const seen = new Set()
        const out = []
        for (const row of displayRows) {
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
    }, [displayRows, qualityBadges])

    // Accumulator + in-flight guard live in refs so a tier-3 row can be loaded
    // lazily (from a LazyRow sentinel) long after the mount effect finished.
    const rowsByIdRef = useRef(Object.fromEntries(cachedRows.map(row => [row.id, row])))
    const inflightRef = useRef(new Set())
    const emptyRowsRef = useRef(new Set())
    const refreshedRowsRef = useRef(new Set())
    const exhaustedRowsRef = useRef(new Set())
    const retryCountsRef = useRef({})
    const retryTimersRef = useRef(new Set())
    const rankedInflightRef = useRef(new Set())
    const pendingLazyIdsRef = useRef([])
    const queuedLazyIdsRef = useRef(new Set())
    const drainingLazyRef = useRef(false)
    const queueLazyLoadRef = useRef(null)
    const pendingTierOneRef = useRef([])
    const activeTierOneRef = useRef(0)
    const queueTierOneLoadRef = useRef(null)
    const mountedRef = useRef(true)
    const homeScrollRef = useRef(null)
    const restorePendingRef = useRef(true)
    useEffect(() => {
        const retryTimers = retryTimersRef.current
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            retryTimers.forEach(clearTimeout)
            retryTimers.clear()
        }
    }, [])

    const applyRows = useCallback(() => {
        if (!mountedRef.current) return
        const ordered = registryRows
            .map(c => rowsByIdRef.current[c.id])
            .filter(row => row?.items?.length > 0)
        setVisibleRows(ordered)
        writeHomeSnapshot(ordered.map(row => {
            const snapshotRow = { ...row }
            delete snapshotRow.fetcher
            return snapshotRow
        }))
        if (ordered.length > 0) setLoading(false)
        if (ordered[0]?.items?.[0]) {
            setFocusedItem(prev => prev || ordered[0].items[0])
        }
    }, [registryRows])

    // Load one registry row once per mount. Cached rows remain visible while
    // their current registry fetcher refreshes them in the background.
    const loadRow = useCallback(async function loadRegistryRow(category) {
        if (
            refreshedRowsRef.current.has(category.id) ||
            inflightRef.current.has(category.id) ||
            exhaustedRowsRef.current.has(category.id)
        ) return
        inflightRef.current.add(category.id)
        try {
            const response = await category.fetcher(1)
            const {
                items: responseItems,
                results,
                ...responseMetadata
            } = response || {}
            const items = responseItems || results || []
            if (items.length === 0) {
                emptyRowsRef.current.add(category.id)
                refreshedRowsRef.current.add(category.id)
                return
            }
            if (!mountedRef.current) return
            emptyRowsRef.current.delete(category.id)
            refreshedRowsRef.current.add(category.id)
            const loadedRow = { ...category, ...responseMetadata, items }
            rowsByIdRef.current[category.id] = loadedRow
            setCategories(prev => ({ ...prev, [category.id]: loadedRow }))
            applyRows()
        } catch (err) {
            console.error(`[HomePanel] Failed to load ${category.id}:`, err)
            const retries = retryCountsRef.current[category.id] || 0
            if (retries < 1 && mountedRef.current) {
                retryCountsRef.current[category.id] = retries + 1
                const timer = setTimeout(() => {
                    retryTimersRef.current.delete(timer)
                    if ((category.tier || 1) >= 3) {
                        queueLazyLoadRef.current?.(category)
                    } else if ((category.tier || 1) === 1) {
                        queueTierOneLoadRef.current?.(category)
                    } else {
                        loadRegistryRow(category)
                    }
                }, 1000)
                retryTimersRef.current.add(timer)
            } else {
                exhaustedRowsRef.current.add(category.id)
            }
        } finally {
            inflightRef.current.delete(category.id)
        }
    }, [applyRows])

    const drainTierOneQueue = useCallback(function drainQueue() {
        while (mountedRef.current && activeTierOneRef.current < 3 && pendingTierOneRef.current.length > 0) {
            const task = pendingTierOneRef.current.shift()
            activeTierOneRef.current++
            loadRow(task.category).finally(() => {
                activeTierOneRef.current--
                task.resolve()
                drainQueue()
            })
        }
    }, [loadRow])

    const queueTierOneLoad = useCallback((category) => new Promise(resolve => {
        pendingTierOneRef.current.push({ category, resolve })
        drainTierOneQueue()
    }), [drainTierOneQueue])
    queueTierOneLoadRef.current = queueTierOneLoad

    const drainLazyQueue = useCallback(async () => {
        if (drainingLazyRef.current) return
        drainingLazyRef.current = true
        try {
            while (mountedRef.current && pendingLazyIdsRef.current.length > 0) {
                const id = pendingLazyIdsRef.current.shift()
                queuedLazyIdsRef.current.delete(id)
                const category = registryRows.find(c => c.id === id)
                if (!category || refreshedRowsRef.current.has(id) || emptyRowsRef.current.has(id) || exhaustedRowsRef.current.has(id) || inflightRef.current.has(id)) continue
                await loadRow(category)
            }
        } finally {
            drainingLazyRef.current = false
        }
    }, [loadRow, registryRows])

    const queueLazyLoad = useCallback((category) => {
        if (!category?.id) return
        if (refreshedRowsRef.current.has(category.id) || emptyRowsRef.current.has(category.id) || exhaustedRowsRef.current.has(category.id) || inflightRef.current.has(category.id)) return
        if (queuedLazyIdsRef.current.has(category.id)) return
        queuedLazyIdsRef.current.add(category.id)
        pendingLazyIdsRef.current.push(category.id)
        drainLazyQueue()
    }, [drainLazyQueue])
    queueLazyLoadRef.current = queueLazyLoad

    const checkLazyRowsNearViewport = useCallback(() => {
        const scroller = homeScrollRef.current
        if (!scroller) return
        const scrollerRect = scroller.getBoundingClientRect()
        const viewportBottom = scrollerRect.bottom || window.innerHeight || 0
        const nodes = scroller.querySelectorAll('[data-category-id]')
        nodes.forEach(node => {
            const id = node.getAttribute('data-category-id')
            const category = registryRows.find(c => c.id === id)
            if (!category) return
            const rect = node.getBoundingClientRect()
            if (rect.top <= viewportBottom + 800) queueLazyLoad(category)
        })
    }, [queueLazyLoad, registryRows])

    // Data Loading — tiered to keep first paint fast and the NAS calm:
    // Tier 1 immediately, Tier 2 after a short delay, Tier 3 lazily on scroll.
    useEffect(() => {
        let cancelled = false
        if (cachedRows.length === 0) setLoading(true)

        const tier1 = registryRows.filter(c => (c.tier || 1) === 1)
        const tier2 = registryRows.filter(c => c.tier === 2)

        Promise.allSettled(tier1.map(queueTierOneLoad)).then(() => {
            if (cancelled) return
            setLoading(false)
        })

        const t = setTimeout(() => {
            if (!cancelled) tier2.forEach(loadRow)
        }, 2000)

        return () => { cancelled = true; clearTimeout(t) }
    }, [cachedRows.length, loadRow, queueTierOneLoad, registryRows])

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
            const next = registryRows.find(c =>
                (c.tier || 1) >= 3 &&
                !refreshedRowsRef.current.has(c.id) &&
                !emptyRowsRef.current.has(c.id) &&
                !exhaustedRowsRef.current.has(c.id) &&
                !inflightRef.current.has(c.id) &&
                !queuedLazyIdsRef.current.has(c.id)
            )
            if (next) queueLazyLoad(next)
        }, 1600)
        return () => clearInterval(id)
    }, [checkLazyRowsNearViewport, queueLazyLoad, registryRows])

    // Fast id→row lookup for the render (loaded rows vs lazy placeholders).
    const loadedById = useMemo(() => {
        const map = {}
        for (const row of displayRows) map[row.id] = row
        return map
    }, [displayRows])

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

                case 'Enter': {
                    e.preventDefault()
                    e.stopPropagation()
                    // Get the item at current index and trigger selection
                    const allItems = getSidebarItems()
                    if (allItems[sidebarIndex]) {
                        handleSidebarSelect(allItems[sidebarIndex])
                    }
                    break
                }

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
        // The handler intentionally tracks the primitive navigation state; helper
        // functions are recreated during render but read only values listed here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showSidebar, activeArea, sidebarIndex, sidebarItemsCount, activeMovie, activePerson, activeCategory, setShowSidebar])

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
    const handleItemClick = (item) => {
        setPickerOpen(false)
        setActiveMovie(item)
    }

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
        const cat = registryRows.find(row => row.id === categoryId)
        if (cat) setActiveCategory({ ...cat, name: cat.name || cat.title })
    }

    const handleRowFocus = useCallback((item, itemIndex, rowId, horizontalScroll = 0) => {
        setFocusedItem(item)
        const focus = {
            rowId,
            itemIndex,
            verticalScroll: homeScrollRef.current?.scrollTop || 0,
            horizontalScroll
        }
        savedFocusRef.current = focus
        writeHomeFocus(focus)
    }, [])

    const restoreHomeFocus = useCallback((saved) => {
        const scroller = homeScrollRef.current
        if (!scroller || !saved?.rowId) return false

        const row = [...scroller.querySelectorAll('[data-row-id]')]
            .find(node => node.dataset.rowId === saved.rowId)
        if (!row) return false

        scroller.scrollTop = Number(saved.verticalScroll) || 0
        const horizontalScroller = row.querySelector('.snap-container')
        if (!horizontalScroller) return false
        horizontalScroller.scrollLeft = Number(saved.horizontalScroll) || 0
        const items = horizontalScroller.querySelectorAll('[data-item-id], .snap-item')
        const itemNode = items[Number(saved.itemIndex) || 0]
        if (!itemNode) return false
        itemNode.focus()
        return true
    }, [])

    useEffect(() => {
        if (activeMovie) {
            restorePendingRef.current = true
            return
        }
        if (!restorePendingRef.current) return

        const saved = savedFocusRef.current
        if (!saved) {
            restorePendingRef.current = false
            return
        }
        const frame = requestAnimationFrame(() => {
            if (restoreHomeFocus(saved)) restorePendingRef.current = false
        })
        return () => cancelAnimationFrame(frame)
    }, [activeMovie, displayRows, restoreHomeFocus])

    const enrichNextRankedBatch = useCallback(async (rowId) => {
        if (rankedInflightRef.current.has(rowId)) return
        const row = rowsByIdRef.current[rowId]
        const firstMissing = row?.items?.findIndex(item => !item.backdrop_path) ?? -1
        if (firstMissing < 0) return

        rankedInflightRef.current.add(rowId)
        try {
            const items = await enrichRankedItems(row.items, firstMissing, 3)
            if (!mountedRef.current) return
            rowsByIdRef.current[rowId] = { ...row, items }
            setCategories(prev => ({ ...prev, [rowId]: rowsByIdRef.current[rowId] }))
            applyRows()
        } catch (err) {
            console.error(`[HomePanel] Failed to enrich ${rowId}:`, err)
        } finally {
            rankedInflightRef.current.delete(rowId)
        }
    }, [applyRows])

    const renderRow = (row) => {
        const onFocusChange = (item, reportedIndex) => {
            const savedFocus = savedFocusRef.current
            const itemIndex = Number.isInteger(reportedIndex)
                ? reportedIndex
                : row.items.findIndex(candidate => candidate.id === item?.id)
            if (restorePendingRef.current && savedFocus) {
                if (savedFocus.rowId !== row.id) return
                if (savedFocus.itemIndex === itemIndex) {
                    setFocusedItem(item)
                    return
                }
            }
            const wrapper = [...(homeScrollRef.current?.querySelectorAll('[data-row-id]') || [])]
                .find(node => node.dataset.rowId === row.id)
            const horizontalScroll = wrapper?.querySelector('.snap-container')?.scrollLeft || 0
            handleRowFocus(item, Math.max(itemIndex, 0), row.id, horizontalScroll)
        }
        const props = {
            ...row,
            items: row.items,
            initialIndex: savedFocusRef.current?.rowId === row.id
                ? savedFocusRef.current.itemIndex
                : 0,
            isActive: !showSidebar && !pickerActive,
            onSelect: handleItemClick,
            onFocusChange,
            qualityBadges,
            watchedIds
        }
        let component
        if (row.layout === 'editorial') {
            component = <EditorialRow {...props} />
        } else if (row.layout === 'ranked') {
            component = <RankedRow {...props} onNearEnd={() => enrichNextRankedBatch(row.id)} />
        } else {
            component = (
                <HomeRow
                    {...props}
                    categoryId={row.id}
                    onItemClick={handleItemClick}
                    onMoreClick={handleMoreClick}
                    qualityDebug={qualityDebug}
                />
            )
        }

        return <div key={row.id} data-row-id={row.id}>{component}</div>
    }

    const handleSidebarSelect = (item) => {
        if (item.id === 'close') {
            setShowSidebar(false)
            onClose?.()
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
                fetcher: (page) => tmdbClient(
                    `/discover/movie?primary_release_year=${item.year}&sort_by=popularity.desc&include_adult=false&language=ru-RU&page=${page}`,
                    { useCache: false }
                )
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
                    {swipeCandidates.length > 0 && (
                        <SwipeHero
                            onOpen={() => {
                                if (swipeCandidates.length > 0) setPickerOpen(true)
                            }}
                            isActive={!showSidebar && !pickerActive}
                        />
                    )}
                    {registryRows
                        .filter(cat => cat.layout !== 'poster')
                        .map((cat) => {
                            const row = loadedById[cat.id]
                            return row ? renderRow(row) : null
                        })}
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
                            isActive={!showSidebar && !pickerActive}
                        />
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
                            isActive={!showSidebar && !pickerActive}
                        />
                    )}
                    {registryRows.filter(cat => cat.layout === 'poster').map((cat) => {
                        const row = loadedById[cat.id]
                        if (row) return renderRow(row)
                        // Tier 3 not yet loaded → lazy sentinel; Tier 1/2 pending → nothing.
                        if ((cat.tier || 1) >= 3) {
                            return <LazyRow key={cat.id} category={cat} onVisible={queueLazyLoad} />
                        }
                        return null
                    })}
                </div>

                {pickerActive && (
                    <SwipePicker
                        items={swipeCandidates}
                        onFavorite={addFavorite}
                        onOpenItem={handleItemClick}
                        onClose={() => setPickerOpen(false)}
                    />
                )}

                {/* Menu / Sidebar Trigger via ArrowLeft (invisible) */}
            </div>
        </div>
    )
}

export default HomePanel
