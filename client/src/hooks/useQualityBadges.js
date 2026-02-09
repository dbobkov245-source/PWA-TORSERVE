/**
 * useQualityBadges.js — Hook to fetch quality badges for movies
 * ADR-001 Item 7: Quality Badges on home page
 * 
 * Batches visible movie titles, fetches quality info from server,
 * caches in localStorage for 1 hour.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const CACHE_KEY = 'quality_badges_cache'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const DEBOUNCE_MS = 500
const DEBUG_ENABLED = import.meta.env.DEV

/**
 * Get server URL
 */
function getServerUrl() {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('serverUrl')
    if (stored && stored.includes('://')) return stored.replace(/\/$/, '')
    return window.location.origin
}

/**
 * Get cached quality badges from localStorage
 */
function getCached() {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return {}
        const { data, expires } = JSON.parse(raw)
        if (Date.now() > expires) {
            localStorage.removeItem(CACHE_KEY)
            return {}
        }
        return data || {}
    } catch {
        return {}
    }
}

/**
 * Save quality badges to localStorage cache
 */
function saveCache(badges) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: badges,
            expires: Date.now() + CACHE_TTL_MS
        }))
    } catch (e) {
        console.warn('[QualityBadges] Cache save failed:', e)
    }
}

/**
 * Hook to fetch quality badges for a list of movie titles
 * @param {string[]} titles - Array of movie titles to fetch badges for
 * @returns {{ badges: Object, debug: { queueSize: number, fetchCount: number }|null }}
 */
export function useQualityBadges(titles) {
    const [badges, setBadges] = useState(() => getCached())
    const [debug, setDebug] = useState(() => ({ queueSize: 0, fetchCount: 0 }))
    const pendingRef = useRef(new Set())
    const timeoutRef = useRef(null)
    const isProcessingRef = useRef(false)

    const syncQueueDebug = useCallback(() => {
        if (!DEBUG_ENABLED) return
        const queueSize = pendingRef.current.size
        setDebug(prev => (
            prev.queueSize === queueSize
                ? prev
                : { ...prev, queueSize }
        ))
    }, [])

    const fetchBadges = useCallback(async (titlesToFetch) => {
        if (titlesToFetch.length === 0) return false

        const serverUrl = getServerUrl()
        if (!serverUrl) return false

        if (DEBUG_ENABLED) {
            setDebug(prev => ({ ...prev, fetchCount: prev.fetchCount + 1 }))
        }

        try {
            const response = await fetch(`${serverUrl}/api/quality-badges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titles: titlesToFetch })
            })

            if (response.ok) {
                const result = await response.json()
                setBadges(prev => {
                    const updated = { ...prev, ...result }
                    saveCache(updated)
                    return updated
                })
                return true
            }

            return false
        } catch (err) {
            console.warn('[QualityBadges] Fetch failed:', err.message)
            return false
        }
    }, [])

    const processQueue = useCallback(async () => {
        if (isProcessingRef.current) return
        if (pendingRef.current.size === 0) return

        isProcessingRef.current = true

        try {
            while (pendingRef.current.size > 0) {
                const batch = Array.from(pendingRef.current).slice(0, 10)
                const ok = await fetchBadges(batch)

                if (!ok) break

                batch.forEach(title => pendingRef.current.delete(title))
                syncQueueDebug()
            }
        } finally {
            isProcessingRef.current = false
            syncQueueDebug()

            // Retry later if we still have pending titles (e.g., temporary network issues)
            if (pendingRef.current.size > 0) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = setTimeout(() => {
                    processQueue()
                }, DEBOUNCE_MS)
            }
        }
    }, [fetchBadges, syncQueueDebug])

    useEffect(() => {
        if (!titles || titles.length === 0) return

        // Filter out already cached and pending
        const cached = getCached()
        const uncached = titles.filter(t =>
            t && !cached[t] && !pendingRef.current.has(t)
        )

        if (uncached.length === 0) return

        // Mark as pending
        uncached.forEach(t => pendingRef.current.add(t))
        syncQueueDebug()

        // Debounce queue processing
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            processQueue()
        }, DEBOUNCE_MS)

        return () => clearTimeout(timeoutRef.current)
    }, [titles, processQueue, syncQueueDebug])

    return {
        badges,
        debug: DEBUG_ENABLED ? debug : null
    }
}

/**
 * Get badge style for display
 */
export function getBadgeStyle(label) {
    const styles = {
        '4K': 'bg-amber-500',
        '1080p': 'bg-blue-500',
        '720p': 'bg-gray-500',
        'HDR': 'bg-orange-500',
        'DV': 'bg-purple-600'
    }
    return styles[label] || 'bg-gray-600'
}
