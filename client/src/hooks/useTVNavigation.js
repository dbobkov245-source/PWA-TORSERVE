/**
 * useTVNavigation - Universal TV Remote Navigation Hook
 * Stage 6.2: Handles D-pad navigation for lists and grids
 * 
 * @param {Object} options
 * @param {number} options.itemCount - Total number of items
 * @param {number} options.columns - Number of columns (1 for vertical list, >1 for grid)
 * @param {function} options.onSelect - Callback when Enter/OK pressed (receives index)
 * @param {function} options.onBack - Callback when Escape/Back pressed
 * @param {React.RefObject[]} options.itemRefs - Array of refs for scrollIntoView
 * @param {boolean} options.loop - Whether to loop at edges (default: false)
 * @param {boolean} options.trapFocus - Prevent focus from leaving (default: true)
 */
import { useState, useCallback, useEffect } from 'react'

export const useTVNavigation = ({
    itemCount,
    columns = 1,
    onSelect,
    onBack,
    itemRefs,
    loop = false,
    trapFocus = true,
    initialIndex = -1
}) => {
    const [focusedIndex, setFocusedIndex] = useState(initialIndex)

    // Calculate grid navigation
    const rows = Math.ceil(itemCount / columns)

    const handleKeyDown = useCallback((e) => {
        if (itemCount === 0) return

        let newIndex = focusedIndex
        let handled = false

        switch (e.key) {
            case 'ArrowDown':
                if (columns === 1) {
                    // Vertical list: move down by 1
                    if (focusedIndex < itemCount - 1) {
                        newIndex = focusedIndex + 1
                        handled = true
                    } else if (loop) {
                        newIndex = 0
                        handled = true
                    } else if (trapFocus) {
                        handled = true // Prevent default but don't change index
                    }
                } else {
                    // Grid: move down by columns
                    if (focusedIndex + columns < itemCount) {
                        newIndex = focusedIndex + columns
                        handled = true
                    } else if (trapFocus) {
                        handled = true
                    }
                }
                break

            case 'ArrowUp':
                if (columns === 1) {
                    // Vertical list: move up by 1
                    if (focusedIndex > 0) {
                        newIndex = focusedIndex - 1
                        handled = true
                    } else if (loop) {
                        newIndex = itemCount - 1
                        handled = true
                    }
                } else {
                    // Grid: move up by columns
                    if (focusedIndex - columns >= 0) {
                        newIndex = focusedIndex - columns
                        handled = true
                    }
                }
                break

            case 'ArrowRight':
                if (columns > 1) {
                    // Grid: move right
                    const currentCol = focusedIndex % columns
                    if (currentCol < columns - 1 && focusedIndex < itemCount - 1) {
                        newIndex = focusedIndex + 1
                        handled = true
                    }
                }
                break

            case 'ArrowLeft':
                if (columns > 1) {
                    // Grid: move left
                    const currentCol = focusedIndex % columns
                    if (currentCol > 0) {
                        newIndex = focusedIndex - 1
                        handled = true
                    }
                }
                break

            case 'Enter':
            case ' ':
                if (focusedIndex >= 0 && onSelect) {
                    e.preventDefault()
                    onSelect(focusedIndex)
                    return
                }
                break

            case 'Escape':
            case 'Backspace':
                if (onBack) {
                    e.preventDefault()
                    onBack()
                    return
                }
                break
        }

        if (handled) {
            e.preventDefault()
            if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < itemCount) {
                setFocusedIndex(newIndex)
            }
        }
    }, [focusedIndex, itemCount, columns, loop, trapFocus, onSelect, onBack])

    // Scroll into view when focused index changes
    // FIX-01a: Use 'center' instead of 'nearest' for better TV UX
    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs?.current?.[focusedIndex]) {
            itemRefs.current[focusedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            })
        }
    }, [focusedIndex, itemRefs])

    // Focus the element when index changes
    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs?.current?.[focusedIndex]) {
            itemRefs.current[focusedIndex].focus()
        }
    }, [focusedIndex, itemRefs])

    // Reset focus when item count changes and current index is out of bounds
    useEffect(() => {
        if (focusedIndex >= itemCount) {
            setFocusedIndex(Math.max(0, itemCount - 1))
        }
    }, [itemCount, focusedIndex])

    return {
        focusedIndex,
        setFocusedIndex,
        handleKeyDown,
        // Helper for binding to container
        containerProps: {
            onKeyDown: handleKeyDown,
            tabIndex: 0
        },
        // Helper for checking if item is focused
        isFocused: (index) => focusedIndex === index
    }
}

export default useTVNavigation
