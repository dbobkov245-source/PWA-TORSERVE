/**
 * useQualityBadges.js — Hook to fetch quality badges for movies
 * ADR-001 Item 7: Quality Badges on home page
 * 
 * Batches visible movie titles, fetches quality info from server,
 * caches in localStorage for 1 hour.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor, CapacitorHttp } from '@capacitor/core'

const CACHE_KEY = 'quality_badges_cache'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const DEBOUNCE_MS = 500
const BATCH_SIZE = 3
const REQUEST_TIMEOUT_MS = 25000
const DEBUG_ENABLED = import.meta.env.DEV

/**
 * Get server URL
 */
function getServerUrl() {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('serverUrl')
    if (stored && stored.includes('://')) return stored.replace(/\/$/, '')
    if (Capacitor.isNativePlatform()) return ''
    return window.location.origin
}

async function parseNativeJson(data) {
    if (typeof data === 'string') {
        return JSON.parse(data)
    }
    return data || {}
}

async function requestQualityBadges(serverUrl, titles) {
    const endpoint = `${serverUrl}/api/quality-badges`
    const payload = { titles }
    const preferNativeHttp = Capacitor.isNativePlatform() && endpoint.startsWith('http://')
    const withTimeout = async (promise, ms = REQUEST_TIMEOUT_MS) => {
        let timeoutId
        try {
            return await Promise.race([
                promise,
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)
                })
            ])
        } finally {
            clearTimeout(timeoutId)
        }
    }

    const viaFetch = async () => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            })
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }
            return response.json()
        } finally {
            clearTimeout(timer)
        }
    }

    const viaNative = async () => {
        const response = await withTimeout(CapacitorHttp.request({
            method: 'POST',
            url: endpoint,
            headers: { 'Content-Type': 'application/json' },
            data: payload
        }))
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Native HTTP ${response.status}`)
        }
        return parseNativeJson(response.data)
    }

    // On Android TV + http://LAN server we avoid mixed-content blocks in WebView.
    if (preferNativeHttp) {
        try {
            return await viaNative()
        } catch (nativeErr) {
            return viaFetch().catch(() => { throw nativeErr })
        }
    }

    try {
        return await viaFetch()
    } catch (fetchErr) {
        if (!Capacitor.isNativePlatform()) throw fetchErr
        return viaNative()
    }
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
        if (!data || typeof data !== 'object') return {}
        // Do not treat empty badges as long-lived cache entries.
        const sanitized = Object.fromEntries(
            Object.entries(data).filter(([, badges]) => Array.isArray(badges) && badges.length > 0)
        )
        return sanitized
    } catch {
        return {}
    }
}

/**
 * Save quality badges to localStorage cache
 */
function saveCache(badges) {
    try {
        const filtered = Object.fromEntries(
            Object.entries(badges || {}).filter(([, list]) => Array.isArray(list) && list.length > 0)
        )
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: filtered,
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
            const result = await requestQualityBadges(serverUrl, titlesToFetch)
            setBadges(prev => {
                const nonEmpty = Object.fromEntries(
                    Object.entries(result || {}).filter(([, list]) => Array.isArray(list) && list.length > 0)
                )
                const updated = { ...prev, ...nonEmpty }
                saveCache(updated)
                return updated
            })
            return true
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
                const batch = Array.from(pendingRef.current).slice(0, BATCH_SIZE)
                const ok = await fetchBadges(batch)

                if (!ok) {
                    // Fallback to single-title requests when a small batch still fails.
                    if (batch.length > 1) {
                        const single = batch[0]
                        const singleOk = await fetchBadges([single])
                        if (singleOk) {
                            pendingRef.current.delete(single)
                            syncQueueDebug()
                            continue
                        }
                    }
                    break
                }

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
