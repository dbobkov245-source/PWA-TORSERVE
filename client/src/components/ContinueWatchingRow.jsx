import { useState, useEffect } from 'react'
import { cleanTitle } from '../utils/helpers'
import { getMetadata, resolveMetadata, getNextImageUrl } from '../utils/tmdbClient'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

function formatRemaining(position, duration) {
    if (!duration || duration <= position) return null
    const minutes = Math.round((duration - position) / 60000)
    if (minutes < 1) return null
    if (minutes < 60) return `осталось ${minutes} мин`
    return `осталось ${Math.floor(minutes / 60)} ч ${minutes % 60} мин`
}

const ResumeCard = ({ item, onResume }) => {
    const spatialRef = useSpatialItem('main')
    const cleanedName = cleanTitle(item.torrentName || item.fileName || '')
    const [poster, setPoster] = useState(() => getMetadata(cleanedName)?.poster || null)
    const progress = item.duration > 0 ? Math.min(item.position / item.duration, 1) : 0
    const remaining = formatRemaining(item.position, item.duration)

    useEffect(() => {
        if (poster || !cleanedName) return
        let mounted = true
        resolveMetadata(cleanedName)
            .then((meta) => { if (mounted && meta?.poster) setPoster(meta.poster) })
            .catch(() => {})
        return () => { mounted = false }
    }, [cleanedName, poster])

    return (
        <div
            ref={spatialRef}
            role="button"
            tabIndex={0}
            className="focusable tv-card snap-item w-[200px] aspect-video rounded-lg bg-gray-800 border border-transparent overflow-hidden relative shrink-0"
            onClick={() => onResume(item)}
            onKeyDown={(e) => { if (e.key === 'Enter') onResume(item) }}
        >
            {poster ? (
                <img
                    src={poster}
                    alt={cleanedName}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                    onError={(e) => {
                        const next = getNextImageUrl(e.currentTarget.src)
                        if (next) e.currentTarget.src = next
                        else setPoster(null)
                    }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-white bg-gradient-to-br from-purple-900 to-gray-900">
                    {cleanedName}
                </div>
            )}

            {/* Bottom gradient + meta */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-2 pt-6 pb-1.5 pointer-events-none">
                <div className="text-white text-xs font-semibold truncate">{cleanedName}</div>
                {remaining && <div className="text-gray-300 text-[10px]">{remaining}</div>}
            </div>

            {/* Progress bar */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-700/80 pointer-events-none">
                <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                />
            </div>

            {/* Play hint */}
            <div className="absolute top-1.5 right-1.5 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs pointer-events-none">▶</div>
        </div>
    )
}

/**
 * "Продолжить просмотр" — home row built from unfinished playback sessions.
 * Same horizontal-scroll pattern as HomeRow; Enter resumes from position.
 */
const ContinueWatchingRow = ({ items = [], onResume }) => {
    if (items.length === 0) return null

    return (
        <div className="home-row mb-6">
            <div className="flex items-center justify-between px-8 mb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
                    <span className="text-2xl">⏯</span>
                    Продолжить просмотр
                    <span className="text-gray-500 text-sm font-normal">({items.length})</span>
                </h2>
            </div>
            <div className="snap-container px-8 gap-4 overflow-x-auto scroll-smooth scrollbar-hide py-6 -my-4 flex">
                {items.map((item) => (
                    <ResumeCard
                        key={`${item.infoHash}:${item.fileIndex}`}
                        item={item}
                        onResume={onResume}
                    />
                ))}
            </div>
        </div>
    )
}

export default ContinueWatchingRow
