/**
 * TorrentModal Component - File list and playback controls
 * Stage 6.4: Fixed episode list navigation - proper focus chain
 */
import { useState, useEffect, useRef } from 'react'
import { cleanTitle, formatSize } from '../utils/helpers'
import { getMetadata } from './Poster'

const RatingBadge = ({ rating }) => {
    if (!rating || rating === 0) return null
    const color = rating >= 7 ? 'bg-green-600' : rating >= 5 ? 'bg-yellow-600' : 'bg-red-600'
    return (
        <span className={`${color} text-white text-sm font-bold px-2 py-0.5 rounded`}>
            ⭐ {typeof rating === 'number' ? rating.toFixed(1) : rating}
        </span>
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

    // Refs
    const playBtnRef = useRef(null)
    const playAllBtnRef = useRef(null)
    const episodeListRef = useRef(null)
    const episodeRefs = useRef([])
    const expandBtnRef = useRef(null)
    const copyBtnRef = useRef(null)
    const deleteBtnRef = useRef(null)

    useEffect(() => {
        if (torrent?.name) {
            const cached = getMetadata(cleanTitle(torrent.name))
            if (cached) setMetadata(cached)
        }
    }, [torrent?.name])

    if (!torrent) return null

    const videoFiles = torrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)) || []
    const sortedVideos = [...videoFiles].sort((a, b) => a.name.localeCompare(b.name))
    const firstVideo = videoFiles[0] || torrent.files?.[0]
    const cleanedName = cleanTitle(torrent.name)

    const backdropStyle = metadata?.backdrop
        ? { backgroundImage: `url(${metadata.backdrop})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'linear-gradient(135deg, #1e3a8a 0%, #1f2937 100%)' }

    const INITIAL_EPISODES = 8
    const visibleEpisodes = episodesExpanded ? sortedVideos : sortedVideos.slice(0, INITIAL_EPISODES)
    const hasMoreEpisodes = sortedVideos.length > INITIAL_EPISODES && !episodesExpanded

    // Navigation handlers
    const handlePlayKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (videoFiles.length > 1) {
                playAllBtnRef.current?.focus()
            } else if (copyBtnRef.current) {
                copyBtnRef.current.focus()
            }
        }
    }

    const handlePlayAllKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            // Focus first episode in list
            if (episodeRefs.current[0]) {
                episodeRefs.current[0].focus()
            } else {
                copyBtnRef.current?.focus()
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            playBtnRef.current?.focus()
        }
    }

    const handleEpisodeKeyDown = (e, idx) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (idx < visibleEpisodes.length - 1) {
                episodeRefs.current[idx + 1]?.focus()
            } else if (hasMoreEpisodes) {
                expandBtnRef.current?.focus()
            } else {
                copyBtnRef.current?.focus()
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (idx > 0) {
                episodeRefs.current[idx - 1]?.focus()
            } else {
                playAllBtnRef.current?.focus() || playBtnRef.current?.focus()
            }
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const file = sortedVideos[idx]
            if (file) onPlay(torrent.infoHash, file.index, file.name)
        }
    }

    const handleExpandKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            const lastIdx = visibleEpisodes.length - 1
            if (lastIdx >= 0) episodeRefs.current[lastIdx]?.focus()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            copyBtnRef.current?.focus()
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setEpisodesExpanded(true)
            // Focus first newly visible episode after expand
            setTimeout(() => {
                if (episodeRefs.current[INITIAL_EPISODES]) {
                    episodeRefs.current[INITIAL_EPISODES].focus()
                }
            }, 50)
        }
    }

    const handleCopyKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (hasMoreEpisodes) {
                expandBtnRef.current?.focus()
            } else if (episodeRefs.current.length > 0) {
                episodeRefs.current[visibleEpisodes.length - 1]?.focus()
            } else if (playAllBtnRef.current) {
                playAllBtnRef.current.focus()
            } else {
                playBtnRef.current?.focus()
            }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            deleteBtnRef.current?.focus()
        }
    }

    const handleDeleteKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            copyBtnRef.current?.focus()
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            copyBtnRef.current?.focus()
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-2xl w-full max-w-lg max-h-[85vh] shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Fixed Header */}
                <div
                    className="h-32 shrink-0 relative flex items-end overflow-hidden rounded-t-2xl"
                    style={backdropStyle}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 bg-black/50 rounded-full w-8 h-8 text-white 
                                   hover:bg-black/70 focus:ring-2 focus:ring-white focus:outline-none"
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
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    {metadata?.overview && (
                        <div className="mb-3">
                            <p className={`text-xs text-gray-400 ${showFullOverview ? '' : 'line-clamp-2'}`}>{metadata.overview}</p>
                            {metadata.overview.length > 80 && (
                                <button onClick={() => setShowFullOverview(!showFullOverview)} className="text-purple-400 text-xs">{showFullOverview ? '← Свернуть' : 'Ещё →'}</button>
                            )}
                        </div>
                    )}

                    {/* Play button */}
                    <button
                        ref={playBtnRef}
                        autoFocus
                        onClick={() => firstVideo && onPlay(torrent.infoHash, firstVideo.index, firstVideo.name)}
                        onKeyDown={handlePlayKeyDown}
                        className="w-full bg-white text-black py-3 rounded font-bold focus:bg-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none mb-2"
                    >▶ Play</button>

                    {/* Play All */}
                    {videoFiles.length > 1 && (
                        <button
                            ref={playAllBtnRef}
                            onClick={() => onPlayAll(torrent)}
                            onKeyDown={handlePlayAllKeyDown}
                            className="w-full bg-blue-600 text-white py-2 rounded font-bold focus:bg-blue-500 focus:ring-2 focus:ring-blue-400 focus:outline-none mb-2"
                        >📺 Play All ({videoFiles.length})</button>
                    )}

                    {/* Episode List */}
                    {videoFiles.length > 1 && (
                        <div ref={episodeListRef} className="bg-gray-900 rounded-lg overflow-hidden mb-2">
                            <div className="px-3 py-2 bg-gray-800 text-gray-400 text-sm flex items-center justify-between">
                                <span>📋 Серии ({videoFiles.length})</span>
                            </div>

                            <div className="max-h-[28vh] overflow-y-auto">
                                {visibleEpisodes.map((file, idx) => (
                                    <button
                                        key={file.index}
                                        ref={el => episodeRefs.current[idx] = el}
                                        onClick={() => onPlay(torrent.infoHash, file.index, file.name)}
                                        onKeyDown={(e) => handleEpisodeKeyDown(e, idx)}
                                        className="w-full px-3 py-2 text-left border-t border-gray-800 
                                                   hover:bg-gray-800 focus:bg-blue-600 focus:text-white focus:outline-none 
                                                   flex items-center gap-2 text-sm"
                                    >
                                        <span className="text-blue-400 font-mono text-xs w-5">{idx + 1}</span>
                                        <span className="flex-1 text-gray-300 truncate">{cleanTitle(file.name) || file.name}</span>
                                        <span className="text-xs text-gray-500">{formatSize(file.length)}</span>
                                    </button>
                                ))}

                                {hasMoreEpisodes && (
                                    <button
                                        ref={expandBtnRef}
                                        onClick={() => setEpisodesExpanded(true)}
                                        onKeyDown={handleExpandKeyDown}
                                        className="w-full px-3 py-2 text-center text-purple-400 text-sm border-t border-gray-800
                                                   hover:bg-gray-800 focus:bg-purple-900 focus:text-white focus:outline-none"
                                    >▼ Ещё {sortedVideos.length - INITIAL_EPISODES} серий</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed Footer */}
                <div className="shrink-0 p-4 pt-2 flex gap-2 border-t border-gray-800">
                    <button
                        ref={copyBtnRef}
                        onClick={() => firstVideo && onCopyUrl(torrent.infoHash, firstVideo.index)}
                        onKeyDown={handleCopyKeyDown}
                        className="flex-1 bg-gray-800 text-gray-300 py-2.5 rounded font-medium focus:ring-2 focus:ring-gray-400 focus:outline-none text-sm"
                    >📋 Copy</button>
                    <button
                        ref={deleteBtnRef}
                        onClick={() => onDelete(torrent.infoHash)}
                        onKeyDown={handleDeleteKeyDown}
                        className="flex-1 bg-red-900/50 text-red-400 py-2.5 rounded font-medium focus:ring-2 focus:ring-red-400 focus:outline-none text-sm"
                    >🗑 Delete</button>
                </div>
            </div>
        </div>
    )
}

export default TorrentModal
