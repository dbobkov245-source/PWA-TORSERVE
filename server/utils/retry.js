/**
 * Retry Utility with Exponential Backoff
 * PWA-TorServe v2.3.3
 *
 * Usage:
 *   const result = await withRetry(() => fetchData(), { maxRetries: 3 })
 */

/**
 * Execute async function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.baseDelayMs - Base delay in ms (default: 1000)
 * @param {number} options.maxDelayMs - Maximum delay cap (default: 10000)
 * @param {Function} options.shouldRetry - Custom retry condition (default: always retry)
 * @param {Function} options.onRetry - Callback on each retry (optional)
 * @returns {Promise<any>} Result of the function
 */
export const withRetry = async (fn, options = {}) => {
    const {
        maxRetries = 3,
        baseDelayMs = 1000,
        maxDelayMs = 10000,
        shouldRetry = () => true,
        onRetry = null
    } = options

    let lastError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn(attempt)
        } catch (error) {
            lastError = error

            // Check if we should retry
            if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
                throw error
            }

            // Calculate delay with exponential backoff + jitter
            const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
            const jitter = Math.random() * 200 // 0-200ms jitter
            const delay = Math.min(exponentialDelay + jitter, maxDelayMs)

            if (onRetry) {
                onRetry(error, attempt + 1, delay)
            }

            await sleep(delay)
        }
    }

    throw lastError
}

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Common retry predicates
 */
export const retryPredicates = {
    // Retry on network errors
    networkError: (error) => {
        const networkCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']
        return networkCodes.includes(error.code)
    },

    // Retry on HTTP 5xx errors
    serverError: (error) => {
        return error.statusCode >= 500 && error.statusCode < 600
    },

    // Retry on rate limiting (429)
    rateLimited: (error) => {
        return error.statusCode === 429
    },

    // Combined: network + server errors
    transient: (error) => {
        return retryPredicates.networkError(error) ||
               retryPredicates.serverError(error) ||
               retryPredicates.rateLimited(error)
    }
}
