/**
 * imageCache.js — Server-side disk cache for poster images
 * ADR-001 O2: Reduces TMDB API calls and improves latency
 * 
 * Features:
 * - LRU disk cache with configurable TTL and size limits
 * - Graceful fallback on cache errors
 * - Automatic cleanup via daily watchdog
 */

import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// Configuration from env with sane defaults
const CACHE_DIR = process.env.IMAGE_CACHE_DIR || './data/image-cache'
const CACHE_TTL_DAYS = parseInt(process.env.IMAGE_CACHE_TTL_DAYS) || 7
const CACHE_MAX_MB = parseInt(process.env.IMAGE_CACHE_MAX_MB) || 50
const CACHE_MAX_FILES = 1000

const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
const CACHE_MAX_BYTES = CACHE_MAX_MB * 1024 * 1024

// Ensure cache directory exists
let cacheReady = false
async function ensureCacheDir() {
    if (cacheReady) return true
    try {
        await fsp.mkdir(CACHE_DIR, { recursive: true })
        cacheReady = true
        console.log(`[ImageCache] Cache directory ready: ${CACHE_DIR}`)
        return true
    } catch (err) {
        console.error('[ImageCache] Failed to create cache dir:', err.message)
        return false
    }
}

// Generate cache key from URL
function getCacheKey(url) {
    const hash = crypto.createHash('md5').update(url).digest('hex')
    // Extract extension from URL
    const ext = path.extname(new URL(url).pathname) || '.jpg'
    return `${hash}${ext}`
}

// Get cached image path
function getCachePath(key) {
    return path.join(CACHE_DIR, key)
}

/**
 * Check if image is cached and valid
 * @param {string} url - Original image URL
 * @returns {Promise<string|null>} - Cache file path if valid, null otherwise
 */
export async function getCachedImage(url) {
    if (!await ensureCacheDir()) return null

    const key = getCacheKey(url)
    const cachePath = getCachePath(key)

    try {
        const stat = await fsp.stat(cachePath)
        const age = Date.now() - stat.mtimeMs

        if (age < CACHE_TTL_MS) {
            console.log(`[ImageCache] HIT: ${key}`)
            return cachePath
        } else {
            // Expired - delete async
            fsp.unlink(cachePath).catch(() => { })
            console.log(`[ImageCache] EXPIRED: ${key}`)
        }
    } catch {
        // File doesn't exist
    }

    return null
}

/**
 * Save image to cache
 * @param {string} url - Original image URL
 * @param {Buffer} data - Image data
 * @returns {Promise<string|null>} - Cache file path if saved, null on error
 */
export async function cacheImage(url, data) {
    if (!await ensureCacheDir()) return null
    if (!data || data.length === 0) return null

    const key = getCacheKey(url)
    const cachePath = getCachePath(key)

    try {
        await fsp.writeFile(cachePath, data)
        console.log(`[ImageCache] SAVED: ${key} (${(data.length / 1024).toFixed(1)}KB)`)
        return cachePath
    } catch (err) {
        console.error('[ImageCache] Failed to save:', err.message)
        return null
    }
}

/**
 * Cleanup expired files and enforce size limits
 * Should be called by watchdog once per day
 */
export async function cleanupCache() {
    if (!await ensureCacheDir()) return { removed: 0, freedMB: 0 }

    try {
        const files = await fsp.readdir(CACHE_DIR)
        const now = Date.now()
        let totalSize = 0
        let removed = 0
        let freedBytes = 0

        // Collect file stats
        const fileStats = []
        for (const file of files) {
            const filePath = path.join(CACHE_DIR, file)
            try {
                const stat = await fsp.stat(filePath)
                if (stat.isFile()) {
                    const age = now - stat.mtimeMs

                    // Remove expired
                    if (age > CACHE_TTL_MS) {
                        await fsp.unlink(filePath)
                        removed++
                        freedBytes += stat.size
                        continue
                    }

                    totalSize += stat.size
                    fileStats.push({ path: filePath, mtime: stat.mtimeMs, size: stat.size })
                }
            } catch { /* skip problematic files */ }
        }

        // Enforce size limit (LRU eviction)
        if (totalSize > CACHE_MAX_BYTES || fileStats.length > CACHE_MAX_FILES) {
            // Sort by oldest first
            fileStats.sort((a, b) => a.mtime - b.mtime)

            // Remove until under limits
            while ((totalSize > CACHE_MAX_BYTES * 0.8 || fileStats.length > CACHE_MAX_FILES * 0.8) && fileStats.length > 0) {
                const oldest = fileStats.shift()
                try {
                    await fsp.unlink(oldest.path)
                    totalSize -= oldest.size
                    freedBytes += oldest.size
                    removed++
                } catch { /* ignore */ }
            }
        }

        const result = { removed, freedMB: (freedBytes / 1024 / 1024).toFixed(2) }
        if (removed > 0) {
            console.log(`[ImageCache] Cleanup: removed ${removed} files, freed ${result.freedMB}MB`)
        }
        return result

    } catch (err) {
        console.error('[ImageCache] Cleanup error:', err.message)
        return { removed: 0, freedMB: 0, error: err.message }
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
    if (!await ensureCacheDir()) return { files: 0, sizeMB: 0 }

    try {
        const files = await fsp.readdir(CACHE_DIR)
        let totalSize = 0

        for (const file of files) {
            try {
                const stat = await fsp.stat(path.join(CACHE_DIR, file))
                if (stat.isFile()) totalSize += stat.size
            } catch { /* skip */ }
        }

        return {
            files: files.length,
            sizeMB: (totalSize / 1024 / 1024).toFixed(2),
            maxMB: CACHE_MAX_MB,
            ttlDays: CACHE_TTL_DAYS
        }
    } catch {
        return { files: 0, sizeMB: 0 }
    }
}
