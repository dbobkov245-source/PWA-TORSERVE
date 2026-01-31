import { useRef, useCallback, useEffect, useState } from 'react'
import { getPosterUrl, getTitle, getYear, DISCOVERY_CATEGORIES } from '../utils/discover'
import { reportBrokenImage, filterDiscoveryResults } from '../utils/tmdbClient'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const CategoryPage = ({
    categoryId,
    customCategory,
    items: initialItems = [],
    onItemClick
}) => {
    const [displayedItems, setDisplayedItems] = useState(initialItems)
    const [page, setPage] = useState(initialItems.length > 0 ? 1 : 0)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [imageErrors, setImageErrors] = useState(new Set())
    const observerTarget = useRef(null)
    const backRef = useSpatialItem('category')

    const category = customCategory || DISCOVERY_CATEGORIES.find(c => c.id === categoryId)

    useEffect(() => {
        setDisplayedItems(initialItems)
        setPage(initialItems.length > 0 ? 1 : 0)
        setHasMore(true)
        setImageErrors(new Set())
        hasInitiallyLoaded.current = false
    }, [categoryId, customCategory?.name])

    const loadMore = useCallback(async () => {
        if (loading || !hasMore || !category?.fetcher) return
        setLoading(true)
        try {
            const nextPage = page + 1
            const response = await category.fetcher(nextPage)
            if (response && response.results && response.results.length > 0) {
                const newItems = filterDiscoveryResults(response.results)
                if (newItems.length > 0) {
                    setDisplayedItems(prev => [...prev, ...newItems])
                }
                setPage(nextPage)
                if (response.results.length < 20) setHasMore(false)
            } else { setHasMore(false) }
        } catch (e) {
            console.error(e)
            setHasMore(false)
        } finally { setLoading(false) }
    }, [loading, hasMore, page, category])

    const hasInitiallyLoaded = useRef(false)
    useEffect(() => {
        if (page === 0 && !hasInitiallyLoaded.current && category) {
            hasInitiallyLoaded.current = true
            loadMore()
        }
    }, [category])

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
                    <span className="text-gray-500 text-lg font-normal">({displayedItems.length})</span>
                </h1>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {displayedItems.map((item, index) => (
                    <CategoryItem
                        key={`${item.id}-${index}`}
                        item={item}
                        onClick={() => onItemClick(item)}
                    />
                ))}
            </div>

            {/* sentinel */}
            {hasMore && (
                <div ref={observerTarget} className="h-20 flex items-center justify-center mt-8">
                    {loading && <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />}
                </div>
            )}
        </div>
    )
}

const CategoryItem = ({ item, onClick }) => {
    const spatialRef = useSpatialItem('category')
    const [imgErr, setImgErr] = useState(false)
    const posterUrl = getPosterUrl(item)
    const title = getTitle(item)

    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            className="focusable rounded-lg transition-all duration-200 relative overflow-hidden focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-105 focus:z-10 aspect-[2/3]"
        >
            {posterUrl && !imgErr ? (
                <img
                    src={posterUrl}
                    className="w-full h-full object-cover"
                    onError={() => setImgErr(true)}
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
