import { useState, useEffect } from 'react'
import { cleanTitle, formatSize, formatSpeed, formatEta, getGradient, extractQualityBadges } from '../utils/helpers'
import { getMetadata, resolveMetadata } from '../utils/tmdbClient'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const Poster = ({ name, onClick, progress, peers, isReady, size, downloadSpeed, downloaded, eta, newFilesCount }) => {
    const spatialRef = useSpatialItem('main')
    const [bgImage, setBgImage] = useState(null)
    const cleanedName = cleanTitle(name)

    useEffect(() => {
        if (!cleanedName) return

        let isMounted = true

        const cached = getMetadata(cleanedName)
        if (cached?.poster) {
            setBgImage(cached.poster)
        }

        const fetchImage = async () => {
            try {
                const metadata = await resolveMetadata(cleanedName)
                if (isMounted && metadata?.poster) {
                    setBgImage(metadata.poster)
                }
            } catch (err) {
                console.warn('[Poster] Load failed:', cleanedName, err)
            }
        }

        fetchImage()

        return () => { isMounted = false }
    }, [cleanedName])

    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            className={`
          focusable relative group aspect-[2/3] rounded-xl overflow-hidden shadow-xl
          transition-all duration-300
          focus:scale-105 focus:ring-4 focus:ring-blue-500 focus:z-20 outline-none
          hover:scale-105
          bg-gray-800
        `}
            style={{
                background: !bgImage ? getGradient(name) : undefined,
                boxSizing: 'border-box'
            }}
        >
            {bgImage ? (
                <img
                    src={bgImage}
                    alt={name}
                    className="w-full h-full object-cover transition-opacity duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={() => setBgImage(null)}
                />
            ) : (
                <>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-10 -left-10 w-24 h-24 bg-black/20 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                        <h3 className="text-gray-100 font-bold text-lg leading-snug drop-shadow-lg line-clamp-4 font-sans tracking-wide">
                            {cleanedName || name}
                        </h3>
                    </div>
                </>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10 flex flex-col justify-end p-3 text-left">
                {/* Quality badges - top left */}
                <div className="absolute top-2 left-2 flex gap-0.5 flex-wrap max-w-[60%]">
                    {extractQualityBadges(name).map((badge, i) => (
                        <span key={i} className={`${badge.color} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm`}>
                            {badge.label}
                        </span>
                    ))}
                </div>

                {/* Status badges - top right */}
                <div className="absolute top-2 right-2 flex gap-1">
                    {newFilesCount > 0 && (
                        <span className="bg-purple-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm animate-pulse">
                            🆕 {newFilesCount} NEW
                        </span>
                    )}
                    {isReady ? (
                        <span className="bg-green-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">READY</span>
                    ) : (
                        <span className="bg-yellow-500 text-black text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">{Math.round(progress * 100)}%</span>
                    )}
                </div>

                <div className="text-xs text-gray-400 flex flex-col gap-1 mt-auto">
                    {!isReady && downloaded > 0 && (
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-blue-400">
                                {formatSize(downloaded)} / {formatSize(size)}
                            </span>
                            {eta > 0 && (
                                <span className="text-yellow-400">⏱ {formatEta(eta)}</span>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                            {peers}
                        </span>
                        {isReady && size > 0 && (
                            <span className="text-gray-500">{formatSize(size)}</span>
                        )}
                        {!isReady && downloadSpeed > 0 && (
                            <span className="text-green-400">↓{formatSpeed(downloadSpeed)}</span>
                        )}
                    </div>

                    {!isReady && progress > 0 && (
                        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div style={{ width: `${progress * 100}%` }} className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300" />
                        </div>
                    )}
                </div>
            </div>
        </button>
    )
}

export default Poster
