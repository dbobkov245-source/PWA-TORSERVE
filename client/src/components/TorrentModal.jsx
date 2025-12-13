/**
 * TorrentModal Component - File list and playback controls
 */
import { cleanTitle, formatSize } from '../utils/helpers'

const TorrentModal = ({
    torrent,
    onClose,
    onPlay,
    onPlayAll,
    onCopyUrl,
    onDelete
}) => {
    if (!torrent) return null

    const videoFiles = torrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)) || []
    const firstVideo = videoFiles[0] || torrent.files?.[0]

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="h-32 bg-gradient-to-br from-blue-900 to-gray-900 p-6 flex items-end relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/40 rounded-full p-2 text-white hover:bg-black/60 transition-colors"
                    >
                        ✕
                    </button>
                    <h2 className="text-2xl font-bold leading-tight shadow-black drop-shadow-lg line-clamp-2">
                        {cleanTitle(torrent.name)}
                    </h2>
                </div>

                <div className="p-6">
                    {/* Original name */}
                    <div className="text-sm text-gray-400 mb-6 font-mono break-all text-xs border-l-2 border-gray-700 pl-3">
                        {torrent.name}
                    </div>

                    <div className="space-y-3">
                        {/* Play button */}
                        <button
                            autoFocus
                            onClick={() => {
                                if (firstVideo) onPlay(torrent.infoHash, firstVideo.index, firstVideo.name)
                                else alert("No video files recognized")
                            }}
                            className="w-full bg-white text-black py-4 rounded font-bold hover:bg-gray-200 focus:bg-yellow-400 text-lg transition-colors flex items-center justify-center gap-2"
                        >
                            ▶ Play
                        </button>

                        {/* Play All button - only show if multiple video files */}
                        {videoFiles.length > 1 && (
                            <button
                                onClick={() => onPlayAll(torrent)}
                                className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 focus:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                            >
                                📺 Play All ({videoFiles.length} episodes)
                            </button>
                        )}

                        {/* Episode List - TV Remote Friendly (no scroll container) */}
                        {videoFiles.length > 1 && (
                            <div className="bg-gray-900 rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-gray-800 text-gray-400 text-sm font-medium">
                                    📋 Выбор серии ({videoFiles.length})
                                </div>
                                {videoFiles
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .slice(0, 20) // Limit to 20 to avoid huge lists
                                    .map((file, idx) => (
                                        <button
                                            key={file.index}
                                            onClick={() => onPlay(torrent.infoHash, file.index, file.name)}
                                            className="w-full px-3 py-3 text-left border-t border-gray-800 hover:bg-gray-800 focus:bg-blue-600 focus:text-white focus:outline-none transition-colors flex items-center gap-3"
                                        >
                                            <span className="text-blue-400 font-mono text-sm w-8 focus:text-white">{idx + 1}</span>
                                            <span className="flex-1 text-sm text-gray-300 truncate">{cleanTitle(file.name) || file.name}</span>
                                            <span className="text-xs text-gray-500">{formatSize(file.length)}</span>
                                        </button>
                                    ))}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (firstVideo) onCopyUrl(torrent.infoHash, firstVideo.index)
                                }}
                                className="flex-1 bg-gray-800 text-gray-300 py-3 rounded font-medium hover:bg-gray-700"
                            >
                                Copy Link
                            </button>
                            <button
                                onClick={() => onDelete(torrent.infoHash)}
                                className="flex-1 bg-gray-800 text-red-400 py-3 rounded font-medium hover:bg-red-900/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TorrentModal
