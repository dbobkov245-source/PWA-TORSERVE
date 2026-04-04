/**
 * Local library merge tests
 */

import fsPromises from 'fs/promises'
import os from 'os'
import path from 'path'
import { test, expect } from './test-runner.js'

test('mergeTorrentAndLocalLibrary keeps active torrent visible when a local duplicate has the same title', async () => {
    const { mergeTorrentAndLocalLibrary } = await import('../localLibrary.js')

    const torrents = [{
        infoHash: 'engine-1',
        name: 'Example Movie',
        isReady: false,
        progress: 0.12,
        files: []
    }]

    const localItems = [{
        infoHash: 'local-1',
        name: 'Example Movie',
        isReady: true,
        progress: 1,
        files: [{ index: 0, name: 'Example.Movie.2024.mkv', length: 123 }]
    }]

    const merged = mergeTorrentAndLocalLibrary(torrents, localItems)

    expect(merged.length).toBe(1)
    expect(merged[0].infoHash).toBe('engine-1')
    expect(merged[0].progress).toBe(0.12)
    expect(merged[0].isReady).toBe(false)
})

test('mergeTorrentAndLocalLibrary keeps ready torrent when local duplicate has same title', async () => {
    const { mergeTorrentAndLocalLibrary } = await import('../localLibrary.js')

    const torrents = [{
        infoHash: 'engine-1',
        name: 'Example Movie',
        isReady: true,
        progress: 1,
        files: [{ index: 0, name: 'Example.Movie.2024.mkv', length: 123 }]
    }]

    const localItems = [{
        infoHash: 'local-1',
        name: 'Example Movie',
        isReady: true,
        progress: 1,
        files: [{ index: 0, name: 'Example.Movie.2024.mkv', length: 123 }]
    }]

    const merged = mergeTorrentAndLocalLibrary(torrents, localItems)

    expect(merged.length).toBe(1)
    expect(merged[0].infoHash).toBe('engine-1')
})

test('mergeTorrentAndLocalLibrary keeps torrent when local duplicate is incomplete', async () => {
    const { mergeTorrentAndLocalLibrary } = await import('../localLibrary.js')

    const torrents = [{
        infoHash: 'engine-1',
        name: 'Example Show',
        isReady: false,
        progress: 0.42,
        files: [{ index: 0, name: 'Example.Show.S01E06.mkv', length: 123 }]
    }]

    const localItems = [{
        infoHash: 'local-1',
        name: 'Example Show',
        isLocal: true,
        isReady: false,
        progress: 0.2,
        downloaded: 20,
        totalSize: 100,
        files: [{ index: 0, name: 'Example.Show.S01E06.mkv', length: 100 }]
    }]

    const merged = mergeTorrentAndLocalLibrary(torrents, localItems)

    expect(merged.length).toBe(1)
    expect(merged[0].infoHash).toBe('engine-1')
})

test('refreshLocalLibrary marks sparse video files as incomplete', async () => {
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'pwa-local-library-'))
    const originalDownloadPath = process.env.DOWNLOAD_PATH
    const seriesDir = path.join(tmpDir, 'Example Show')
    const episodePath = path.join(seriesDir, 'Example.Show.S01E06.mkv')

    try {
        await fsPromises.mkdir(seriesDir, { recursive: true })
        await fsPromises.writeFile(episodePath, '')
        await fsPromises.truncate(episodePath, 64 * 1024 * 1024)

        process.env.DOWNLOAD_PATH = tmpDir

        const { refreshLocalLibrary, getLocalLibrarySnapshot } = await import(`../localLibrary.js?case=${Date.now()}`)
        await refreshLocalLibrary(true)

        const items = getLocalLibrarySnapshot()
        const item = items.find(entry => entry.name === 'Example Show')
        expect(Boolean(item)).toBe(true)
        expect(item.isReady).toBe(false)
        expect(item.downloaded < item.totalSize).toBeTruthy()
        expect(item.progress < 0.99).toBeTruthy()
    } finally {
        if (originalDownloadPath === undefined) {
            delete process.env.DOWNLOAD_PATH
        } else {
            process.env.DOWNLOAD_PATH = originalDownloadPath
        }

        await fsPromises.rm(tmpDir, { recursive: true, force: true })
    }
})

test('evictLocalLibraryItemByName removes a stale local entry from the cache', async () => {
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'pwa-local-library-evict-'))
    const originalDownloadPath = process.env.DOWNLOAD_PATH
    const moviePath = path.join(tmpDir, 'Crime.101.2026.WEB-DL.2160p.HDR10+.mkv')

    try {
        await fsPromises.writeFile(moviePath, 'partial')
        process.env.DOWNLOAD_PATH = tmpDir

        const { refreshLocalLibrary, getLocalLibrarySnapshot, evictLocalLibraryItemByName } = await import(`../localLibrary.js?evict=${Date.now()}`)
        await refreshLocalLibrary(true)

        const before = getLocalLibrarySnapshot()
        expect(before.length).toBe(1)
        expect(before[0].name).toBe('Crime.101.2026.WEB-DL.2160p.HDR10+.mkv')

        expect(evictLocalLibraryItemByName('Crime.101.2026.WEB-DL.2160p.HDR10+.mkv')).toBe(true)

        const after = getLocalLibrarySnapshot()
        expect(after.length).toBe(0)
    } finally {
        if (originalDownloadPath === undefined) {
            delete process.env.DOWNLOAD_PATH
        } else {
            process.env.DOWNLOAD_PATH = originalDownloadPath
        }

        await fsPromises.rm(tmpDir, { recursive: true, force: true })
    }
})
