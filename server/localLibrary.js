import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import process from 'process'
import crypto from 'crypto'
import { logger } from './utils/logger.js'

const log = logger.child('LocalLibrary')

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.webm', '.mov', '.mpg', '.mpeg'])
const SCAN_TTL_MS = parseInt(process.env.LOCAL_LIBRARY_SCAN_TTL_MS || '60000', 10)

const cache = {
    scannedAt: 0,
    items: [],
    byHash: new Map()
}

let activeScanPromise = null

function normalizeLibraryName(name = '') {
    return String(name).trim().toLowerCase()
}

function hasPlayableVideoFiles(item) {
    if (!Array.isArray(item?.files) || item.files.length === 0) return false
    return item.isReady === true || Number(item?.progress || 0) >= 0.99
}

function shouldPreferLocalItem(torrentItem, localItem) {
    const localPlayable = hasPlayableVideoFiles(localItem)
    if (!localPlayable) return false

    const torrentPlayable = hasPlayableVideoFiles(torrentItem)
    return !torrentPlayable
}

function getDownloadPath() {
    return path.resolve(process.env.DOWNLOAD_PATH || './downloads')
}

function isVideoFile(name = '') {
    return VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase())
}

function makeInfoHash(absPath) {
    return crypto.createHash('sha1').update(`local:${absPath}`).digest('hex')
}

function safeResolved(base, maybeNested) {
    const baseResolved = path.resolve(base)
    const targetResolved = path.resolve(maybeNested)
    return targetResolved === baseResolved || targetResolved.startsWith(`${baseResolved}${path.sep}`)
}

async function collectVideoFiles(rootPath) {
    const collected = []

    async function walk(currentDir) {
        const entries = await fsPromises.readdir(currentDir, { withFileTypes: true })
        for (const entry of entries) {
            const absPath = path.join(currentDir, entry.name)
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || entry.name.startsWith('@') || entry.name.startsWith('#')) {
                    continue
                }
                await walk(absPath)
                continue
            }
            if (!entry.isFile()) continue
            if (!isVideoFile(entry.name)) continue

            const stat = await fsPromises.stat(absPath)
            const allocatedBytes = (typeof stat.blocks === 'number')
                ? stat.blocks * 512
                : stat.size
            const relativeName = path.relative(rootPath, absPath) || entry.name
            collected.push({
                absPath,
                name: relativeName,
                length: stat.size,
                downloaded: Math.min(allocatedBytes, stat.size)
            })
        }
    }

    const stat = await fsPromises.stat(rootPath)
    if (stat.isFile()) {
        if (!isVideoFile(path.basename(rootPath))) return []
        return [{
            absPath: rootPath,
            name: path.basename(rootPath),
            length: stat.size,
            downloaded: Math.min((typeof stat.blocks === 'number')
                ? stat.blocks * 512
                : stat.size, stat.size)
        }]
    }

    if (!stat.isDirectory()) return []
    await walk(rootPath)
    return collected
}

function toTorrentLikeItem(name, absRootPath, files, totalSize) {
    const infoHash = makeInfoHash(absRootPath)
    const downloaded = files.reduce((sum, file) => sum + Math.min(file.downloaded ?? file.length, file.length), 0)
    const progress = totalSize > 0 ? Math.min(downloaded / totalSize, 1) : 0
    const isReady = progress >= 0.99
    const indexedFiles = files
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map((file, index) => ({
            index,
            name: file.name,
            length: file.length,
            absPath: file.absPath
        }))

    return {
        infoHash,
        name,
        progress,
        isReady,
        downloaded,
        totalSize,
        downloadSpeed: 0,
        uploadSpeed: 0,
        numPeers: 0,
        eta: null,
        newFilesCount: 0,
        fileCount: indexedFiles.length,
        isLocal: true,
        files: indexedFiles
    }
}

async function scanLocalLibrary() {
    const downloadPath = getDownloadPath()
    let entries = []

    try {
        entries = await fsPromises.readdir(downloadPath, { withFileTypes: true })
    } catch (err) {
        log.warn('Unable to read download path', { downloadPath, error: err.message })
        cache.scannedAt = Date.now()
        cache.items = []
        cache.byHash = new Map()
        return
    }

    const discovered = []

    for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name.startsWith('@') || entry.name.startsWith('#')) {
            continue
        }
        const absPath = path.join(downloadPath, entry.name)
        try {
            const files = await collectVideoFiles(absPath)
            if (files.length === 0) continue

            const totalSize = files.reduce((sum, f) => sum + f.length, 0)
            discovered.push(toTorrentLikeItem(entry.name, absPath, files, totalSize))
        } catch (err) {
            log.warn('Skipping local entry', { path: absPath, error: err.message })
        }
    }

    const byHash = new Map(discovered.map(item => [item.infoHash, item]))
    cache.items = discovered
    cache.byHash = byHash
    cache.scannedAt = Date.now()

    log.info('Local library scanned', { count: discovered.length, downloadPath })
}

export async function refreshLocalLibrary(force = false) {
    const stale = (Date.now() - cache.scannedAt) > SCAN_TTL_MS
    if (!force && !stale) return cache.items
    if (!activeScanPromise) {
        activeScanPromise = scanLocalLibrary().finally(() => {
            activeScanPromise = null
        })
    }
    await activeScanPromise
    return cache.items
}

export function getLocalLibrarySnapshot() {
    return cache.items
}

export function mergeTorrentAndLocalLibrary(torrents = [], localItems = []) {
    const merged = []
    const usedLocalHashes = new Set()
    const localByName = new Map()

    for (const item of localItems) {
        const normalizedName = normalizeLibraryName(item?.name)
        if (!normalizedName || localByName.has(normalizedName)) continue
        localByName.set(normalizedName, item)
    }

    for (const torrent of torrents) {
        const normalizedName = normalizeLibraryName(torrent?.name)
        const localMatch = normalizedName ? localByName.get(normalizedName) : null

        if (localMatch && shouldPreferLocalItem(torrent, localMatch)) {
            merged.push(localMatch)
            usedLocalHashes.add(localMatch.infoHash)
            continue
        }

        merged.push(torrent)
    }

    const seenHashes = new Set(merged.map(item => item?.infoHash).filter(Boolean))
    const seenNames = new Set(
        merged
            .map(item => normalizeLibraryName(item?.name))
            .filter(Boolean)
    )

    for (const item of localItems) {
        const normalizedName = normalizeLibraryName(item?.name)
        if (seenHashes.has(item.infoHash)) continue
        if (usedLocalHashes.has(item.infoHash)) continue
        if (normalizedName && seenNames.has(normalizedName)) continue

        merged.push(item)
        seenHashes.add(item.infoHash)
        if (normalizedName) seenNames.add(normalizedName)
    }

    return merged
}

export function getLocalFile(infoHash, fileIndex) {
    const item = cache.byHash.get(infoHash)
    if (!item) return null
    const file = item.files?.[fileIndex]
    if (!file) return null
    return file
}

export async function deleteLocalEntry(infoHash) {
    await refreshLocalLibrary()
    const item = cache.byHash.get(infoHash)
    if (!item) return false

    const downloadPath = getDownloadPath()
    const primaryPath = path.resolve(downloadPath, item.name)
    const candidates = [primaryPath]

    for (const candidate of candidates) {
        if (!safeResolved(downloadPath, candidate)) continue
        try {
            await fsPromises.rm(candidate, { recursive: true, force: true })
            await refreshLocalLibrary(true)
            log.info('Local entry deleted', { infoHash, path: candidate })
            return true
        } catch (err) {
            log.warn('Failed to delete local entry candidate', { infoHash, path: candidate, error: err.message })
        }
    }

    return false
}

// Initial background scan on module load.
refreshLocalLibrary(true).catch(err => {
    log.warn('Initial local library scan failed', { error: err.message })
})
