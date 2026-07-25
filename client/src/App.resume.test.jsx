// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

const mocks = vi.hoisted(() => {
    const listeners = new Map()
    const removeHandles = new Map()
    return {
        listeners,
        removeHandles,
        addListener: vi.fn(async (eventName, listener) => {
            listeners.set(eventName, listener)
            const remove = vi.fn()
            removeHandles.set(eventName, remove)
            return { remove }
        })
    }
})

vi.mock('@capacitor/core', () => ({
    registerPlugin: () => ({}),
    Capacitor: { isNativePlatform: () => true },
    CapacitorHttp: {}
}))

vi.mock('@capacitor/app', () => ({
    App: {
        addListener: mocks.addListener,
        getLaunchUrl: vi.fn(async () => null),
        exitApp: vi.fn()
    }
}))

vi.mock('./hooks/useVoiceSearch.jsx', () => ({
    useVoiceSearch: () => ({
        startListening: vi.fn(),
        isListening: false,
        ToastPortal: () => null
    })
}))

vi.mock('./hooks/useMovieTorrentPreload.js', () => ({
    useMovieTorrentPreload: () => ({
        session: null,
        refresh: vi.fn()
    })
}))

vi.mock('./utils/appUpdater', () => ({
    checkForUpdate: vi.fn(async () => ({ available: false })),
    tryInstallPending: vi.fn(async () => false)
}))

vi.mock('./utils/serverUrlStore', () => ({
    loadServerUrlFromPrefs: vi.fn(async () => ''),
    persistServerUrl: vi.fn(async () => {})
}))

vi.mock('./utils/watchHistory.js', () => ({
    recordPlaybackResult: vi.fn(),
    getResumePosition: vi.fn(() => 0),
    getResumeItems: vi.fn(() => []),
    getResumeEntry: vi.fn(() => null),
    removeResumeEntries: vi.fn()
}))

vi.mock('./components/HomePanel', () => ({
    default: () => <button type="button">Home resume target</button>
}))
vi.mock('./components/Poster', () => ({ default: () => null }))
vi.mock('./components/SettingsPanel', () => ({ default: () => null }))
vi.mock('./components/SearchPanel', () => ({ default: () => null }))
vi.mock('./components/TorrentModal', () => ({ default: () => null }))
vi.mock('./components/AutoDownloadPanel', () => ({ default: () => null }))
vi.mock('./components/UpdateModal', () => ({ default: () => null }))

const okStatus = {
    ok: true,
    json: vi.fn(async () => ({ torrents: [] }))
}

describe('Android app resume', () => {
    beforeEach(() => {
        localStorage.setItem('serverUrl', 'http://media.local')
        mocks.listeners.clear()
        mocks.removeHandles.clear()
        mocks.addListener.mockClear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
        document.body.replaceChildren()
    })

    it('queues one immediate serialized status refresh without creating a second poll interval', async () => {
        let resolveInitialStatus
        const fetchStatus = vi.fn()
            .mockImplementationOnce(() => new Promise(resolve => {
                resolveInitialStatus = () => resolve(okStatus)
            }))
            .mockResolvedValue(okStatus)
        vi.stubGlobal('fetch', fetchStatus)
        const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')

        const view = render(<App />)
        await waitFor(() => expect(fetchStatus).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mocks.listeners.has('appStateChange')).toBe(true))

        const homeTarget = screen.getByRole('button', { name: 'Home resume target' })
        homeTarget.focus()
        mocks.listeners.get('appStateChange')({ isActive: false })
        mocks.listeners.get('appStateChange')({ isActive: true })
        mocks.listeners.get('appStateChange')({ isActive: true })

        expect(fetchStatus).toHaveBeenCalledTimes(1)
        expect(setIntervalSpy.mock.calls.filter(([, delay]) => delay === 5000)).toHaveLength(1)

        resolveInitialStatus()
        await waitFor(() => expect(fetchStatus).toHaveBeenCalledTimes(2))
        expect(document.activeElement).toBe(homeTarget)

        view.unmount()
        await waitFor(() => {
            expect(mocks.removeHandles.get('appStateChange')).toHaveBeenCalledOnce()
        })
    })
})
