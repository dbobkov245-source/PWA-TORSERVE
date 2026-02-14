/**
 * Sidebar.jsx – ADR-003 Compliant "Dumb" Component
 * 
 * This component:
 * - ❌ Does NOT handle keyboard navigation
 * - ❌ Does NOT use useSpatialItem/useSpatialNavigation
 * - ❌ Does NOT store focus state
 * - ✅ Renders items based on props only
 * - ✅ Calls onSelect callback when item clicked
 * - ✅ Scrolls focused item into view (ADR-003 compliant: visual effect only)
 */

import React, { useRef, useEffect } from 'react'

const Sidebar = ({
    isOpen = false,
    focusedIndex = 0,
    onSelect,
    onClose
}) => {
    const years = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => 2026 - i)
    const itemRefs = useRef([])

    const menuItems = [
        { id: 'close', icon: '❌', label: 'Закрыть' },
        { id: 'search', icon: '🔍', label: 'Поиск' },
        { id: 'filter_year_2025', icon: '🎬', label: 'Новые фильмы 2025', type: 'year', year: 2025 },
        { id: 'tv_new', icon: '📺', label: 'Новые сериалы', categoryId: 'tv' },
        { id: 'cartoons', icon: '🎨', label: 'Мультфильмы', categoryId: 'genre_16' },
        { id: 'anime', icon: '🍥', label: 'Аниме', categoryId: 'genre_16' },
        { id: 'top_rated', icon: '⭐', label: 'Лучшие фильмы', categoryId: 'top' },
        { id: 'favorites', icon: '❤️', label: 'Избранное' },
        { id: 'history', icon: '🕒', label: 'История' },
        { id: 'ai_picks', icon: '🤖', label: 'Подборки AI' },
    ]

    // Combine menu items and years into single list for index-based focus
    const allItems = [
        ...menuItems,
        ...years.map(year => ({ id: `year_${year}`, icon: '📅', label: String(year), type: 'year', year }))
    ]

    // Scroll focused item into view when focusedIndex changes
    useEffect(() => {
        if (isOpen && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            })
        }
    }, [focusedIndex, isOpen])

    return (
        <div
            className={`
                fixed left-0 top-0 bottom-0 z-40 bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border-r border-white/10
                transition-all duration-300 ease-out flex flex-col py-6
                ${isOpen ? 'w-64 translate-x-0 shadow-2xl' : 'w-0 -translate-x-full overflow-hidden'}
            `}
        >
            {/* Logo */}
            <div className="mb-6 px-0 flex justify-center sticky top-0 bg-black z-10 w-full">
                <span className="text-2xl">🌀</span>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2">
                {allItems.map((item, index) => (
                    <SidebarItem
                        key={item.id}
                        ref={el => itemRefs.current[index] = el}
                        item={item}
                        isFocused={isOpen && index === focusedIndex}
                        onClick={() => {
                            if (item.id === 'close') onClose?.()
                            else onSelect?.(item)
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

// Get total items count for navigation bounds
Sidebar.getItemsCount = () => {
    const menuCount = 10 // menu items
    const yearsCount = 2026 - 1980 + 1
    return menuCount + yearsCount
}

const SidebarItem = React.forwardRef(({ item, isFocused, onClick }, ref) => {
    return (
        <button
            ref={ref}
            className={`
                flex items-center rounded-lg mb-2 p-3 w-full text-left 
                transition-all duration-200
                ${isFocused
                    ? 'bg-white/10 text-white border-l-4 border-blue-500 pl-2'
                    : 'text-gray-400 hover:text-white border-l-4 border-transparent pl-2'
                }
            `}
            onClick={onClick}
            data-focused={isFocused}
        >
            <span className="text-xl min-w-[24px] text-center">{item.icon}</span>
            <span className="ml-4 font-medium whitespace-nowrap overflow-hidden">
                {item.label}
            </span>
        </button>
    )
})

export default Sidebar
