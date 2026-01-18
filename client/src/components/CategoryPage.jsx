/**
 * CategoryPage.jsx — Full Category View
 * Displays all items from a single category in a grid layout
 * 
 * Features:
 * - Grid of posters (4-5 per row)
 * - Infinite scroll / pagination
 * - TV navigation support
 * - Back button
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { useTVNavigation } from '../hooks/useTVNavigation'
import { getPosterUrl, getTitle, getYear, DISCOVERY_CATEGORIES } from '../utils/discover'
import { reportBrokenImage } from '../utils/tmdbClient'

const CategoryPage = ({
    categoryId,
    items = [],
    onItemClick,
    onBack,
    onFocusChange
}) => {
    const itemRefs = useRef([])
    const category = DISCOVERY_CATEGORIES.find(c => c.id === categoryId)

    // Handle item selection
    const handleSelect = useCallback((index) => {
        if (onItemClick && items[index]) {
            onItemClick(items[index])
        }
    }, [items, onItemClick])

    // TV Navigation hook - grid layout (5 columns)
    const { focusedIndex, handleKeyDown, isFocused } = useTVNavigation({
        itemCount: items.length,
        columns: 5,
        onSelect: handleSelect,
        itemRefs,
        loop: false,
        trapFocus: true
    })

    // Notify parent about focus changes for backdrop
    useEffect(() => {
        if (focusedIndex >= 0 && items[focusedIndex] && onFocusChange) {
            onFocusChange(items[focusedIndex])
        }
    }, [focusedIndex, items, onFocusChange])

    // Scroll focused item into view
    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex].scrollIntoView({
                behavior: 'auto',
                block: 'center'
            })
        }
    }, [focusedIndex])

    // Handle keyboard for back
    const handleKeyDownWrapper = (e) => {
        if (e.key === 'Escape' || e.key === 'Backspace') {
            e.preventDefault()
            onBack?.()
            return
        }
        handleKeyDown(e)
    }

    if (!category) return null

    return (
        <div
            className="category-page min-h-screen bg-gray-900 p-6"
            onKeyDown={handleKeyDownWrapper}
            tabIndex={0}
        >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="text-white hover:text-blue-400 transition-colors p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Назад"
                >
                    <span className="text-2xl">←</span>
                </button>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">{category.icon}</span>
                    {category.name}
                    <span className="text-gray-500 text-lg font-normal">({items.length})</span>
                </h1>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {items.map((item, index) => {
                    const posterUrl = getPosterUrl(item)
                    const itemTitle = getTitle(item)
                    const year = getYear(item)
                    const isItemFocused = isFocused(index)

                    return (
                        <button
                            key={item.id || index}
                            ref={el => itemRefs.current[index] = el}
                            onClick={() => handleSelect(index)}
                            className={`
                                rounded-lg transition-all duration-200 relative overflow-visible
                                focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-105 focus:z-10
                                hover:scale-105
                                ${isItemFocused ? 'ring-4 ring-blue-500 scale-105 z-10' : ''}
                            `}
                            style={{ aspectRatio: '2/3' }}
                            aria-label={`${itemTitle} ${year || ''}`}
                        >
                            {posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={itemTitle}
                                    className="w-full h-full object-cover rounded-lg"
                                    loading="lazy"
                                    onError={(e) => {
                                        reportBrokenImage(e.target.src)
                                        e.target.style.display = 'none'
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center p-2 rounded-lg">
                                    <span className="text-white text-xs text-center line-clamp-3 font-medium">
                                        {itemTitle}
                                    </span>
                                </div>
                            )}

                            {/* Rating Badge */}
                            {item.vote_average > 0 && (
                                <div className={`
                                    absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded shadow-lg
                                    ${item.vote_average >= 7 ? 'bg-green-500' :
                                        item.vote_average >= 5 ? 'bg-yellow-500 text-black' : 'bg-red-500'}
                                    text-white
                                `}>
                                    {item.vote_average.toFixed(1)}
                                </div>
                            )}

                            {/* Title on hover/focus */}
                            {isItemFocused && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 rounded-b-lg">
                                    <p className="text-white text-sm font-medium line-clamp-2">
                                        {itemTitle}
                                    </p>
                                    {year && (
                                        <p className="text-gray-400 text-xs">{year}</p>
                                    )}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Empty state */}
            {items.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <span className="text-4xl mb-4">📭</span>
                    <p>Нет результатов</p>
                </div>
            )}
        </div>
    )
}

export default CategoryPage
