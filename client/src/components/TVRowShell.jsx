import { useEffect, useRef } from 'react'
import useTVNavigation from '../hooks/useTVNavigation'

const TVRowShell = ({
    id,
    title,
    icon,
    source,
    items = [],
    isActive = true,
    onSelect,
    onFocusChange,
    onNearEnd,
    renderItem
}) => {
    const refs = useRef([])
    const { focusedIndex, containerProps, isFocused } = useTVNavigation({
        itemCount: items.length,
        columns: Math.max(items.length, 1),
        itemRefs: refs,
        initialIndex: 0,
        trapFocus: false,
        isActive,
        onSelect: index => onSelect?.(items[index])
    })

    useEffect(() => {
        if (focusedIndex < 0 || !items[focusedIndex]) return

        onFocusChange?.(items[focusedIndex], focusedIndex)
        if (focusedIndex >= items.length - 3) onNearEnd?.(focusedIndex)
    }, [focusedIndex, items, onFocusChange, onNearEnd])

    if (items.length === 0) return null

    return (
        <section className="home-row mb-6" data-row-id={id}>
            <header className="px-8 mb-3 flex items-center gap-3">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#F4F7FA]">
                    {icon && <span aria-hidden="true">{icon}</span>}
                    {title}
                </h2>
                {source && (
                    <span className="rounded bg-[#141821] px-2 py-1 text-[11px] font-medium tracking-[0.14em] text-[#F4F7FA]/60 uppercase">
                        {source}
                    </span>
                )}
            </header>
            <div
                {...containerProps}
                role="group"
                aria-label={title}
                className="snap-container px-8 gap-4 py-6 -my-4 overflow-x-auto scrollbar-hide"
            >
                {items.map((item, index) => (
                    <div
                        key={item.id ?? index}
                        ref={element => { refs.current[index] = element }}
                        tabIndex={isFocused(index) ? 0 : -1}
                        className={`snap-item shrink-0 outline-none ${isFocused(index) ? 'focused' : ''}`}
                    >
                        {renderItem(item, index, isFocused(index))}
                    </div>
                ))}
            </div>
        </section>
    )
}

export default TVRowShell
