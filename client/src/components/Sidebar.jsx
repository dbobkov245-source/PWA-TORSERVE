import React, { useState, useRef } from 'react'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

const Sidebar = ({ onSelect, isOpen = false, onClose }) => {
    // Generate years from 2026 down to 1980
    const years = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => 2026 - i)

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

    const sidebarRef = useRef(null)
    const [expanded, setExpanded] = useState(false)

    // Handle Focus Expansion
    const handleFocus = () => setExpanded(true)
    const handleBlur = (e) => {
        if (!sidebarRef.current?.contains(e.relatedTarget)) {
            setExpanded(false)
        }
    }

    return (
        <div
            ref={sidebarRef}
            className={`
                fixed left-0 top-0 bottom-0 z-40 bg-black/95 border-r border-white/10
                transition-all duration-300 ease-out flex flex-col py-6
                ${isOpen ? 'w-64 translate-x-0 shadow-2xl' : 'w-0 -translate-x-full overflow-hidden'}
            `}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
        >
            {/* Logo */}
            <div className="mb-6 px-0 flex justify-center sticky top-0 bg-black z-10 w-full">
                <span className="text-2xl">🌀</span>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2">
                {/* Main Menu */}
                {menuItems.map((item) => (
                    <SidebarItem
                        key={item.id}
                        item={item}
                        expanded={expanded}
                        onClick={() => {
                            if (item.id === 'close') onClose?.()
                            else onSelect(item)
                        }}
                    />
                ))}

                {/* Separator */}
                <div className="h-px bg-white/10 my-4 mx-2" />

                {/* Years Grid */}
                {years.map((year) => (
                    <SidebarItem
                        key={year}
                        item={{ id: year, icon: '📅', label: year }}
                        expanded={expanded}
                        onClick={() => onSelect({ id: `year_${year}`, type: 'year', year, label: `${year} год` })}
                    />
                ))}
            </div>
        </div>
    )
}

const SidebarItem = ({ item, expanded, onClick }) => {
    const spatialRef = useSpatialItem('sidebar')

    return (
        <button
            ref={spatialRef}
            className="focusable flex items-center rounded-lg mb-2 p-3 w-full text-left transition-all duration-200 text-gray-400 hover:text-white focus:bg-white focus:text-black focus:scale-105"
            onClick={onClick}
        >
            <span className="text-xl min-w-[24px] text-center">{item.icon}</span>
            <span className={`
                ml-4 font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200
                ${expanded ? 'opacity-100' : 'opacity-0 w-0'}
            `}>
                {item.label}
            </span>
        </button>
    )
}

export default Sidebar
