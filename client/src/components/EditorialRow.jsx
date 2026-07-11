import { getBackdropUrl, getTitle, getYear } from '../utils/discover'
import TVRowShell from './TVRowShell'

const getBadges = (item, qualityBadges) => {
    const title = getTitle(item)
    const originalTitle = item?.original_title || item?.original_name
    return qualityBadges?.[title] || qualityBadges?.[originalTitle] || []
}

const EditorialCard = ({ item, focused, qualityBadges, watched }) => {
    const title = getTitle(item)
    const backdropUrl = getBackdropUrl(item, 'w780')
    const badges = getBadges(item, qualityBadges)
    const rating = item.vote_average > 0 ? item.vote_average.toFixed(1) : null

    return (
        <article
            className={`relative w-[31vw] h-[220px] overflow-hidden rounded-xl border-4 bg-[#141821] ${focused ? 'border-[#63F5C7] scale-105' : 'border-transparent'}`}
            aria-label={title}
        >
            {backdropUrl && (
                <img
                    src={backdropUrl}
                    alt=""
                    loading="lazy"
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${watched ? 'opacity-50' : ''}`}
                />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080A0F] via-[#080A0F]/90 to-transparent p-4 pt-12 text-[#F4F7FA]">
                <div className="mb-1 flex items-center gap-2">
                    <h3 className="min-w-0 truncate text-lg font-extrabold">{title}</h3>
                    {watched && (
                        <span aria-label="Просмотрено" className="shrink-0 text-[#63F5C7]">✓</span>
                    )}
                </div>
                <p className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-[#F4F7FA]/75">
                    {item.overview}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs font-medium tabular-nums text-[#F4F7FA]/70">
                    {getYear(item) && <span>{getYear(item)}</span>}
                    {rating && <span className={item.vote_average < 5 ? 'text-[#FF6B6B]' : ''}>★ {rating}</span>}
                    {badges.slice(0, 2).map(badge => (
                        <span key={badge} className="rounded bg-[#F6D365] px-1.5 py-0.5 font-extrabold text-[#080A0F]">
                            {badge}
                        </span>
                    ))}
                </div>
            </div>
        </article>
    )
}

const EditorialRow = ({
    id,
    title,
    icon,
    source = 'TMDB',
    items = [],
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
        isActive={isActive}
        onSelect={onSelect}
        onFocusChange={onFocusChange}
        onNearEnd={onNearEnd}
        renderItem={(item, _index, focused) => (
            <EditorialCard
                item={item}
                focused={focused}
                qualityBadges={qualityBadges}
                watched={watchedIds?.has(item.id)}
            />
        )}
    />
)

export default EditorialRow
