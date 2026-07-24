// @vitest-environment happy-dom
import { useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { ErrorScreen } from './components/StatusBanners.jsx'
import SpatialEngine, {
    useSpatialArbiter,
    useSpatialItem
} from './hooks/useSpatialNavigation.js'

vi.mock('@capacitor/core', () => ({
    registerPlugin: () => ({}),
    Capacitor: { isNativePlatform: () => true },
    CapacitorHttp: {}
}))

vi.mock('@capacitor/app', () => ({
    App: {
        addListener: vi.fn(async () => ({ remove: vi.fn() })),
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
    default: () => <button className="focusable">Hidden Home</button>
}))
vi.mock('./components/Poster', () => ({ default: () => null }))
vi.mock('./components/SettingsPanel', () => ({ default: () => null }))
vi.mock('./components/SearchPanel', () => ({ default: () => null }))
vi.mock('./components/TorrentModal', () => ({ default: () => null }))
vi.mock('./components/AutoDownloadPanel', () => ({ default: () => null }))
vi.mock('./components/UpdateModal', () => ({ default: () => null }))

const makeVisible = (element, top) => {
    Object.defineProperty(element, 'offsetParent', {
        configurable: true,
        value: document.body
    })
    element.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        right: 400,
        top,
        bottom: top + 80,
        width: 400,
        height: 80
    }))
    element.scrollIntoView = vi.fn()
}

const ErrorHarness = ({ onHome, onRetry, onSettings }) => {
    const homeRef = useSpatialItem('main', 'hidden-home')
    const { setActiveZone } = useSpatialArbiter()

    useEffect(() => {
        setActiveZone('error')
    }, [setActiveZone])

    return (
        <>
            <button ref={homeRef} className="focusable" onClick={onHome}>
                Hidden Home
            </button>
            <ErrorScreen
                status="error"
                retryAfter={300}
                onRetry={onRetry}
                onSettings={onSettings}
            />
        </>
    )
}

describe('ErrorScreen spatial isolation', () => {
    beforeEach(() => {
        localStorage.setItem('serverUrl', 'http://127.0.0.1:1')
        SpatialEngine.zones = {}
        SpatialEngine.idMap = {}
        SpatialEngine.activeZone = 'main'
    })

    afterEach(() => {
        document.body.replaceChildren()
        vi.restoreAllMocks()
    })

    it('makes App activate the error zone when status polling fails', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('server unavailable')
        }))
        const setZone = vi.spyOn(SpatialEngine, 'setActiveZone')

        render(<App />)

        expect(await screen.findByText('Ошибка сервера')).toBeTruthy()
        await waitFor(() => {
            expect(setZone).toHaveBeenLastCalledWith('error')
        })
    })

    it('traps repeated arrows and handles Enter once without activating hidden Home', () => {
        const onHome = vi.fn()
        const onRetry = vi.fn()
        const onSettings = vi.fn()

        render(
            <ErrorHarness
                onHome={onHome}
                onRetry={onRetry}
                onSettings={onSettings}
            />
        )

        const settings = screen.getByRole('button', { name: /Настройки сервера/ })
        const retry = screen.getByRole('button', { name: /Повторить/ })
        const hiddenHome = screen.getByRole('button', { name: 'Hidden Home' })
        makeVisible(hiddenHome, 0)
        makeVisible(settings, 100)
        makeVisible(retry, 200)

        expect(SpatialEngine.zones.error?.size).toBe(2)
        expect(document.activeElement).toBe(settings)

        for (let repeat = 0; repeat < 3; repeat += 1) {
            for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
                fireEvent.keyDown(document.activeElement, { key })
                expect([settings, retry]).toContain(document.activeElement)
            }
        }

        settings.focus()
        fireEvent.keyDown(settings, { key: 'Enter' })

        expect(onSettings).toHaveBeenCalledTimes(1)
        expect(onRetry).not.toHaveBeenCalled()
        expect(onHome).not.toHaveBeenCalled()
    })
})
