/**
 * clientTrace.js — ship client-side failures to the server.
 *
 * The TV has no reachable console: ErrorBoundary only ever did `console.error`,
 * so a crash on the device left nothing behind but a screenshot of the fallback
 * UI. Errors now go to the same `/api/debug/dpad` timeline as the D-Pad trace,
 * which puts the crash in order right after the presses that led to it.
 */
import { getServerBase } from './serverApi'

const postEvents = async events => {
    const response = await fetch(`${getServerBase()}/api/debug/dpad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
}

/**
 * @returns {Promise<boolean>} whether the report landed. Never rejects — a
 * reporting failure must not become a second error on top of the first.
 */
export async function reportClientEvent(event, { send = postEvents } = {}) {
    try {
        await send([{ t: 'error', at: Date.now(), ...event }])
        return true
    } catch {
        return false
    }
}

const describeReason = reason => {
    if (!reason) return 'unknown'
    if (reason instanceof Error) return `${reason.name}: ${reason.message}`
    return String(reason)
}

/**
 * Catch what React's error boundary cannot: uncaught errors and rejected
 * promises. Returns a cleanup function.
 */
export function installGlobalErrorReporting({ report = reportClientEvent } = {}) {
    const onError = event => {
        report({
            kind: 'uncaught',
            message: event?.message || 'unknown',
            source: event?.filename || null,
            line: event?.lineno ?? null,
            stack: event?.error?.stack ? String(event.error.stack).slice(0, 2000) : null
        })
    }

    const onRejection = event => {
        report({
            kind: 'unhandledrejection',
            message: describeReason(event?.reason),
            stack: event?.reason?.stack ? String(event.reason.stack).slice(0, 2000) : null
        })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
        window.removeEventListener('error', onError)
        window.removeEventListener('unhandledrejection', onRejection)
    }
}
