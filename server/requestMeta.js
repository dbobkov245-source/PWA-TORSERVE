/**
 * Request metadata helpers for audit logging.
 */

function getHeader(req, name) {
    if (typeof req?.get === 'function') {
        const value = req.get(name)
        if (value) return value
    }

    const lower = name.toLowerCase()
    return req?.headers?.[lower] || req?.headers?.[name] || ''
}

/**
 * Format client IP and user agent for concise audit logs.
 *
 * @param {object} req
 * @returns {string}
 */
export function describeRequestSource(req) {
    const forwardedFor = getHeader(req, 'x-forwarded-for')
    const ip = (forwardedFor ? forwardedFor.split(',')[0] : '')?.trim()
        || req?.ip
        || req?.connection?.remoteAddress
        || req?.socket?.remoteAddress
        || 'unknown'

    const userAgent = (getHeader(req, 'user-agent') || 'unknown').trim() || 'unknown'
    return `ip=${ip} ua="${userAgent}"`
}
