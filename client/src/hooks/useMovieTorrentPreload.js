import { useCallback, useEffect, useRef, useState } from 'react'
import {
    buildMovieTorrentQueries,
    getMovieTorrentKey,
    shouldStopMovieTorrentPreload
} from '../utils/movieTorrentSearch.js'

function isAbortError(error) {
    return error?.name === 'AbortError'
}

function getMediaType(item) {
    return item?.media_type === 'tv' || item?.name || item?.original_name ? 'tv' : 'movie'
}

function mergeItems(items) {
    const seen = new Set()

    return items.filter((item) => {
        const key = item?.magnet || item?.id || item?.title
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
    })
}

function createBaseSession(item) {
    return {
        key: getMovieTorrentKey(item),
        itemId: item?.id ?? null,
        mediaType: getMediaType(item),
        query: '',
        items: [],
        providers: {},
        meta: null,
        loading: false,
        error: null,
        status: 'idle',
        source: 'movie-detail',
        fromCache: false,
        updatedAt: Date.now()
    }
}

export function useMovieTorrentPreload({
    item,
    searchTorrents,
    ttlMs = 10 * 60 * 1000
}) {
    const cacheRef = useRef(new Map())
    const requestIdRef = useRef(0)
    const abortControllerRef = useRef(null)
    const [session, setSession] = useState(null)

    const abortActiveRequest = useCallback(() => {
        abortControllerRef.current?.abort()
        abortControllerRef.current = null
    }, [])

    const load = useCallback(async (currentItem, { forceFresh = false } = {}) => {
        if (!currentItem) {
            abortActiveRequest()
            setSession(null)
            return null
        }

        abortActiveRequest()

        const key = getMovieTorrentKey(currentItem)
        const requestId = ++requestIdRef.current
        const cached = cacheRef.current.get(key)
        const now = Date.now()

        if (!forceFresh && cached && cached.expiresAt > now) {
            const cachedSession = {
                ...cached.session,
                fromCache: true
            }
            setSession(cachedSession)
            return cachedSession
        }

        const queries = buildMovieTorrentQueries(currentItem)
        const baseSession = createBaseSession(currentItem)
        const controller = new AbortController()
        abortControllerRef.current = controller

        setSession({
            ...baseSession,
            query: queries[0] || '',
            loading: true,
            status: 'loading'
        })

        let combinedItems = []
        let lastQuery = queries[0] || ''
        let lastProviders = {}
        let lastMeta = null
        let hadSuccessfulSearch = false
        let lastSearchError = null

        try {
            for (const query of queries) {
                if (controller.signal.aborted || requestId !== requestIdRef.current) {
                    return null
                }

                try {
                    const response = await searchTorrents(query, {
                        forceFresh,
                        limit: 100,
                        signal: controller.signal
                    })

                    if (controller.signal.aborted || requestId !== requestIdRef.current) {
                        return null
                    }

                    hadSuccessfulSearch = true
                    lastSearchError = null
                    lastQuery = query
                    combinedItems = mergeItems(combinedItems.concat(response?.items || []))
                    lastProviders = { ...lastProviders, ...response?.meta?.providers }
                    if (response?.meta) lastMeta = response.meta

                    const shouldStop = shouldStopMovieTorrentPreload(combinedItems)
                    const nextSession = {
                        ...baseSession,
                        query: lastQuery,
                        items: combinedItems,
                        providers: lastProviders,
                        meta: lastMeta,
                        loading: !shouldStop,
                        status: shouldStop ? (combinedItems.length ? 'ready' : 'empty') : 'loading',
                        fromCache: false,
                        updatedAt: Date.now()
                    }

                    if (shouldStop) {
                        cacheRef.current.set(key, { session: nextSession, expiresAt: Date.now() + ttlMs })
                    }

                    if (requestId === requestIdRef.current) {
                        setSession(nextSession)
                    }

                    if (shouldStop) {
                        return nextSession
                    }
                } catch (error) {
                    if (controller.signal.aborted || requestId !== requestIdRef.current || isAbortError(error)) {
                        return null
                    }

                    lastSearchError = error
                    console.error('[Preload] error:', error)
                }
            }

            if (controller.signal.aborted || requestId !== requestIdRef.current) {
                return null
            }

            if (!hadSuccessfulSearch && lastSearchError) {
                const failedSession = {
                    ...baseSession,
                    query: lastQuery,
                    items: [],
                    providers: lastProviders,
                    meta: lastMeta,
                    loading: false,
                    error: lastSearchError?.message || 'Search failed',
                    status: 'error',
                    fromCache: false,
                    updatedAt: Date.now()
                }

                setSession(failedSession)
                return failedSession
            }

            const finalSession = {
                ...baseSession,
                query: lastQuery,
                items: combinedItems,
                providers: lastProviders,
                meta: lastMeta,
                loading: false,
                status: combinedItems.length ? 'ready' : 'empty',
                fromCache: false,
                updatedAt: Date.now()
            }

            cacheRef.current.set(key, { session: finalSession, expiresAt: Date.now() + ttlMs })
            setSession(finalSession)
            return finalSession
        } catch (error) {
            if (requestId !== requestIdRef.current) return null

            const failedSession = {
                ...baseSession,
                query: lastQuery,
                items: [],
                providers: lastProviders,
                meta: lastMeta,
                loading: false,
                error: error?.message || 'Search failed',
                status: 'error',
                fromCache: false,
                updatedAt: Date.now()
            }

            setSession(failedSession)
            return failedSession
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null
            }
        }
    }, [abortActiveRequest, searchTorrents, ttlMs])

    useEffect(() => {
        if (!item) {
            requestIdRef.current += 1
            abortActiveRequest()
            setSession(null)
            return
        }

        load(item)

        return () => {
            abortActiveRequest()
        }
    }, [abortActiveRequest, item, load])

    const refresh = useCallback(async () => {
        if (!item) return null
        return load(item, { forceFresh: true })
    }, [item, load])

    return {
        session,
        refresh
    }
}
