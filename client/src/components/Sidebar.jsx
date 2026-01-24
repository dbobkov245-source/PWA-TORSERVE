import React, { useState, useRef, useEffect } from 'react'
import useTVNavigation from '../hooks/useTVNavigation'

const Sidebar = ({ onSelect, focused: parentFocused, isOpen = false, onClose }) => {
    // Generate years from 2026 down to 1980
    const years = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => 2026 - i)

    const menuItems = [
        { id: 'close', icon: '❌', label: 'Закрыть' },
        { id: 'search', icon: '🔍', label: 'Поиск' },
        { id: 'filter_year_2025', icon: '🎬', label: 'Новые фильмы 2025', type: 'year', year: 2025 },
        { id: 'tv_new', icon: '📺', label: 'Новые сериалы', categoryId: 'tv' },
        { id: 'cartoons', icon: '🎨', label: 'Мультфильмы', categoryId: 'genre_16' },
        { id: 'anime', icon: '🍥', label: 'Аниме', categoryId: 'genre_16' }, // Placeholder, genre might assist
        { id: 'top_rated', icon: '⭐', label: 'Лучшие фильмы', categoryId: 'top' },
        { id: 'favorites', icon: '❤️', label: 'Избранное' },
        { id: 'history', icon: '🕒', label: 'История' },
        { id: 'ai_picks', icon: '🤖', label: 'Подборки AI' },
    ]

    // Refs for items
    const itemRefs = useRef({})
    const sidebarRef = useRef(null)

    // State for expansion
    const [expanded, setExpanded] = useState(false)

    // TV Navigation
    const { focusedIndex, setFocusedIndex, isFocused, containerProps } = useTVNavigation({
        itemCount: menuItems.length + 1 + years.length,
        columns: 1,
        itemRefs,
        onSelect: (index) => {
            if (index < menuItems.length) {
                if (menuItems[index].id === 'close') {
                    if (onClose) onClose()
                } else {
                    onSelect(menuItems[index])
                }
            } else {
                const yearIndex = index - menuItems.length
                const year = years[yearIndex]
                if (year) {
                    onSelect({ id: `year_${year}`, type: 'year', year, label: `${year} год` })
                }
            }
        },
        onBack: onClose, // Call onClose when Back is pressed in sidebar
        loop: false,
        trapFocus: true // Focus stays in sidebar once inside
    })

    // Handle Focus Expansion
    const handleFocus = () => setExpanded(true)
    const handleBlur = (e) => {
        // Only collapse if related target is NOT inside sidebar
        if (!sidebarRef.current?.contains(e.relatedTarget)) {
            setExpanded(false)
        }
    }

    return (
        <div
            ref={sidebarRef}
            onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                    e.stopPropagation()
                    if (onClose) onClose()
                }
            }}
            className={`
                fixed left-0 top-0 bottom-0 z-40 bg-black/95 border-r border-white/10
                transition-all duration-300 ease-out flex flex-col py-6
                ${isOpen ? 'w-64 translate-x-0 shadow-2xl' : 'w-0 -translate-x-full overflow-hidden'}
            `}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            {...containerProps}
        >
            {/* Logo Playholder */}
            <div className="mb-6 px-0 flex justify-center sticky top-0 bg-black z-10 w-full">
                <span className="text-2xl">🌀</span>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2">

                {/* Main Menu */}
                {menuItems.map((item, idx) => (
                    <div
                        key={item.id}
                        ref={el => itemRefs.current[idx] = el}
                        className={`
                            flex items-center rounded-lg mb-2 p-3 cursor-pointer transition-all duration-200
                            ${isFocused(idx) ? 'bg-white text-black scale-105' : 'text-gray-400 hover:text-white'}
                        `}
                        onClick={() => onSelect(item)}
                    >
                        <span className="text-xl min-w-[24px] text-center">{item.icon}</span>
                        <span className={`
                            ml-4 font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200
                            ${expanded ? 'opacity-100' : 'opacity-0 w-0'}
                        `}>
                            {item.label}
                        </span>
                    </div>
                ))}

                {/* Separator */}
                <div className="h-px bg-white/10 my-4 mx-2" />

                {/* Years Grid/List */}
                {years.map((year, i) => {
                    const globalIdx = menuItems.length + i
                    const isYearFocused = isFocused(globalIdx)

                    return (
                        <div
                            key={year}
                            ref={el => itemRefs.current[globalIdx] = el}
                            className={`
                                flex items-center rounded-lg mb-1 p-2 cursor-pointer transition-all duration-200
                                ${isYearFocused ? 'bg-white text-black scale-105' : 'text-gray-500 hover:text-white'}
                            `}
                            onClick={() => onSelect({ id: `year_${year}`, type: 'year', year, label: `${year} год` })}
                        >
                            <span className="text-sm min-w-[24px] text-center">📅</span>
                            <span className={`
                                ml-4 font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200
                                ${expanded ? 'opacity-100' : 'opacity-0 w-0'}
                            `}>
                                {year}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default Sidebar
