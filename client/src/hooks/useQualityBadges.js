/**
 * useQualityBadges.js — Hook to fetch quality badges for movies
 * ADR-001 Item 7: Quality Badges on home page
 *
 * Takes posters as films (see utils/qualityItems.js), most visible first,
 * fetches their quality from the server in that order and keeps found badges
 * in localStorage for a day, per film.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor, CapacitorHttp } from '@capacitor/core'

const CACHE_KEY = 'quality_badges_v2'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // per film; the server keeps them as long
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

async function requestQualityBadges(serverUrl, items) {
    const endpoint = `${serverUrl}/api/quality-badges`
    const payload = { items }
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

function readStore() {
    try {
        const stored = JSON.parse(localStorage.getItem(CACHE_KEY))
        return stored && typeof stored === 'object' ? stored : {}
    } catch {
        return {}
    }
}

/**
 * Cached badges by poster key; expired entries are dropped.
 * @returns {Object<string, string[]>}
 */
function getCached() {
    const now = Date.now()
    return Object.fromEntries(
        Object.entries(readStore())
            .filter(([, entry]) => Array.isArray(entry?.badges) && entry.badges.length > 0 && entry.expires > now)
            .map(([key, entry]) => [key, entry.badges])
    )
}

/**
 * Keep found badges for a day each. Empty answers are not cached here:
 * the server already remembers them.
 */
function saveCache(found) {
    try {
        const now = Date.now()
        const store = Object.fromEntries(
            Object.entries(readStore()).filter(([, entry]) => entry?.expires > now)
        )
        for (const [key, badges] of Object.entries(found || {})) {
            if (Array.isArray(badges) && badges.length > 0) {
                store[key] = { badges, expires: now + CACHE_TTL_MS }
            }
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(store))
    } catch (e) {
        console.warn('[QualityBadges] Cache save failed:', e)
    }
}

/**
 * Hook to fetch quality badges for posters
 * @param {Array<{key: string}>} items - posters from buildQualityRequestItem, most visible first;
 *   the queue follows this order, so a newly focused row jumps ahead
 * @returns {{ badges: Object<string, string[]>, debug: { queueSize: number, fetchCount: number }|null }}
 */
export function useQualityBadges(items) {
    const [badges, setBadges] = useState(() => getCached())
    const [debug, setDebug] = useState(() => ({ queueSize: 0, fetchCount: 0 }))
    const pendingRef = useRef(new Map()) // key -> request item
    const orderRef = useRef([])          // keys in the caller's current priority
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

    const fetchBadges = useCallback(async (batch) => {
        if (batch.length === 0) return false

        const serverUrl = getServerUrl()
        if (!serverUrl) return false

        if (DEBUG_ENABLED) {
            setDebug(prev => ({ ...prev, fetchCount: prev.fetchCount + 1 }))
        }

        try {
            const result = await requestQualityBadges(serverUrl, batch)
            const found = Object.fromEntries(
                Object.entries(result || {}).filter(([, list]) => Array.isArray(list) && list.length > 0)
            )
            saveCache(found)
            setBadges(prev => ({ ...prev, ...found }))
            return true
        } catch (err) {
            console.warn('[QualityBadges] Fetch failed:', err.message)
            return false
        }
    }, [])

    /** Next pending posters: the caller's priority first, then anything left over. */
    const nextBatch = useCallback(() => {
        const pending = pendingRef.current
        const keys = orderRef.current.filter(key => pending.has(key))
        for (const key of pending.keys()) {
            if (!keys.includes(key)) keys.push(key)
        }
        return keys.slice(0, BATCH_SIZE).map(key => pending.get(key))
    }, [])

    const processQueue = useCallback(async () => {
        if (isProcessingRef.current) return
        if (pendingRef.current.size === 0) return

        isProcessingRef.current = true

        try {
            while (pendingRef.current.size > 0) {
                const batch = nextBatch()
                const ok = await fetchBadges(batch)

                if (!ok) {
                    // Fallback to single-poster requests when a small batch still fails.
                    if (batch.length > 1) {
                        const single = batch[0]
                        const singleOk = await fetchBadges([single])
                        if (singleOk) {
                            pendingRef.current.delete(single.key)
                            syncQueueDebug()
                            continue
                        }
                    }
                    break
                }

                batch.forEach(item => pendingRef.current.delete(item.key))
                syncQueueDebug()
            }
        } finally {
            isProcessingRef.current = false
            syncQueueDebug()

            // Retry later if we still have pending posters (e.g., temporary network issues)
            if (pendingRef.current.size > 0) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = setTimeout(() => {
                    processQueue()
                }, DEBOUNCE_MS)
            }
        }
    }, [fetchBadges, nextBatch, syncQueueDebug])

    useEffect(() => {
        if (!items || items.length === 0) return
        orderRef.current = items.map(item => item?.key).filter(Boolean)

        // Filter out already cached and pending
        const cached = getCached()
        const uncached = items.filter(item =>
            item?.key && !cached[item.key] && !pendingRef.current.has(item.key)
        )

        uncached.forEach(item => pendingRef.current.set(item.key, item))
        syncQueueDebug()

        // The previous run's cleanup cleared its timer: restart the queue
        // whenever anything is waiting, not only when new posters arrived.
        if (pendingRef.current.size === 0) return

        // Debounce queue processing
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            processQueue()
        }, DEBOUNCE_MS)

        return () => clearTimeout(timeoutRef.current)
    }, [items, processQueue, syncQueueDebug])

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
