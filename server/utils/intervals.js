/**
 * intervals.js — Centralized interval registry
 * ADR-001 O6: All background intervals register here for graceful shutdown
 */

const registry = new Map()

/**
 * Register a background interval
 * @param {string} name - Unique identifier for the interval
 * @param {Function} fn - Function to execute
 * @param {number} ms - Interval in milliseconds
 * @returns {NodeJS.Timeout} - Interval ID
 */
export function registerInterval(name, fn, ms) {
    // Clear existing if re-registering
    if (registry.has(name)) {
        clearInterval(registry.get(name))
    }

    const id = setInterval(fn, ms)
    registry.set(name, id)
    console.log(`[Intervals] Registered: ${name} (${ms}ms)`)
    return id
}

/**
 * Clear a specific interval by name
 * @param {string} name - Interval name
 */
export function clearRegisteredInterval(name) {
    if (registry.has(name)) {
        clearInterval(registry.get(name))
        registry.delete(name)
        console.log(`[Intervals] Cleared: ${name}`)
    }
}

/**
 * Clear all registered intervals (for graceful shutdown)
 */
export function clearAllIntervals() {
    const count = registry.size
    for (const [name, id] of registry.entries()) {
        clearInterval(id)
        console.log(`[Intervals] Shutdown: ${name}`)
    }
    registry.clear()
    console.log(`[Intervals] All ${count} intervals cleared`)
}

/**
 * Get list of registered intervals
 */
export function getIntervalNames() {
    return Array.from(registry.keys())
}
