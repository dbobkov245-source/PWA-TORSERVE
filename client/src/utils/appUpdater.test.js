import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
    mockTVPlayer,
    mockCapacitor,
    mockCapacitorHttp,
    mockFilesystem
} = vi.hoisted(() => ({
    mockTVPlayer: {
        getAppVersion: vi.fn(),
        installApk: vi.fn()
    },
    mockCapacitor: {
        isNativePlatform: vi.fn(() => true)
    },
    mockCapacitorHttp: {
        get: vi.fn()
    },
    mockFilesystem: {
        stat: vi.fn(),
        getUri: vi.fn(),
        writeFile: vi.fn()
    }
}))

vi.mock('@capacitor/core', () => ({
    Capacitor: mockCapacitor,
    CapacitorHttp: mockCapacitorHttp,
    registerPlugin: vi.fn(() => mockTVPlayer)
}))

vi.mock('@capacitor/filesystem', () => ({
    Filesystem: mockFilesystem,
    Directory: {
        Cache: 'CACHE'
    }
}))

import { tryInstallPending } from './appUpdater.js'

describe('tryInstallPending', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()

        mockCapacitor.isNativePlatform.mockReturnValue(true)
        mockTVPlayer.getAppVersion.mockResolvedValue({
            versionName: '3.10.0',
            versionCode: 12
        })
        mockFilesystem.stat.mockResolvedValue({
            type: 'file'
        })
        mockFilesystem.getUri.mockResolvedValue({
            uri: 'file:///cache/update-3.10.0.apk'
        })
    })

    it('clears stale pending install when the same version is already installed', async () => {
        localStorage.setItem('app_update_pending_install', JSON.stringify({
            fileName: 'update-3.10.0.apk',
            version: '3.10.0',
            versionCode: 12,
            url: 'https://example.com/app.apk'
        }))

        const started = await tryInstallPending()

        expect(started).toBe(false)
        expect(mockTVPlayer.installApk).not.toHaveBeenCalled()
        expect(localStorage.getItem('app_update_pending_install')).toBeNull()
    })

    it('retries cached install when the installed version is still older', async () => {
        mockTVPlayer.getAppVersion.mockResolvedValue({
            versionName: '3.9.0',
            versionCode: 11
        })
        localStorage.setItem('app_update_pending_install', JSON.stringify({
            fileName: 'update-3.10.0.apk',
            version: '3.10.0',
            versionCode: 12,
            url: 'https://example.com/app.apk'
        }))

        const started = await tryInstallPending()

        expect(started).toBe(true)
        expect(mockFilesystem.getUri).toHaveBeenCalledWith({
            path: 'update-3.10.0.apk',
            directory: 'CACHE'
        })
        expect(mockTVPlayer.installApk).toHaveBeenCalledWith({
            path: 'file:///cache/update-3.10.0.apk'
        })
    })
})
