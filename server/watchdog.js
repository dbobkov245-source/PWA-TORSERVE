/**
 * Watchdog Module - Self-Healing Architecture
 * PWA-TorServe v2.1
 * 
 * Features:
 * - Non-blocking async monitoring loop
 * - RAM monitoring with hysteresis (30s delay for degraded)
 * - NFS Circuit Breaker (3 failures → 5min pause)
 * - Automatic counter reset on recovery
 */

import { db, safeWrite } from './db.js'
import fs from 'fs'
import path from 'path'
import { checkRules } from './autodownloader.js'

// ─────────────────────────────────────────────────────────────
// Configuration Constants
// ─────────────────────────────────────────────────────────────

const CONFIG = {
    CHECK_INTERVAL_MS: 30000,           // Main loop interval: 30s
    RAM_OK_THRESHOLD_MB: 800,           // ⬆ Relaxed for 100GB files
    RAM_DEGRADED_THRESHOLD_MB: 1000,    // ⬆ Limit increased to 1GB
    HYSTERESIS_DELAY_MS: 30000,         // 30s delay before degraded
    STORAGE_CHECK_TIMEOUT_MS: 5000,     // 5s timeout for storage check
    CIRCUIT_BREAKER_THRESHOLD: 3,       // 3 failures → circuit open
    CIRCUIT_BREAKER_COOLDOWN_MS: 300000 // 5 minutes cooldown
}

// ─────────────────────────────────────────────────────────────
// State Variables
// ─────────────────────────────────────────────────────────────

let degradedSince = null              // Timestamp when RAM first exceeded threshold
let circuitOpenUntil = null           // Timestamp when circuit breaker will retry
let isWatchdogRunning = false
let lastAutoDownloadCheck = 0         // Timestamp of last auto-download check

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getRAMUsageMB = () => {
    const used = process.memoryUsage()
    // Use RSS (Resident Set Size) instead of heapUsed
    // RSS includes buffers, video data, and system resources
    // This is what Android actually sees and may kill the process for
    return Math.round(used.rss / 1024 / 1024)
}

/**
 * Check storage accessibility with timeout
 * Creates directory if it doesn't exist
 * PHYSICAL WRITE TEST: writes .healthcheck file to verify R/W access
 * @returns {Promise<boolean>} true if storage is accessible
 */
const checkStorage = () => {
    return new Promise((resolve) => {
        // Default to ./downloads (relative to app dir) which works on Android Termux
        const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
        const healthFile = path.join(downloadPath, '.healthcheck')

        const timeout = setTimeout(() => {
            console.warn('[Watchdog] Storage check timeout!')
            resolve(false)
        }, CONFIG.STORAGE_CHECK_TIMEOUT_MS)

        // Ensure directory exists first
        fs.mkdir(downloadPath, { recursive: true }, (mkdirErr) => {
            if (mkdirErr && mkdirErr.code !== 'EEXIST') {
                clearTimeout(timeout)
                console.warn(`[Watchdog] Failed to create directory: ${mkdirErr.message}`)
                resolve(false)
                return
            }

            // PHYSICAL WRITE TEST: write timestamp to .healthcheck file
            const testData = `healthcheck:${Date.now()}`
            fs.writeFile(healthFile, testData, (writeErr) => {
                if (writeErr) {
                    clearTimeout(timeout)
                    console.warn(`[Watchdog] Write test failed: ${writeErr.message}`)
                    resolve(false)
                    return
                }

                // Clean up: delete the test file
                fs.unlink(healthFile, (unlinkErr) => {
                    clearTimeout(timeout)
                    if (unlinkErr) {
                        // Non-critical: file was written successfully
                        console.warn(`[Watchdog] Cleanup failed: ${unlinkErr.message}`)
                    }
                    resolve(true)
                })
            })
        })
    })
}

// ─────────────────────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────────────────────

/**
 * Update server status with persistence
 * @param {string} newStatus - 'ok' | 'degraded' | 'error' | 'circuit_open'
 */
const updateStatus = async (newStatus) => {
    const currentStatus = db.data.serverStatus

    if (currentStatus !== newStatus) {
        console.log(`[Watchdog] Status change: ${currentStatus} → ${newStatus}`)
        db.data.serverStatus = newStatus
        db.data.lastStateChange = Date.now()

        // Reset counters on recovery to OK
        if (newStatus === 'ok') {
            db.data.storageFailures = 0
            degradedSince = null
            console.log('[Watchdog] Recovery complete, counters reset')
        }

        await safeWrite(db)
    }
}

/**
 * Main watchdog check cycle
 */
const performCheck = async () => {
    const now = Date.now()
    const ramMB = getRAMUsageMB()

    // ─── Circuit Breaker Check ───
    if (circuitOpenUntil) {
        if (now < circuitOpenUntil) {
            // Still in cooldown, skip all checks
            const remainingMs = circuitOpenUntil - now
            console.log(`[Watchdog] Circuit open, retry in ${Math.round(remainingMs / 1000)}s`)
            return
        }

        // Cooldown expired, attempt recovery
        console.log('[Watchdog] Circuit breaker: attempting recovery...')
        const storageOk = await checkStorage()

        if (storageOk) {
            circuitOpenUntil = null
            await updateStatus('ok')
            console.log('[Watchdog] Circuit breaker: recovery successful!')
        } else {
            // Retry failed, extend cooldown
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            // Update lastStateChange so client shows correct elapsed time
            db.data.lastStateChange = now
            await safeWrite(db)
            console.warn('[Watchdog] Circuit breaker: recovery failed, extending cooldown')
        }
        return
    }

    // ─── Storage Check ───
    const storageOk = await checkStorage()

    if (!storageOk) {
        db.data.storageFailures = (db.data.storageFailures || 0) + 1
        console.warn(`[Watchdog] Storage failure #${db.data.storageFailures}`)

        if (db.data.storageFailures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            await updateStatus('circuit_open')
            console.error('[Watchdog] Circuit breaker OPEN! Pausing checks for 5 minutes.')
            return
        }
    } else {
        // Storage OK, reset failure counter
        if (db.data.storageFailures > 0) {
            db.data.storageFailures = 0
            await safeWrite(db)
        }
    }

    // ─── RAM Check with Hysteresis ───
    if (ramMB > CONFIG.RAM_DEGRADED_THRESHOLD_MB) {
        if (!degradedSince) {
            degradedSince = now
            console.log(`[Watchdog] RAM ${ramMB}MB > threshold, starting hysteresis timer`)
        } else if (now - degradedSince >= CONFIG.HYSTERESIS_DELAY_MS) {
            await updateStatus('degraded')
        }
    } else if (ramMB < CONFIG.RAM_OK_THRESHOLD_MB) {
        // RAM is OK
        if (db.data.serverStatus === 'degraded') {
            await updateStatus('ok')
        }
        degradedSince = null
    }

    // Log current state
    console.log(`[Watchdog] RAM: ${ramMB}MB | Status: ${db.data.serverStatus} | Storage Failures: ${db.data.storageFailures}`)

    // ─── Auto-Downloader Check ───
    await runAutoDownloadCheck()
}

// ─────────────────────────────────────────────────────────────
// 📺 Auto-Downloader Integration
// ─────────────────────────────────────────────────────────────

const runAutoDownloadCheck = async () => {
    const settings = db.data.autoDownloadSettings || { enabled: false, intervalMinutes: 30 }

    if (!settings.enabled) return

    const intervalMs = (settings.intervalMinutes || 30) * 60 * 1000
    const now = Date.now()

    if (now - lastAutoDownloadCheck < intervalMs) return

    lastAutoDownloadCheck = now

    try {
        console.log('[Watchdog] Running auto-download check...')
        const result = await checkRules()
        if (result.downloaded > 0) {
            console.log(`[Watchdog] Auto-downloaded ${result.downloaded} new episode(s)`)
        }
    } catch (err) {
        console.error('[Watchdog] Auto-download check failed:', err.message)
    }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Start the async watchdog loop
 */
export const startWatchdog = async () => {
    if (isWatchdogRunning) {
        console.warn('[Watchdog] Already running!')
        return
    }

    isWatchdogRunning = true
    console.log('[Watchdog] Starting async monitoring loop...')

    // 🔥 v2.3.2: Reset circuit_open on startup (it persisted from previous session)
    if (db.data.serverStatus === 'circuit_open') {
        console.log('[Watchdog] Detected persisted circuit_open, checking storage...')
        const storageOk = await checkStorage()
        if (storageOk) {
            db.data.serverStatus = 'ok'
            db.data.storageFailures = 0
            circuitOpenUntil = null
            await safeWrite(db)
            console.log('[Watchdog] Storage OK, reset to normal status')
        } else {
            // Storage still broken, keep circuit open with fresh cooldown
            circuitOpenUntil = Date.now() + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            db.data.lastStateChange = Date.now()
            await safeWrite(db)
            console.warn('[Watchdog] Storage still unavailable, circuit remains open')
        }
    }

    // Initial check
    try {
        await performCheck()
    } catch (err) {
        console.error('[Watchdog] Initial check failed:', err.message)
    }

    // Non-blocking loop with error recovery
    while (isWatchdogRunning) {
        await sleep(CONFIG.CHECK_INTERVAL_MS)
        try {
            await performCheck()
        } catch (err) {
            // Log error but DON'T crash - watchdog must survive
            console.error('[Watchdog] Check failed, will retry:', err.message)
        }
    }
}

/**
 * Stop the watchdog loop
 */
export const stopWatchdog = () => {
    isWatchdogRunning = false
    console.log('[Watchdog] Stopped')
}

/**
 * Get current server state for API responses
 */
export const getServerState = () => {
    return {
        serverStatus: db.data.serverStatus,
        lastStateChange: db.data.lastStateChange,
        storageFailures: db.data.storageFailures
    }
}
