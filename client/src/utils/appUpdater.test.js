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

import { checkForUpdate, tryInstallPending } from './appUpdater.js'

describe('checkForUpdate', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()

        mockCapacitor.isNativePlatform.mockReturnValue(true)
        mockTVPlayer.getAppVersion.mockResolvedValue({
            versionName: '3.17.0',
            versionCode: 35
        })
    })

    it('uses the persisted serverUrl for local NAS update metadata', async () => {
        localStorage.setItem('serverUrl', '192.168.8.203:3000')
        mockCapacitorHttp.get.mockResolvedValueOnce({
            status: 200,
            data: {
                version: '3.17.1',
                versionCode: 36,
                url: 'https://github.com/dbobkov245-source/PWA-TORSERVE/releases/download/v3.17.1/pwa-torserve-v3.17.1.apk'
            }
        })

        const update = await checkForUpdate()

        expect(mockCapacitorHttp.get).toHaveBeenCalledWith(expect.objectContaining({
            url: 'http://192.168.8.203:3000/version.json'
        }))
        expect(update.available).toBe(true)
        expect(update.url).toBe('http://192.168.8.203:3000/pwa-torserve-v3.17.1.apk')
    })
})

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
        mockTVPlayer.getAppVersion
            .mockResolvedValueOnce({
                versionName: '3.9.0',
                versionCode: 11
            })
            .mockResolvedValueOnce({
                versionName: '3.10.0',
                versionCode: 12
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
        expect(localStorage.getItem('app_update_pending_install')).toBeNull()
    })

    it('clears pending install when installer returns without updating the app', async () => {
        mockTVPlayer.getAppVersion
            .mockResolvedValueOnce({
                versionName: '3.9.0',
                versionCode: 11
            })
            .mockResolvedValueOnce({
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

        expect(started).toBe(false)
        expect(localStorage.getItem('app_update_pending_install')).toBeNull()
    })
})
