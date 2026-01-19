/**
 * useDebounce - Debounce hook for performance optimization
 * UX-01: Prevents excessive API calls during rapid input
 *
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {any} - Debounced value
 */
import { useState, useEffect } from 'react'

export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])

    return debouncedValue
}

/**
 * useDebouncedCallback - Debounced callback hook
 * Returns a memoized callback that is debounced
 *
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function useDebouncedCallback(callback, delay = 300) {
    const [timer, setTimer] = useState(null)

    const debouncedCallback = (...args) => {
        if (timer) clearTimeout(timer)

        const newTimer = setTimeout(() => {
            callback(...args)
        }, delay)

        setTimer(newTimer)
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [timer])

    return debouncedCallback
}

export default useDebounce
