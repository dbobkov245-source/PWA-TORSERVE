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
 * @returns {Object} - { title: badges[] }
 */
export function useQualityBadges(titles) {
    const [badges, setBadges] = useState(() => getCached())
    const pendingRef = useRef(new Set())
    const timeoutRef = useRef(null)

    const fetchBadges = useCallback(async (titlesToFetch) => {
        if (titlesToFetch.length === 0) return

        const serverUrl = getServerUrl()
        if (!serverUrl) return

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
            }
        } catch (err) {
            console.warn('[QualityBadges] Fetch failed:', err.message)
        }
    }, [])

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

        // Debounce batch request
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            // Take first 10 from pending
            const batch = Array.from(pendingRef.current).slice(0, 10)
            pendingRef.current.clear()
            fetchBadges(batch)
        }, DEBOUNCE_MS)

        return () => clearTimeout(timeoutRef.current)
    }, [titles, fetchBadges])

    return badges
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
