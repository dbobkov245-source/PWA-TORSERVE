import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import AutoDownloadPanel from './AutoDownloadPanel'
import UpdateModal from './UpdateModal'
import TorrentModal from './TorrentModal'
import ContinueWatchingRow from './ContinueWatchingRow'
import { dispatchSystemBack } from '../utils/backButton'
import SpatialEngine, { useSpatialArbiter } from '../hooks/useSpatialNavigation'

vi.mock('../utils/appUpdater', () => ({ downloadAndInstall: vi.fn() }))
vi.mock('../utils/tmdbClient', () => ({ getMetadata: () => null, resolveMetadata: vi.fn(), getNextImageUrl: vi.fn() }))
afterEach(() => {
    cleanup(); vi.unstubAllGlobals()
    SpatialEngine.zones = {}; SpatialEngine.idMap = {}; SpatialEngine.activeZone = 'main'
})
function Arbiter() { useSpatialArbiter(); return null }
it('Android Back closes auto-download before the underlying page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) })))
    const onClose = vi.fn(), fallback = vi.fn()
    await act(async () => { render(<AutoDownloadPanel onClose={onClose} />) })
    act(() => dispatchSystemBack(fallback))
    expect(onClose).toHaveBeenCalledOnce()
    expect(fallback).not.toHaveBeenCalled()
})
it('Backspace edits the auto-download query instead of closing it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) })))
    const onClose = vi.fn()
    let view
    await act(async () => { view = render(<><Arbiter /><AutoDownloadPanel onClose={onClose} /></>) })
    const input = view.getByPlaceholderText('Название сериала...')
    input.focus()
    expect(fireEvent.keyDown(input, { key: 'Backspace' })).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
})
it.each([false, true])('update consumes Back with forceUpdate=%s', forceUpdate => {
    const onDismiss = vi.fn(), fallback = vi.fn()
    render(<UpdateModal updateInfo={{ version: '4', versionCode: 50, url: 'https://example.test/app.apk', forceUpdate }} onDismiss={onDismiss} />)
    act(() => dispatchSystemBack(fallback))
    expect(onDismiss).toHaveBeenCalledTimes(forceUpdate ? 0 : 1)
    expect(fallback).not.toHaveBeenCalled()
})
it('delete confirmation contains arrows and Back returns to Delete', () => {
    const onClose = vi.fn()
    const view = render(<><Arbiter /><TorrentModal torrent={{ infoHash: 'abc', name: 'Movie', files: [] }} onClose={onClose} /></>)
    const trigger = view.getByRole('button', { name: '🗑 Delete' })
    act(() => trigger.focus())
    fireEvent.click(trigger)
    const cancel = view.getByRole('button', { name: 'Отмена' })
    const confirm = view.getByRole('button', { name: 'Удалить' })
    for (const [index, button] of [...view.container.querySelectorAll('button')].entries()) {
        Object.defineProperty(button, 'offsetParent', { configurable: true, value: document.body })
        button.getBoundingClientRect = () => ({ left: index * 100, right: index * 100 + 80, top: 0, bottom: 80, width: 80, height: 80 })
        button.scrollIntoView = vi.fn()
    }
    act(() => cancel.focus())
    fireEvent.keyDown(cancel, { key: 'ArrowLeft' })
    expect([cancel, confirm]).toContain(document.activeElement)
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(view.queryByText('Удалить торрент?')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(onClose).not.toHaveBeenCalled()
})
it('resume activates once per Enter with the global arbiter', () => {
    const onResume = vi.fn()
    const view = render(<><Arbiter /><ContinueWatchingRow items={[{ infoHash: 'abc', fileIndex: 0, torrentName: '', fileName: '' }]} onResume={onResume} /></>)
    const card = view.getByRole('button')
    act(() => card.focus())
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onResume).toHaveBeenCalledTimes(1)
})
