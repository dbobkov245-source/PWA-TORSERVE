import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { getPosterUrl, getTitle, getYear, DISCOVERY_CATEGORIES } from '../utils/discover'
import { reportBrokenImage, filterDiscoveryResults, getNextImageUrl } from '../utils/tmdbClient'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const SORT_OPTIONS = [
    { id: 'popularity', label: 'Популярные' },
    { id: 'rating', label: 'По рейтингу' },
    { id: 'year', label: 'По году' }
]

const RATING_OPTIONS = [
    { id: 0, label: 'Любой' },
    { id: 7, label: '7+' },
    { id: 8, label: '8+' }
]

const itemYear = (item) => parseInt(getYear(item), 10) || 0

const FilterChip = ({ label, active, onClick }) => {
    const ref = useSpatialItem('category')
    return (
        <button
            ref={ref}
            onClick={onClick}
            className={`focusable shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500 ${
                active
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300'
            }`}
        >
            {label}
        </button>
    )
}

const CategoryPage = ({
    categoryId,
    customCategory,
    items: initialItems = [],
    onItemClick,
    onFocusChange
}) => {
    const [displayedItems, setDisplayedItems] = useState(initialItems)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [retryTick, setRetryTick] = useState(0)
    const [imageErrors, setImageErrors] = useState(new Set())
    const [sortBy, setSortBy] = useState('popularity')
    const [minRating, setMinRating] = useState(0)
    const observerTarget = useRef(null)
    const pageRef = useRef(initialItems.length > 0 ? 1 : 0)
    const loadedKeyRef = useRef(null)
    const backRef = useSpatialItem('category')

    const category = customCategory || DISCOVERY_CATEGORIES.find(c => c.id === categoryId)
    const categoryKey = customCategory?.id || categoryId || customCategory?.name || null

    // Client-side filter + sort over already-loaded items. 'popularity' keeps the
    // server order (no resort → no focus jump while paginating); other modes sort.
    const visibleItems = useMemo(() => {
        const filtered = minRating > 0
            ? displayedItems.filter(i => (i.vote_average || 0) >= minRating)
            : displayedItems
        if (sortBy === 'rating') {
            return [...filtered].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        }
        if (sortBy === 'year') {
            return [...filtered].sort((a, b) => itemYear(b) - itemYear(a))
        }
        return filtered
    }, [displayedItems, sortBy, minRating])

    const loadMore = useCallback(async () => {
        if (loading || !hasMore || !category?.fetcher) return
        setLoading(true)
        try {
            const nextPage = pageRef.current + 1
            const response = await category.fetcher(nextPage)
            if (response && response.results && response.results.length > 0) {
                const newItems = filterDiscoveryResults(response.results)
                if (newItems.length > 0) {
                    setDisplayedItems(prev => {
                        const existingIds = new Set(prev.map(i => i.id))
                        const unique = newItems.filter(i => !existingIds.has(i.id))
                        return unique.length > 0 ? [...prev, ...unique] : prev
                    })
                }
                pageRef.current = nextPage
                // Stop pagination if: few results, or server says only 1 page, or we exceeded total pages
                if (response.results.length < 20 || response.total_pages === 1 || (response.total_pages && nextPage >= response.total_pages)) {
                    setHasMore(false)
                }
            } else { setHasMore(false) }
        } catch (e) {
            console.error(e)
            setHasMore(false)
        } finally { setLoading(false) }
    }, [loading, hasMore, category])

    // Reset + fresh page-1 fetch whenever the category identity changes, in ONE
    // effect. The prior split (reset effect + [category] initial-load effect) had
    // a stale-`page` race: on a category→category switch the reset's setPage(0)
    // had not committed when the load effect ran, so `page === 0` was false and
    // loadMore never fired → empty grid (year/genre/favorites came up blank).
    useEffect(() => {
        let cancelled = false
        setDisplayedItems(initialItems)
        pageRef.current = initialItems.length > 0 ? 1 : 0
        setHasMore(true)
        setLoadError(null)
        setImageErrors(new Set())

        if (!category?.fetcher || initialItems.length > 0) return
        if (loadedKeyRef.current === categoryKey) return
        loadedKeyRef.current = categoryKey

        setLoading(true)
        category.fetcher(1)
            .then((response) => {
                if (cancelled) return
                const newItems = filterDiscoveryResults(response?.results || [])
                setDisplayedItems(newItems)
                pageRef.current = 1
                if (!response?.results?.length || response.results.length < 20 || response.total_pages === 1) {
                    setHasMore(false)
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    console.error(e)
                    setLoadError(e)
                    setHasMore(false)
                }
            })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryKey, retryTick])

    const handleRetry = useCallback(() => {
        loadedKeyRef.current = null
        setRetryTick(t => t + 1)
    }, [])

    // Use both IntersectionObserver and Scroll Listener for maximum robustness on TV
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) loadMore() },
            { threshold: 0, rootMargin: '500px' }
        )
        if (observerTarget.current) observer.observe(observerTarget.current)

        // Fallback: Scroll listener in case Observer fails on older WebViews
        const handleScroll = (e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target
            if (scrollHeight - scrollTop <= clientHeight + 1000) {
                loadMore()
            }
        }

        const container = document.querySelector('.category-page')
        if (container) container.addEventListener('scroll', handleScroll)

        return () => {
            observer.disconnect()
            if (container) container.removeEventListener('scroll', handleScroll)
        }
    }, [loadMore])

    if (!category) return null

    return (
        <div className="category-page h-full w-full bg-[#141414] p-6 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    ref={backRef}
                    className="focusable text-white hover:text-blue-400 p-2 rounded-lg focus:ring-4 focus:ring-blue-500"
                    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }))}
                >
                    <span className="text-2xl">←</span>
                </button>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">{category.icon}</span>
                    {category.name}
                    <span className="text-gray-500 text-lg font-normal">({visibleItems.length})</span>
                </h1>
            </div>

            {/* Filter / Sort chips */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide py-1">
                {SORT_OPTIONS.map(opt => (
                    <FilterChip
                        key={opt.id}
                        label={opt.label}
                        active={sortBy === opt.id}
                        onClick={() => setSortBy(opt.id)}
                    />
                ))}
                <span className="w-px h-6 bg-gray-700 mx-1 shrink-0" />
                {RATING_OPTIONS.map(opt => (
                    <FilterChip
                        key={opt.id}
                        label={opt.label}
                        active={minRating === opt.id}
                        onClick={() => setMinRating(opt.id)}
                    />
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {visibleItems.map((item, index) => (
                    <CategoryItem
                        key={`${item.id}-${index}`}
                        item={item}
                        onClick={() => onItemClick(item)}
                        onFocus={() => onFocusChange?.(item)}
                    />
                ))}
            </div>

            {loadError && (
                <div className="mt-8 flex flex-col items-center gap-3 text-center text-gray-300">
                    <div>Не удалось загрузить подборку</div>
                    <button
                        className="focusable px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold focus:ring-4 focus:ring-blue-500"
                        onClick={handleRetry}
                    >
                        Повторить
                    </button>
                </div>
            )}

            {!loading && !loadError && visibleItems.length === 0 && (
                <div className="mt-8 text-center text-gray-400">Ничего не найдено</div>
            )}

            {/* sentinel */}
            {hasMore && (
                <div ref={observerTarget} className="h-20 flex items-center justify-center mt-8">
                    {loading && <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />}
                </div>
            )}
        </div>
    )
}

const CategoryItem = ({ item, onClick, onFocus }) => {
    const spatialRef = useSpatialItem('category')
    const posterUrl = getPosterUrl(item)
    // Per-image fallback chain: mirror → server proxy → wsrv → title card
    const [imgSrc, setImgSrc] = useState(posterUrl)
    const title = getTitle(item)

    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            onFocus={onFocus}
            className="focusable rounded-lg transition-all duration-200 relative overflow-hidden focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-105 focus:z-10 aspect-[2/3]"
        >
            {imgSrc ? (
                <img
                    src={imgSrc}
                    className="w-full h-full object-cover"
                    onError={() => setImgSrc(getNextImageUrl(imgSrc))}
                />
            ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center p-2 text-white text-xs text-center">{title}</div>
            )}
            {item.vote_average > 0 && (
                <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs font-bold text-white">
                    {item.vote_average.toFixed(1)}
                </div>
            )}
        </button>
    )
}

export default CategoryPage
