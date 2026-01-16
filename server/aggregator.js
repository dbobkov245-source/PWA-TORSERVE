/**
 * Aggregator - Multi-source torrent search aggregation
 * PWA-TorServe Provider Architecture v2.8.0
 * 
 * Combines results from multiple providers using Promise.allSettled
 * Implements:
 * - Parallel search across all enabled providers
 * - Timeout per provider
 * - Deduplication by infohash
 * - Partial success (returns results even if some providers fail)
 * - Search cache (5 min TTL)
 * - Circuit breaker per provider
 */

import { providerManager } from './providers/index.js'
import { searchCache } from './searchCache.js'
import { logger } from './utils/logger.js'

const log = logger.child('Aggregator')

// Search timeout per provider (ms)
const PROVIDER_TIMEOUT = 30000

// ─────────────────────────────────────────────────────────────
// 🔒 Circuit Breaker: Auto-disable failing providers
// ─────────────────────────────────────────────────────────────
const FAILURE_THRESHOLD = 3        // Failures before opening circuit
const RECOVERY_TIMEOUT = 5 * 60000 // 5 minutes before retry

const circuitBreakers = new Map() // provider -> { failures, openedAt }

function getCircuitState(providerName) {
    if (!circuitBreakers.has(providerName)) {
        circuitBreakers.set(providerName, { failures: 0, openedAt: null })
    }
    return circuitBreakers.get(providerName)
}

function isCircuitOpen(providerName) {
    const state = getCircuitState(providerName)
    if (!state.openedAt) return false

    // Check if recovery timeout passed
    if (Date.now() - state.openedAt > RECOVERY_TIMEOUT) {
        state.failures = 0
        state.openedAt = null
        log.info('Circuit closed (recovery)', { provider: providerName })
        return false
    }
    return true
}

function recordSuccess(providerName) {
    const state = getCircuitState(providerName)
    state.failures = 0
    state.openedAt = null
}

function recordFailure(providerName) {
    const state = getCircuitState(providerName)
    state.failures++

    if (state.failures >= FAILURE_THRESHOLD && !state.openedAt) {
        state.openedAt = Date.now()
        log.warn('Circuit opened', { provider: providerName, failures: state.failures })
    }
}

// ─────────────────────────────────────────────────────────────

/**
 * Search across all enabled providers (with cache)
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {boolean} options.skipCache - Skip cache lookup
 * @returns {Promise<{results: Array, errors: Array, providers: Object, cached: boolean}>}
 */
export async function search(query, options = {}) {
    // Check cache first
    if (!options.skipCache) {
        const cached = searchCache.get(query)
        if (cached) {
            log.info('📦 Cache hit', { query, resultsCount: cached.results.length })
            return { ...cached, errors: [], cached: true }
        }
    }

    const providers = providerManager.getEnabled()
        .filter(p => !isCircuitOpen(p.name))

    if (providers.length === 0) {
        log.warn('No available providers')
        return { results: [], errors: ['No available providers'], providers: {}, cached: false }
    }

    log.info('🔍 Aggregated search', { query, providersCount: providers.length })

    // Create search promises with timeout
    const searchPromises = providers.map(async (provider) => {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), PROVIDER_TIMEOUT)
        )

        try {
            const results = await Promise.race([
                provider.search(query),
                timeoutPromise
            ])
            recordSuccess(provider.name)
            return { provider: provider.name, results, success: true }
        } catch (error) {
            recordFailure(provider.name)
            return { provider: provider.name, error: error.message, success: false }
        }
    })

    // Wait for all providers (partial success allowed)
    const outcomes = await Promise.allSettled(searchPromises)

    // Collect results and errors
    const allResults = []
    const errors = []
    const providerStats = {}

    for (const outcome of outcomes) {
        if (outcome.status === 'fulfilled') {
            const { provider, results, success, error } = outcome.value

            if (success && results) {
                allResults.push(...results)
                providerStats[provider] = { count: results.length, status: 'ok' }
                log.info(`✅ ${provider}`, { count: results.length })
            } else {
                errors.push({ provider, error })
                providerStats[provider] = { count: 0, status: 'error', error }
                log.warn(`❌ ${provider}`, { error })
            }
        } else {
            log.error('Unexpected rejection', outcome.reason)
        }
    }

    // Add skipped providers (circuit open)
    const skipped = providerManager.getEnabled()
        .filter(p => isCircuitOpen(p.name))
    for (const p of skipped) {
        providerStats[p.name] = { count: 0, status: 'circuit_open' }
    }

    // Deduplicate by infohash
    const deduped = deduplicateByInfohash(allResults)

    // Store in cache if we got results
    if (deduped.length > 0) {
        searchCache.set(query, deduped, providerStats)
    }

    log.info('✅ Aggregation complete', {
        totalResults: deduped.length,
        fromProviders: Object.keys(providerStats).length,
        errors: errors.length
    })

    return { results: deduped, errors, providers: providerStats, cached: false }
}

/**
 * Get magnet link for a torrent from specific provider
 */
export async function getMagnet(providerName, id) {
    const provider = providerManager.get(providerName)
    if (!provider) {
        return { error: `Provider not found: ${providerName}` }
    }
    return provider.getMagnet(id)
}

/**
 * Get status of all providers (including circuit state)
 */
export function getProvidersStatus() {
    return providerManager.getAll().map(p => ({
        name: p.name,
        enabled: p.enabled,
        healthy: p.isHealthy(),
        circuitOpen: isCircuitOpen(p.name),
        failures: getCircuitState(p.name).failures
    }))
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    return searchCache.getStats()
}

/**
 * Reset circuit breaker for a provider
 */
export function resetCircuit(providerName) {
    const state = getCircuitState(providerName)
    state.failures = 0
    state.openedAt = null
    log.info('Circuit reset', { provider: providerName })
}

/**
 * Deduplicate results by infohash
 */
function deduplicateByInfohash(results) {
    const seen = new Map()

    for (const result of results) {
        const hash = extractInfohash(result.magnet)

        if (!hash) {
            seen.set(`nohash_${Math.random()}`, result)
            continue
        }

        const existing = seen.get(hash)
        if (!existing || (result.seeders > existing.seeders)) {
            seen.set(hash, result)
        }
    }

    return Array.from(seen.values())
}

/**
 * Extract infohash from magnet link
 */
function extractInfohash(magnet) {
    if (!magnet) return null

    const hexMatch = magnet.match(/urn:btih:([a-fA-F0-9]{40})/i)
    if (hexMatch) return hexMatch[1].toLowerCase()

    const base32Match = magnet.match(/urn:btih:([A-Z2-7]{32})/i)
    if (base32Match) return base32Match[1].toLowerCase()

    return null
}
