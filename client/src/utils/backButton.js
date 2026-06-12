/**
 * backButton.js — single registry for the Android TV remote Back button.
 *
 * Capacitor fires EVERY registered 'backButton' listener on each press, so
 * scattered per-component listeners double-fire against any global one
 * (e.g. TorrentModal's delete-confirm would close together with the whole
 * modal). Instead: components push handlers onto a LIFO stack; one global
 * listener (wired in App.jsx) asks the topmost handler first and stops at
 * the first one that consumes the press. The DOM Escape/Backspace path in
 * useSpatialArbiter is intentionally untouched — this covers only the
 * system Back key, which never reaches the DOM.
 */

const handlers = []

/**
 * Register a Back handler. Returns an unsubscribe function.
 * Handler must return true when it consumed the press; false/undefined
 * passes control to the next handler down the stack (and finally to the
 * global fallback chain in App.jsx).
 */
export function pushBackHandler(fn) {
    const entry = { fn }
    handlers.push(entry)
    return () => {
        const idx = handlers.indexOf(entry)
        if (idx !== -1) handlers.splice(idx, 1)
    }
}

/**
 * Dispatch a system Back press: topmost registered handler first,
 * `fallback` (the central handleBack chain) when nobody consumed it.
 */
export function dispatchSystemBack(fallback) {
    for (let i = handlers.length - 1; i >= 0; i--) {
        try {
            if (handlers[i].fn() === true) return true
        } catch (err) {
            console.warn('[BackButton] handler failed:', err)
        }
    }
    if (typeof fallback === 'function') {
        fallback()
        return true
    }
    return false
}

/** Test helper / diagnostics */
export function getBackHandlerCount() {
    return handlers.length
}
