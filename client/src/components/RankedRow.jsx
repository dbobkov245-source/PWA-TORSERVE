import { useState } from 'react'
import { getBackdropUrl, getTitle } from '../utils/discover'
import { getNextImageUrl, reportBrokenImage } from '../utils/tmdbClient'
import TVRowShell from './TVRowShell'

const RankedCard = ({ item, index, focused, qualityBadges, watched }) => {
    const title = getTitle(item)
    const originalTitle = item?.original_title || item?.original_name
    const badges = qualityBadges?.[title] || qualityBadges?.[originalTitle] || []
    const rank = item.rank || index + 1
    const backdropUrl = getBackdropUrl(item, 'w780')
    const [imageState, setImageState] = useState({ origin: backdropUrl, src: backdropUrl })
    const imageSrc = imageState.origin === backdropUrl ? imageState.src : backdropUrl

    const handleImageError = () => {
        if (!imageSrc) return

        reportBrokenImage(imageSrc)
        setImageState({ origin: backdropUrl, src: getNextImageUrl(imageSrc) })
    }

    return (
        <article className="relative h-[180px] w-[300px] pl-12" aria-label={title}>
            <span
                aria-label={`Место ${rank}`}
                className="absolute bottom-[-10px] left-0 z-10 w-24 text-right text-[112px] font-extrabold leading-none tabular-nums text-[#080A0F] [-webkit-text-stroke:2px_#F4F7FA]"
            >
                {rank}
            </span>
            <div className={`relative h-full w-full overflow-hidden rounded-xl border-4 bg-[#141821] ${focused ? 'border-[#63F5C7] scale-105 shadow-[0_12px_28px_rgba(0,0,0,0.55)]' : 'border-transparent'}`}>
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt=""
                        loading="lazy"
                        className={`absolute inset-0 h-full w-full object-cover pointer-events-none ${watched ? 'opacity-50' : ''}`}
                        onError={handleImageError}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-base font-extrabold text-[#F4F7FA]/70">
                        {title}
                    </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080A0F] via-[#080A0F]/85 to-transparent p-3 pt-10 text-[#F4F7FA]">
                    <div className="flex items-center gap-2">
                        <h3 className="min-w-0 flex-1 truncate text-base font-extrabold">{title}</h3>
                        {watched && <span aria-label="Просмотрено" className="text-[#63F5C7]">✓</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs font-medium tabular-nums">
                        {item.vote_average > 0 && (
                            <span className={item.vote_average < 5 ? 'text-[#FF6B6B]' : 'text-[#F4F7FA]/70'}>
                                ★ {item.vote_average.toFixed(1)}
                            </span>
                        )}
                        {badges.slice(0, 2).map(badge => (
                            <span key={badge} className="rounded bg-[#F6D365] px-1.5 py-0.5 font-extrabold text-[#080A0F]">
                                {badge}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </article>
    )
}

const RankedRow = ({
    id,
    title,
    icon,
    source = 'Trakt',
    items = [],
    initialIndex = 0,
    isActive,
    onSelect,
    onFocusChange,
    onNearEnd,
    qualityBadges,
    watchedIds
}) => (
    <TVRowShell
        id={id}
        title={title}
        icon={icon}
        source={source}
        items={items}
        initialIndex={initialIndex}
        isActive={isActive}
        onSelect={onSelect}
        onFocusChange={onFocusChange}
        onNearEnd={onNearEnd}
        renderItem={(item, index, focused) => (
            <RankedCard
                item={item}
                index={index}
                focused={focused}
                qualityBadges={qualityBadges}
                watched={watchedIds?.has(item.id)}
            />
        )}
    />
)

export default RankedRow
