import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TorrentModal from './TorrentModal.jsx'

vi.mock('@capacitor/app', () => ({
    App: {
        addListener: vi.fn(async () => ({ remove: vi.fn() }))
    }
}))

vi.mock('../utils/helpers', () => ({
    cleanTitle: (value) => value,
    formatSize: () => '1 GB',
    organizeFiles: (files) => ({ episodes: files, extras: [] })
}))

vi.mock('../utils/tmdbClient', () => ({
    getMetadata: () => null
}))

vi.mock('../hooks/useSpatialNavigation', () => ({
    default: {
        recoverFocus: vi.fn(),
        focusId: vi.fn()
    },
    useSpatialItem: () => () => {}
}))

describe('TorrentModal delete confirmation', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('asks for in-app confirmation before deleting a torrent', async () => {
        const onDelete = vi.fn(async () => {})

        render(
            <TorrentModal
                torrent={{
                    infoHash: 'abc123',
                    name: 'Test Torrent',
                    files: [{ index: 0, name: 'Episode 1.mkv', length: 1024 }]
                }}
                onClose={() => {}}
                onPlay={() => {}}
                onPlayAll={() => {}}
                onCopyUrl={() => {}}
                onDelete={onDelete}
            />
        )

        await act(async () => {
            vi.advanceTimersByTime(600)
            await Promise.resolve()
        })

        fireEvent.click(screen.getByRole('button', { name: '🗑 Delete' }))

        expect(onDelete).not.toHaveBeenCalled()
        expect(screen.getByText('Удалить торрент?')).toBeTruthy()

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
            await Promise.resolve()
        })

        expect(onDelete).toHaveBeenCalledWith('abc123')
    })
})
