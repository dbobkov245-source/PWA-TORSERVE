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
 * @param {boolean} options.isActive - Whether the hook handles key presses (default: true)
 */
import { useState, useCallback, useEffect, useRef } from 'react'

export const useTVNavigation = ({
    itemCount,
    columns = 1,
    onSelect,
    onBack,
    itemRefs,
    loop = false,
    trapFocus = true,
    initialIndex = -1,
    isActive = true
}) => {
    const [focusedIndex, setFocusedIndex] = useState(initialIndex)
    const scrollFrameRef = useRef(null)
    const boundedFocusedIndex = itemCount === 0
        ? -1
        : Math.min(Math.max(focusedIndex, -1), itemCount - 1)

    const handleKeyDown = useCallback((e) => {
        if (!isActive || itemCount === 0) return

        let newIndex = boundedFocusedIndex
        let handled = false

        switch (e.key) {
            case 'ArrowDown':
                if (columns === 1) {
                    // Vertical list: move down by 1
                    if (boundedFocusedIndex < itemCount - 1) {
                        newIndex = boundedFocusedIndex + 1
                        handled = true
                    } else if (loop) {
                        newIndex = 0
                        handled = true
                    } else if (trapFocus) {
                        handled = true // Prevent default but don't change index
                    }
                } else {
                    // Grid: move down by columns
                    if (boundedFocusedIndex + columns < itemCount) {
                        newIndex = boundedFocusedIndex + columns
                        handled = true
                    } else if (trapFocus) {
                        handled = true
                    }
                }
                break

            case 'ArrowUp':
                if (columns === 1) {
                    // Vertical list: move up by 1
                    if (boundedFocusedIndex > 0) {
                        newIndex = boundedFocusedIndex - 1
                        handled = true
                    } else if (loop) {
                        newIndex = itemCount - 1
                        handled = true
                    }
                } else {
                    // Grid: move up by columns
                    if (boundedFocusedIndex - columns >= 0) {
                        newIndex = boundedFocusedIndex - columns
                        handled = true
                    }
                }
                break

            case 'ArrowRight':
                if (columns > 1) {
                    // Grid: move right
                    const currentCol = boundedFocusedIndex % columns
                    if (currentCol < columns - 1 && boundedFocusedIndex < itemCount - 1) {
                        newIndex = boundedFocusedIndex + 1
                        handled = true
                    }
                }
                break

            case 'ArrowLeft':
                if (columns > 1) {
                    // Grid: move left
                    const currentCol = boundedFocusedIndex % columns
                    if (currentCol > 0) {
                        newIndex = boundedFocusedIndex - 1
                        handled = true
                    }
                }
                break

            case 'Enter':
            case ' ':
                if (boundedFocusedIndex >= 0 && onSelect) {
                    e.preventDefault()
                    onSelect(boundedFocusedIndex)
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
            e.stopPropagation() // ✅ Prevent bubbling to HomePanel if handled here
            if (newIndex !== boundedFocusedIndex && newIndex >= 0 && newIndex < itemCount) {
                setFocusedIndex(newIndex)
            }
        }
    }, [boundedFocusedIndex, itemCount, columns, loop, trapFocus, onSelect, onBack, isActive])

    // Keep one deterministic horizontal scroll owner. Native focus scrolling and
    // queued smooth animations fight each other under rapid TV remote repeats.
    useEffect(() => {
        const node = itemRefs?.current?.[boundedFocusedIndex]
        if (boundedFocusedIndex < 0 || !node) return

        node.focus({ preventScroll: true })
        const container = node.closest?.('.snap-container')
        if (!container?.scrollTo) return

        if (scrollFrameRef.current !== null) {
            cancelAnimationFrame(scrollFrameRef.current)
        }

        scrollFrameRef.current = requestAnimationFrame(() => {
            const itemRect = node.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            const itemCenter = itemRect.left + itemRect.width / 2
            const containerCenter = containerRect.left + containerRect.width / 2

            container.scrollTo({
                left: container.scrollLeft + itemCenter - containerCenter,
                behavior: 'auto'
            })
            scrollFrameRef.current = null
        })

        return () => {
            if (scrollFrameRef.current !== null) {
                cancelAnimationFrame(scrollFrameRef.current)
                scrollFrameRef.current = null
            }
        }
    }, [boundedFocusedIndex, itemRefs])

    return {
        focusedIndex: boundedFocusedIndex,
        setFocusedIndex,
        handleKeyDown,
        // Helper for binding to container
        containerProps: {
            onKeyDown: handleKeyDown,
            tabIndex: 0
        },
        // Helper for checking if item is focused
        isFocused: (index) => boundedFocusedIndex === index
    }
}

export default useTVNavigation
