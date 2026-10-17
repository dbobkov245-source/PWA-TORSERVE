/**
 * qualityDiscovery.js — Discover available torrent quality for movies
 * ADR-001 Item 7: Quality Badges on home page (like Lampa)
 *
 * Searches torrents for a film and extracts the best available quality.
 * Posters send the film itself (title, original title, year, series or not),
 * which jac.red matches like the movie page does; old clients still send bare
 * titles. Found badges are kept for a day and an empty answer for six hours,
 * in memory and in a file next to db.json, so a container restart does not
 * send every poster back to the trackers.
 */

import { readFileSync } from 'node:fs'
import { rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { search } from './aggregator.js'
import { providerManager } from './providers/index.js'
import { parseSearchContext } from './searchContext.js'
import { logger } from './utils/logger.js'

const log = logger.child('QualityDiscovery')

// Cache configuration
const FOUND_TTL_MS = 24 * 60 * 60 * 1000   // badges change slowly: a new 4K release now and then
const EMPTY_TTL_MS = 6 * 60 * 60 * 1000    // nothing found yet: a release may still appear
const FAIL_CACHE_TTL_MS = 10 * 60 * 1000   // provider failed: retry soon
const MAX_CACHE_SIZE = 2000
const MAX_BATCH = 10
const FLUSH_DELAY_MS = 30 * 1000
const DISCOVERY_TIMEOUT_MS = 6000
const DISCOVERY_CONCURRENCY = 2
const FAST_PROVIDER_NAME = 'jacred'
const FAST_PROVIDER_TIMEOUT_MS = 4500

const DEFAULT_CACHE_FILE = path.join(path.dirname(process.env.DB_PATH || 'db.json'), 'quality-badges.json')

// In-memory cache: key -> { badges, expires }
const qualityCache = new Map()
// In-flight deduplication: key -> Promise<string[]>
const inFlight = new Map()

// Persistence is switched on by initQualityCache() at server start only.
let persistFile = null
let flushTimer = null

/**
 * Clean cache of expired entries
 */
function cleanCache() {
    const now = Date.now()
    for (const [key, value] of qualityCache) {
        if (now > value.expires) {
            qualityCache.delete(key)
        }
    }
    // Evict oldest if still over limit
    if (qualityCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(qualityCache.entries())
        entries.sort((a, b) => a[1].expires - b[1].expires)
        const toRemove = entries.slice(0, Math.ceil(MAX_CACHE_SIZE * 0.2))
        toRemove.forEach(([k]) => qualityCache.delete(k))
    }
}

/**
 * Normalize title for cache key
 */
function normalizeTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\sЀ-ӿ]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function withTimeout(promise, timeoutMs, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs))
    ])
}

/**
 * Extract best quality badges from search results
 * @param {Array} results - Search results from aggregator
 * @returns {string[]} - Array of quality labels: ['4K', '1080p', 'HDR', etc.]
 */
function extractBestQuality(results) {
    if (!results || results.length === 0) return []

    const found = {
        '4K': false,
        '1080p': false,
        '720p': false,
        'HDR': false,
        'DV': false
    }

    for (const result of results) {
        const tags = result.tags || []

        if (tags.includes('2160p')) found['4K'] = true
        if (tags.includes('1080p')) found['1080p'] = true
        if (tags.includes('720p')) found['720p'] = true
        if (tags.includes('hdr')) found['HDR'] = true
        if (tags.includes('dv')) found['DV'] = true

        // Early exit if we found best quality
        if (found['4K'] && found['HDR']) break
    }

    // Return found badges in priority order
    const badges = []
    if (found['4K']) badges.push('4K')
    else if (found['1080p']) badges.push('1080p')
    else if (found['720p']) badges.push('720p')

    if (found['DV']) badges.push('DV')
    else if (found['HDR']) badges.push('HDR')

    return badges
}

function remember(key, badges, ttlMs) {
    qualityCache.set(key, { badges, expires: Date.now() + ttlMs })
    scheduleFlush()
}

/**
 * Search once per cache key: cached answer, in-flight request, or a new search.
 * @param {string} key - cache key
 * @param {string} query - text query
 * @param {Object|null} context - film identity (see searchContext.js) or null
 */
function lookup(key, query, context) {
    const cached = qualityCache.get(key)
    if (cached && Date.now() < cached.expires) {
        return Promise.resolve(cached.badges)
    }

    const running = inFlight.get(key)
    if (running) {
        return running
    }

    const task = (async () => {
        try {
            let results = []
            const fastProvider = providerManager.get(FAST_PROVIDER_NAME)
            let fastProviderFailed = false

            // Fast path: jacred is usually available and quick in this deployment.
            if (fastProvider && fastProvider.enabled && fastProvider.isHealthy()) {
                try {
                    results = await withTimeout(
                        fastProvider.search(query, context),
                        FAST_PROVIDER_TIMEOUT_MS,
                        `${FAST_PROVIDER_NAME} timeout`
                    )
                } catch (fastErr) {
                    fastProviderFailed = true
                    log.debug('Fast provider failed, fallback to aggregator', {
                        provider: FAST_PROVIDER_NAME,
                        key,
                        error: fastErr.message
                    })
                }
            } else {
                fastProviderFailed = true
            }

            if (fastProviderFailed) {
                // Keep quality discovery isolated from user-facing search cache.
                const aggregated = await withTimeout(
                    search(query, { skipCache: true, skipCacheWrite: true, background: true, context }),
                    DISCOVERY_TIMEOUT_MS,
                    'Quality discovery timeout'
                )
                results = aggregated?.results || []

                // Without an answer from jac.red, "nothing found" is not
                // "no releases": retry soon instead of caching it for hours.
                const jacredStatus = aggregated?.providers?.[FAST_PROVIDER_NAME]?.status
                if (results.length === 0 && jacredStatus !== 'ok' && jacredStatus !== 'empty') {
                    throw new Error(`no answer from ${FAST_PROVIDER_NAME} (${jacredStatus || 'not asked'})`)
                }
            }

            const badges = extractBestQuality(results)
            remember(key, badges, badges.length > 0 ? FOUND_TTL_MS : EMPTY_TTL_MS)
            log.debug('Quality discovered', { key, badges })
            return badges
        } catch (err) {
            log.warn('Quality discovery failed', { key, error: err.message })
            // Short fail cache to avoid hammering providers on repeated rows.
            remember(key, [], FAIL_CACHE_TTL_MS)
            return []
        } finally {
            inFlight.delete(key)
        }
    })()

    inFlight.set(key, task)
    return task
}

/**
 * Discover quality for a single title
 * @param {string} title - Movie/show title
 * @returns {Promise<string[]>} - Quality badges
 */
export async function discoverQuality(title) {
    if (!title) return []
    return lookup(normalizeTitle(title), title, null)
}

/**
 * Cache key of a film: the same title in another year is another film.
 * @param {{title: string|null, originalTitle: string|null, year: number|null, isSerial: boolean}} context
 */
export function qualityItemCacheKey(context) {
    return [
        'item',
        normalizeTitle(context.title || ''),
        normalizeTitle(context.originalTitle || ''),
        context.year || '',
        context.isSerial ? 'tv' : 'movie'
    ].join('|')
}

/**
 * Discover quality for one film, asking jac.red by its identity.
 * The original title goes first: release names carry it more reliably.
 */
export async function discoverItemQuality(context) {
    const query = context.originalTitle || context.title
    return lookup(qualityItemCacheKey(context), query, context)
}

/** Run jobs with conservative concurrency (protect providers). */
async function runPool(jobs) {
    const queue = [...jobs]
    const workersCount = Math.min(DISCOVERY_CONCURRENCY, queue.length)
    const workers = Array.from({ length: workersCount }, async () => {
        while (queue.length > 0) {
            const job = queue.shift()
            if (job) await job()
        }
    })
    await Promise.allSettled(workers)
}

/**
 * Batch discover quality for multiple titles (clients before v3.19)
 * @param {string[]} titles - Array of titles (max 10)
 * @returns {Promise<Object>} - { title: badges[] }
 */
export async function batchDiscoverQuality(titles) {
    if (!titles || !Array.isArray(titles)) return {}

    // Clean cache periodically
    if (Math.random() < 0.1) cleanCache()

    const result = {}
    const limited = titles.slice(0, MAX_BATCH).filter(title => typeof title === 'string' && title)
    await runPool(limited.map(title => async () => {
        result[title] = await discoverQuality(title)
    }))
    return result
}

/**
 * Batch discover quality for films shown on posters.
 * @param {Array<{key: string, title?: string, original_title?: string, year?: string, is_serial?: string}>} items
 *   (max 10); `key` is the client's own id for the poster
 * @returns {Promise<Object>} - { key: badges[] }
 */
export async function batchDiscoverItems(items) {
    if (!Array.isArray(items)) return {}

    if (Math.random() < 0.1) cleanCache()

    const result = {}
    const jobs = []
    for (const item of items.slice(0, MAX_BATCH)) {
        if (!item || typeof item.key !== 'string' || !item.key) continue
        const context = parseSearchContext(item)
        if (!context) continue
        jobs.push(async () => {
            result[item.key] = await discoverItemQuality(context)
        })
    }
    if (jobs.length > 0) {
        log.info('Batch quality discovery', { items: jobs.length })
        await runPool(jobs)
    }
    return result
}

/**
 * Read a saved cache; expired or malformed entries are dropped.
 * @param {string} [file]
 */
export function loadQualityCache(file = DEFAULT_CACHE_FILE) {
    let saved
    try {
        saved = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
        return
    }
    if (!saved || typeof saved !== 'object') return

    const now = Date.now()
    for (const [key, entry] of Object.entries(saved)) {
        const valid = Array.isArray(entry?.badges)
            && entry.badges.every(badge => typeof badge === 'string')
            && Number.isFinite(entry.expires)
            && entry.expires > now
        if (valid) qualityCache.set(key, { badges: entry.badges, expires: entry.expires })
    }
    cleanCache()
}

/**
 * Write the cache to disk (temp file + rename, so a crash never leaves half a file).
 * @param {string} [file]
 */
export async function flushQualityCache(file = persistFile || DEFAULT_CACHE_FILE) {
    cleanCache()
    const tmp = `${file}.tmp`
    await writeFile(tmp, JSON.stringify(Object.fromEntries(qualityCache)))
    await rename(tmp, file)
}

function scheduleFlush() {
    if (!persistFile || flushTimer) return
    flushTimer = setTimeout(() => {
        flushTimer = null
        flushQualityCache(persistFile).catch(err => log.warn('Quality cache save failed', { error: err.message }))
    }, FLUSH_DELAY_MS)
    flushTimer.unref?.()
}

/**
 * Load the saved cache and keep saving it (server start).
 * @param {string} [file]
 */
export function initQualityCache(file = DEFAULT_CACHE_FILE) {
    persistFile = file
    loadQualityCache(file)
    log.info('Quality cache loaded', { file, entries: qualityCache.size })
}

/** Forget everything and stop saving (tests). */
export function resetQualityCache() {
    qualityCache.clear()
    inFlight.clear()
    clearTimeout(flushTimer)
    flushTimer = null
    persistFile = null
}

/**
 * Get cache statistics
 */
export function getQualityCacheStats() {
    return {
        size: qualityCache.size,
        maxSize: MAX_CACHE_SIZE,
        ttlMinutes: FOUND_TTL_MS / 60000,
        emptyTtlMinutes: EMPTY_TTL_MS / 60000,
        persisted: Boolean(persistFile)
    }
}
