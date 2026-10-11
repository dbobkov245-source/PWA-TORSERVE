/**
 * resumeSync.js — share resume positions between TVs through the server.
 *
 * watchHistory keeps positions in this TV's localStorage; the server keeps
 * every TV's latest copy (/api/resume). Push each local change, pull before
 * playback and on app start/resume. A change that cannot reach the server is
 * queued and retried on the next sync, so an offline TV catches up later.
 */

import { mergeRemoteResume, getLocalResumeEntries } from './watchHistory.js'

const OUTBOX_KEY = 'resume_outbox_v1'
const DEFAULT_TIMEOUT_MS = 1500

function loadOutbox() {
    try {
        return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || {}
    } catch {
        return {}
    }
}

function saveOutbox(outbox) {
    try {
        localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox))
    } catch { /* localStorage unavailable */ }
}

function apiBase(serverUrl) {
    return `${(serverUrl || '').replace(/\/$/, '')}/api/resume`
}

async function fetchWithTimeout(url, init, timeoutMs) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...init, signal: controller.signal })
    } finally {
        clearTimeout(timer)
    }
}

async function postChange(serverUrl, { key, entry, deletedAt }, timeoutMs) {
    const body = entry ? { entry } : { deletedAt }
    const res = await fetchWithTimeout(`${apiBase(serverUrl)}/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }, timeoutMs)
    // 400 = the server will never accept it; drop rather than retry forever.
    if (!res.ok && res.status !== 400) throw new Error(`HTTP ${res.status}`)
}

/** Retry queued changes; each one that lands leaves the queue. */
async function flushOutbox(serverUrl, timeoutMs) {
    const outbox = loadOutbox()
    for (const [key, change] of Object.entries(outbox)) {
        try {
            await postChange(serverUrl, { key, ...change }, timeoutMs)
            delete outbox[key]
        } catch {
            break // server unreachable: keep the rest for next time
        }
    }
    saveOutbox(outbox)
}

/**
 * Push one local change (from recordPlaybackResult). Never throws.
 * @param {string} serverUrl
 * @param {{key: string, entry?: Object, deletedAt?: number} | null} change
 */
export async function pushResumeChange(serverUrl, change, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    if (!change?.key) return
    try {
        await postChange(serverUrl, change, timeoutMs)
    } catch {
        const outbox = loadOutbox()
        const { key, ...rest } = change
        outbox[key] = rest // the latest change per file is the only one that matters
        saveOutbox(outbox)
    }
}

/**
 * Two-way sync: take the other TV's positions, then upload this TV's that the
 * server lacks or holds an older copy of — positions saved before syncing
 * existed (v3.18.4 and earlier) or while the server was unreachable.
 * `upload: false` only takes — used right before Play, where uploading a
 * backlog would delay the film. Never throws.
 * @returns {Promise<boolean>} whether local positions changed
 */
export async function pullResume(serverUrl, { timeoutMs = DEFAULT_TIMEOUT_MS, upload = true } = {}) {
    try {
        await flushOutbox(serverUrl, timeoutMs)
        const res = await fetchWithTimeout(apiBase(serverUrl), {}, timeoutMs)
        if (!res.ok) return false
        const remote = await res.json()
        // Merge first: a remote tombstone removes the local copy, so a film the
        // other TV finished is never uploaded back.
        const changed = mergeRemoteResume(remote)
        if (!upload) return changed
        const serverUpdatedAt = new Map((remote.entries || []).map((e) =>
            [`${String(e.infoHash).toLowerCase()}:${e.fileIndex}`, e.updatedAt]))
        for (const { key, entry } of getLocalResumeEntries()) {
            if ((serverUpdatedAt.get(key) ?? -1) >= entry.updatedAt) continue
            await pushResumeChange(serverUrl, { key, entry }, { timeoutMs })
        }
        return changed
    } catch {
        return false
    }
}
