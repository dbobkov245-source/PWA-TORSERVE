import { useEffect, useRef, useCallback } from 'react'
import useTVNavigation from '../hooks/useTVNavigation'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const TVRowItem = ({ item, index, isFocused, setFocusedIndex, registerRef, renderItem }) => {
    const spatialRef = useSpatialItem('main')
    const setComboRef = useCallback((node) => {
        spatialRef(node)
        registerRef(index, node)
    }, [index, registerRef, spatialRef])

    return (
        <div
            ref={setComboRef}
            onFocus={() => setFocusedIndex(index)}
            tabIndex={isFocused ? 0 : -1}
            className={`focusable snap-item shrink-0 outline-none ${isFocused ? 'focused' : ''}`}
        >
            {renderItem(item, index, isFocused)}
        </div>
    )
}

const TVRowShell = ({
    id,
    title,
    icon,
    source,
    items = [],
    initialIndex = 0,
    isActive = true,
    onSelect,
    onFocusChange,
    onNearEnd,
    itemWidth = '130px',
    itemHalfWidth = '65px',
    renderItem
}) => {
    const refs = useRef([])
    const lastReportedIndexRef = useRef(null)
    const { focusedIndex, setFocusedIndex, containerProps, isFocused } = useTVNavigation({
        itemCount: items.length,
        columns: Math.max(items.length, 1),
        itemRefs: refs,
        initialIndex,
        trapFocus: false,
        isActive,
        onSelect: index => onSelect?.(items[index])
    })

    useEffect(() => {
        if (focusedIndex < 0 || !items[focusedIndex]) return

        const previousIndex = lastReportedIndexRef.current
        if (previousIndex === focusedIndex) return
        lastReportedIndexRef.current = focusedIndex
        onFocusChange?.(items[focusedIndex], focusedIndex)
        const moved = previousIndex !== null
        if (moved && focusedIndex >= items.length - 3) onNearEnd?.(focusedIndex)
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
                className="snap-container tv-center-row gap-4 py-6 -my-4 overflow-x-auto scrollbar-hide"
                style={{
                    '--tv-row-card-width': itemWidth,
                    '--tv-row-card-half-width': itemHalfWidth
                }}
            >
                <div className="tv-row-edge-spacer tv-row-leading-spacer" aria-hidden="true" />

                {items.map((item, index) => (
                    <TVRowItem
                        key={item.id ?? index}
                        item={item}
                        index={index}
                        isFocused={isFocused(index)}
                        setFocusedIndex={setFocusedIndex}
                        registerRef={(idx, node) => { refs.current[idx] = node }}
                        renderItem={renderItem}
                    />
                ))}

                <div className="tv-row-edge-spacer tv-row-trailing-spacer" aria-hidden="true" />
            </div>
        </section>
    )
}

export default TVRowShell
