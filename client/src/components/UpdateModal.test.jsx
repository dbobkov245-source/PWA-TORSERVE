import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UpdateModal from './UpdateModal.jsx'
import SpatialEngine from '../hooks/useSpatialNavigation.js'

const { downloadAndInstallMock } = vi.hoisted(() => ({
    downloadAndInstallMock: vi.fn()
}))

vi.mock('../utils/appUpdater', () => ({
    downloadAndInstall: downloadAndInstallMock
}))

const updateInfo = {
    available: true,
    currentVersion: '3.17.2',
    version: '3.18.0',
    versionCode: 38,
    url: 'https://updates.invalid/app.apk',
    forceUpdate: false
}

describe('UpdateModal spatial focus', () => {
    beforeEach(() => {
        SpatialEngine.zones = {}
        SpatialEngine.idMap = {}
        SpatialEngine.activeZone = 'modal'
        downloadAndInstallMock.mockReset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('focuses Update first and restores the previous element on dismiss', () => {
        const previous = document.createElement('button')
        previous.textContent = 'Previous'
        document.body.append(previous)
        previous.focus()

        const view = render(
            <UpdateModal updateInfo={updateInfo} onDismiss={() => {}} />
        )

        expect(document.activeElement).toBe(
            screen.getByRole('button', { name: 'Обновить' })
        )

        view.unmount()
        expect(document.activeElement).toBe(previous)
        previous.remove()
    })

    it('keeps a forced update with one action focused', () => {
        render(
            <UpdateModal
                updateInfo={{ ...updateInfo, forceUpdate: true }}
                onDismiss={() => {}}
            />
        )

        expect(screen.queryByRole('button', { name: 'Позже' })).toBeNull()
        expect(document.activeElement).toBe(
            screen.getByRole('button', { name: 'Обновить' })
        )
    })

    it('returns focus to the retry action after a download error', async () => {
        downloadAndInstallMock.mockRejectedValue(new Error('Network failed'))
        render(
            <UpdateModal updateInfo={updateInfo} onDismiss={() => {}} />
        )

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Обновить' }))
        })

        await waitFor(() => {
            expect(document.activeElement).toBe(
                screen.getByRole('button', { name: 'Попробовать снова' })
            )
        })
    })
})
