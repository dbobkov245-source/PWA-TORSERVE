/**
 * traktApi.js — client for our backend's /api/trakt/* (Trakt.tv integration).
 *
 * The server holds the OAuth tokens + client_secret; the client never sees them.
 * Mirrors serverApi.js's server-base resolution.
 */
import { Capacitor } from '@capacitor/core'
import { resolveInitialServerUrl, resolveServerBaseUrl } from './helpers'

function getServerBase() {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('serverUrl')
    const isNative = Capacitor.isNativePlatform()
    const effectiveServerUrl = stored || resolveInitialServerUrl({ isNative, storedUrl: stored || '' })
    return resolveServerBaseUrl({ isNative, serverUrl: effectiveServerUrl, browserOrigin: window.location.origin })
}

async function req(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${getServerBase()}/api/trakt${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
    })
    if (!res.ok) {
        const error = new Error(`Trakt ${path} → HTTP ${res.status}`)
        error.body = await res.json().catch(() => null)
        throw error
    }
    return res.json()
}

/**
 * Human explanation of the server's last Trakt failure ({reason, status, at}).
 * 401/403 on the app-key calls means Trakt rejects TRAKT_CLIENT_ID itself —
 * reconnecting cannot help, the API app on developer.trakt.tv must be fixed.
 */
export function describeTraktError(lastError) {
    if (!lastError?.reason) return ''
    const { reason, status } = lastError
    const http = status ? ` (HTTP ${status})` : ''
    const rejectsKey = status === 401 || status === 403
    if ((reason === 'device_code_failed' || reason === 'discovery_failed') && rejectsKey) {
        return `Trakt не принимает ключ приложения${http}. Проверь приложение на developer.trakt.tv и TRAKT_CLIENT_ID/SECRET на сервере.`
    }
    if (reason === 'refresh_rejected') return `Trakt отозвал вход${http}. Подключи заново.`
    if (reason === 'refresh_unavailable') return `Trakt временно недоступен${http}, вход сохранён.`
    if (reason === 'scrobble_dropped') return 'Просмотры не отправляются в Trakt: он не подключён.'
    if (reason === 'disconnected') return 'Trakt отключили в настройках.'
    return `Ошибка Trakt: ${reason}${http}.`
}

/** { configured, connected, slug, watchedCount, lastError } */
export function getTraktStatus() {
    return req('/status')
}

/** Start device flow → { user_code, verification_url, expires_in, interval } */
export function startTraktDevice() {
    return req('/device', { method: 'POST' })
}

/** Poll authorization → { status: 'pending'|'authorized'|'expired'|'denied'|... } */
export function pollTraktDevice() {
    return req('/device/poll', { method: 'POST' })
}

export function disconnectTrakt() {
    return req('/disconnect', { method: 'POST' })
}

/**
 * Fire-and-forget scrobble. Never throws into the play flow.
 * @param {{tmdbId:number, mediaType?:string, progress?:number, action:'start'|'pause'|'stop'}} p
 */
export function scrobbleTrakt(p) {
    if (!p?.tmdbId) return Promise.resolve(null)
    return req('/scrobble', { method: 'POST', body: p }).catch((e) => {
        console.warn('[Trakt] scrobble failed:', e.message)
        return null
    })
}

/** { watched: number[], watchlist: [{tmdbId,title,year}] } */
export function getTraktSynced() {
    return req('/synced')
}
