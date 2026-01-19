/**
 * SearchResultItem - Memoized search result component
 * UX-01: Prevents unnecessary re-renders of individual items
 */
import { memo, forwardRef } from 'react'

const getTagStyle = (tag) => {
    const styles = {
        '2160p': 'bg-purple-900/50 text-purple-300 border-purple-500/30',
        '1080p': 'bg-blue-900/50 text-blue-300 border-blue-500/30',
        '720p': 'bg-gray-700/50 text-gray-300 border-gray-500/30',
        'hevc': 'bg-green-900/50 text-green-300 border-green-500/30',
        'hdr': 'bg-yellow-900/50 text-yellow-300 border-yellow-500/30',
        'dv': 'bg-pink-900/50 text-pink-300 border-pink-500/30',
        'cam': 'bg-red-900/50 text-red-300 border-red-500/30'
    }
    return styles[tag] || 'bg-gray-700/50 text-gray-400 border-gray-500/30'
}

const formatRelativeDate = (timestamp) => {
    if (!timestamp) return null
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} мин`
    if (hours < 24) return `${hours} ч`
    if (days < 7) return `${days} дн`
    return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const SearchResultItem = memo(forwardRef(({
    result,
    index,
    isFocused,
    onSelect
}, ref) => {
    const { id, title, size, seeders, tracker, dateTs, tags } = result

    return (
        <div
            ref={ref}
            tabIndex={0}
            className={`flex items-start justify-between p-3 bg-gray-800 rounded-lg cursor-pointer
                       focus:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none
                       ${isFocused ? 'ring-2 ring-purple-500 bg-gray-700' : ''}`}
            onClick={() => onSelect(result)}
            role="button"
            aria-label={`${title}, ${size}, ${seeders} сидов`}
        >
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{title}</div>
                <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 mt-1">
                    <span>📀 {size}</span>
                    <span className="text-green-400">⬆ {seeders}</span>
                    {tracker && <span className="text-purple-400">{tracker}</span>}
                    {dateTs && <span className="text-gray-500">{formatRelativeDate(dateTs)}</span>}
                </div>
                {tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {tags.map(tag => (
                            <span
                                key={tag}
                                className={`px-1.5 py-0.5 rounded text-[10px] border ${getTagStyle(tag)}`}
                            >
                                {tag.toUpperCase()}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onSelect(result) }}
                className="ml-2 bg-green-600 px-2.5 py-1 rounded text-xs font-bold opacity-70 hover:opacity-100"
                tabIndex={-1}
                aria-label={`Добавить ${title}`}
            >+</button>
        </div>
    )
}))

SearchResultItem.displayName = 'SearchResultItem'

export default SearchResultItem
