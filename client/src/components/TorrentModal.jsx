import { useState, useEffect } from 'react'
import { cleanTitle, formatSize, organizeFiles } from '../utils/helpers'
import { getMetadata } from '../utils/tmdbClient'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const RatingBadge = ({ rating }) => {
    if (!rating || rating === 0) return null
    const color = rating >= 7 ? 'bg-green-600' : rating >= 5 ? 'bg-yellow-600' : 'bg-red-600'
    return (
        <span className={`${color} text-white text-sm font-bold px-2 py-0.5 rounded`}>
            ⭐ {typeof rating === 'number' ? rating.toFixed(1) : rating}
        </span>
    )
}

const EpisodeItem = ({ file, idx, onClick }) => {
    const spatialRef = useSpatialItem('modal')
    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            className="focusable w-full px-3 py-2 text-left border-t border-gray-800 focus:bg-blue-600 focus:text-white flex items-center gap-2 text-sm"
        >
            {idx !== undefined && <span className="text-blue-400 font-mono text-xs w-5">{idx + 1}</span>}
            <span className="flex-1 text-gray-300 truncate">{cleanTitle(file.name) || file.name}</span>
            <span className="text-xs text-gray-500">{formatSize(file.length)}</span>
        </button>
    )
}

const TorrentModal = ({
    torrent,
    onClose,
    onPlay,
    onPlayAll,
    onCopyUrl,
    onDelete
}) => {
    const [showFullOverview, setShowFullOverview] = useState(false)
    const [metadata, setMetadata] = useState(null)
    const [episodesExpanded, setEpisodesExpanded] = useState(false)
    const [allowInteraction, setAllowInteraction] = useState(false)

    // Spatial Refs
    const closeBtnRef = useSpatialItem('modal')
    const overviewToggleRef = useSpatialItem('modal')
    const playBtnRef = useSpatialItem('modal')
    const playAllBtnRef = useSpatialItem('modal')
    const expandBtnRef = useSpatialItem('modal')
    const copyBtnRef = useSpatialItem('modal')
    const deleteBtnRef = useSpatialItem('modal')

    useEffect(() => {
        // Prevent phantom clicks from previous screen
        const timer = setTimeout(() => setAllowInteraction(true), 500)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (torrent?.name) {
            const cached = getMetadata(cleanTitle(torrent.name))
            if (cached) setMetadata(cached)
        }
    }, [torrent?.name])

    if (!torrent) return null

    const videoFiles = torrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)) || []
    const { episodes: sortedEpisodes, extras: sortedExtras } = organizeFiles(videoFiles)
    const mainList = sortedEpisodes.length > 0 ? sortedEpisodes : sortedEpisodes.concat(sortedExtras)
    const extraList = sortedEpisodes.length > 0 ? sortedExtras : []

    const firstVideo = mainList[0] || torrent.files?.[0]
    const cleanedName = cleanTitle(torrent.name)

    const backdropStyle = metadata?.backdrop
        ? { backgroundImage: `url(${metadata.backdrop})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'linear-gradient(135deg, #1e3a8a 0%, #1f2937 100%)' }

    const INITIAL_EPISODES = 8
    const visibleEpisodes = episodesExpanded ? mainList : mainList.slice(0, INITIAL_EPISODES)
    const hasMoreEpisodes = mainList.length > INITIAL_EPISODES && !episodesExpanded

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-2xl w-full max-w-lg max-h-[85vh] shadow-2xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Fixed Header */}
                <div
                    className="h-32 shrink-0 relative flex items-end overflow-hidden"
                    style={backdropStyle}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <button
                        ref={closeBtnRef}
                        onClick={onClose}
                        className="focusable absolute top-3 right-3 bg-black/50 rounded-full w-8 h-8 text-white focus:bg-white focus:text-black"
                    >✕</button>
                    <div className="relative z-10 p-4 w-full">
                        <div className="flex gap-2 mb-1">
                            <RatingBadge rating={metadata?.rating} />
                            {metadata?.year && <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">{metadata.year}</span>}
                        </div>
                        <h2 className="text-lg font-bold text-white drop-shadow-lg line-clamp-2">{metadata?.title || cleanedName}</h2>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0 custom-scrollbar">
                    {metadata?.overview && (
                        <div className="mb-3">
                            <p className={`text-xs text-gray-400 ${showFullOverview ? '' : 'line-clamp-2'}`}>{metadata.overview}</p>
                            {metadata.overview.length > 80 && (
                                <button
                                    ref={overviewToggleRef}
                                    onClick={() => setShowFullOverview(!showFullOverview)}
                                    className="focusable text-purple-400 text-xs p-1 rounded hover:bg-white/5"
                                >
                                    {showFullOverview ? '← Свернуть' : 'Ещё →'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Play button */}
                    <button
                        ref={playBtnRef}
                        onClick={() => allowInteraction && firstVideo && onPlay(torrent.infoHash, firstVideo.index, firstVideo.name)}
                        className={`focusable w-full bg-white text-black py-3 rounded font-bold focus:bg-yellow-400 mb-2 ${!allowInteraction ? 'opacity-50' : ''}`}
                    >▶ Play</button>

                    {/* Play All */}
                    {mainList.length > 1 && (
                        <button
                            ref={playAllBtnRef}
                            onClick={() => allowInteraction && onPlayAll(torrent)}
                            className="focusable w-full bg-blue-600 text-white py-2 rounded font-bold focus:bg-blue-500 mb-2"
                        >📺 Play All ({mainList.length})</button>
                    )}

                    {/* Episode List */}
                    {videoFiles.length > 1 && (
                        <div className="bg-gray-900 rounded-lg overflow-hidden mb-2">
                            <div className="px-3 py-2 bg-gray-800 text-gray-400 text-sm flex items-center justify-between">
                                <span>📋 Серии ({mainList.length})</span>
                            </div>

                            <div className="max-h-[28vh] overflow-y-auto custom-scrollbar">
                                {visibleEpisodes.map((file, idx) => (
                                    <EpisodeItem
                                        key={file.index}
                                        idx={idx}
                                        file={file}
                                        onClick={() => onPlay(torrent.infoHash, file.index, file.name)}
                                    />
                                ))}

                                {hasMoreEpisodes && (
                                    <button
                                        ref={expandBtnRef}
                                        onClick={() => setEpisodesExpanded(true)}
                                        className="focusable w-full px-3 py-2 text-center text-purple-400 text-sm border-t border-gray-800 focus:bg-purple-900 focus:text-white"
                                    >▼ Ещё {mainList.length - INITIAL_EPISODES} серий</button>
                                )}

                                {extraList.length > 0 && (
                                    <div className="border-t border-gray-800">
                                        <div className="px-3 py-2 text-gray-500 text-xs uppercase tracking-wider bg-black/20">
                                            🎁 Дополнительно
                                        </div>
                                        {extraList.map((file) => (
                                            <EpisodeItem
                                                key={file.index}
                                                file={file}
                                                onClick={() => onPlay(torrent.infoHash, file.index, file.name)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="shrink-0 p-4 pt-2 flex gap-2 border-t border-gray-800 bg-black/20">
                    <button
                        ref={copyBtnRef}
                        onClick={() => firstVideo && onCopyUrl(torrent.infoHash, firstVideo.index)}
                        className="focusable flex-1 bg-gray-800 text-gray-300 py-2.5 rounded font-medium focus:bg-white focus:text-black text-sm"
                    >📋 Copy</button>
                    <button
                        ref={deleteBtnRef}
                        onClick={() => onDelete(torrent.infoHash)}
                        className="focusable flex-1 bg-red-900/50 text-red-500 py-2.5 rounded font-medium focus:bg-red-600 focus:text-white text-sm"
                    >🗑 Delete</button>
                </div>
            </div>
        </div>
    )
}

export default TorrentModal
