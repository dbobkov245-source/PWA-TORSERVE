import { useEffect, useRef, useState, useCallback, memo } from 'react'
import useTVNavigation from '../hooks/useTVNavigation'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

// memo + stable props: a D-Pad move re-renders the shell, and without this
// every card in the row re-rendered (and re-registered itself with the
// spatial engine) on each keypress. Callers must pass a stable renderItem.
const TVRowItem = memo(({ item, index, isFocused, showFocus, setFocusedIndex, registerRef, renderItem, onSelect, focusRing }) => {
    const spatialRef = useSpatialItem('main')
    const setComboRef = useCallback((node) => {
        spatialRef(node)
        registerRef(index, node)
    }, [index, registerRef, spatialRef])

    return (
        <div
            ref={setComboRef}
            onFocus={() => setFocusedIndex(index)}
            onClick={() => onSelect?.(item)}
            tabIndex={isFocused ? 0 : -1}
            className={`focusable snap-item shrink-0 outline-none ${showFocus ? 'focused' : ''} ${focusRing ? '' : 'tv-no-focus-ring'}`}
        >
            {renderItem(item, index, showFocus)}
        </div>
    )
})

TVRowItem.displayName = 'TVRowItem'

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
    // Rows that paint their own focus treatment opt out of the global
    // .focusable:focus ring (see index.css).
    focusRing = true,
    renderItem
}) => {
    const refs = useRef([])
    const lastReportedIndexRef = useRef(null)
    // Each row remembers its own focusedIndex, so without this every row on
    // screen lit a card at once and the stale ones read as a stuck cursor.
    // Track whether the focus is actually inside this row.
    const [hasFocusWithin, setHasFocusWithin] = useState(false)
    const handleRowFocus = useCallback(() => setHasFocusWithin(true), [])
    const handleRowBlur = useCallback((event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return
        setHasFocusWithin(false)
    }, [])
    const registerRef = useCallback((index, node) => { refs.current[index] = node }, [])
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
        if (!isActive || !hasFocusWithin || focusedIndex < 0 || !items[focusedIndex]) return

        const previousIndex = lastReportedIndexRef.current
        if (previousIndex === focusedIndex) return
        lastReportedIndexRef.current = focusedIndex
        onFocusChange?.(items[focusedIndex], focusedIndex)
        const moved = previousIndex !== null
        if (moved && focusedIndex >= items.length - 3) onNearEnd?.(focusedIndex)
    }, [focusedIndex, items, onFocusChange, onNearEnd, isActive, hasFocusWithin])

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
                data-tv-local-navigation
                onFocus={handleRowFocus}
                onBlur={handleRowBlur}
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
                        showFocus={isActive && hasFocusWithin && isFocused(index)}
                        setFocusedIndex={setFocusedIndex}
                        registerRef={registerRef}
                        renderItem={renderItem}
                        onSelect={isActive ? onSelect : undefined}
                        focusRing={focusRing}
                    />
                ))}

                <div className="tv-row-edge-spacer tv-row-trailing-spacer" aria-hidden="true" />
            </div>
        </section>
    )
}

export default TVRowShell
