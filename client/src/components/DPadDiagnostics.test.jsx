// @vitest-environment happy-dom
import React from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpatialEngine from '../hooks/useSpatialNavigation'
import DPadDiagnostics from './DPadDiagnostics'

afterEach(() => {
    cleanup()
    document.body.replaceChildren()
    SpatialEngine.zones = {}
    SpatialEngine.setDiagnosticsSink(null)
    vi.restoreAllMocks()
})

describe('DPadDiagnostics', () => {
    it('renders nothing when disabled', () => {
        const { container } = render(<DPadDiagnostics enabled={false} />)
        expect(container.innerHTML).toBe('')
        // and it must not claim the sink either
        expect(SpatialEngine.diagnosticsSink).toBeNull()
    })

    it('counts every key that reaches the window, even one the engine never sees', () => {
        render(<DPadDiagnostics enabled />)

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
        })

        // Two keys arrived; the engine reported no moves. That gap is the finding.
        expect(screen.getByTestId('dpad-diag-keys').textContent).toContain('2')
        expect(screen.getByTestId('dpad-diag-moves').textContent).toContain('0')
    })

    it('shows the outcome of each move the engine reports', () => {
        render(<DPadDiagnostics enabled />)

        act(() => {
            SpatialEngine.reportMove({
                key: 'ArrowDown',
                zone: 'main',
                zoneSize: 553,
                candidateCount: 33,
                currentInZone: false,
                before: 'BODY',
                found: false,
                target: null,
                after: 'BODY',
                moved: false,
                outcome: 'entered-from-outside'
            })
        })

        expect(screen.getByTestId('dpad-diag-moves').textContent).toContain('1')
        const log = screen.getByTestId('dpad-diag-log').textContent
        expect(log).toContain('entered-from-outside')
        expect(log).toContain('BODY')
        expect(log).toContain('33')
    })

    it('releases the sink when it unmounts', () => {
        const { unmount } = render(<DPadDiagnostics enabled />)
        expect(SpatialEngine.diagnosticsSink).toBeTypeOf('function')
        unmount()
        expect(SpatialEngine.diagnosticsSink).toBeNull()
    })
})

describe('DPadDiagnostics — streaming the run to the server', () => {
    it('queues one event per key and flushes a full batch', async () => {
        const sent = []
        const send = vi.fn(events => { sent.push(...events); return Promise.resolve() })

        render(<DPadDiagnostics enabled send={send} batchSize={2} />)

        await act(async () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
        })

        expect(send).toHaveBeenCalledTimes(1)
        expect(sent).toHaveLength(2)
        expect(sent[0].t).toBe('key')
        expect(sent[0].key).toBe('ArrowDown')
        // Sequence numbers are what let a 900-press run be put back in order.
        expect(sent[1].seq).toBe(sent[0].seq + 1)
    })

    it('streams move records alongside the raw keys', async () => {
        const sent = []
        const send = vi.fn(events => { sent.push(...events); return Promise.resolve() })

        render(<DPadDiagnostics enabled send={send} batchSize={1} />)

        await act(async () => {
            SpatialEngine.reportMove({
                key: 'ArrowDown', zone: 'main', zoneSize: 553, candidateCount: 33,
                currentInZone: false, beforeInDom: true, before: 'BODY',
                found: false, target: null, after: 'BODY', moved: false,
                outcome: 'entered-from-outside'
            })
        })

        expect(sent).toHaveLength(1)
        expect(sent[0].t).toBe('move')
        expect(sent[0].outcome).toBe('entered-from-outside')
    })

    it('keeps recording when the server is unreachable', async () => {
        const send = vi.fn(() => Promise.reject(new Error('offline')))

        render(<DPadDiagnostics enabled send={send} batchSize={1} />)

        await act(async () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
        })

        // The overlay must survive a dead server: the on-screen counters are the
        // fallback when the upload does not land.
        expect(screen.getByTestId('dpad-diag-keys').textContent).toContain('1')
        expect(screen.getByTestId('dpad-diag-sent').textContent).toContain('0')
    })

    it('counts what actually reached the server', async () => {
        const send = vi.fn(() => Promise.resolve())

        render(<DPadDiagnostics enabled send={send} batchSize={1} />)

        await act(async () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
        })

        expect(screen.getByTestId('dpad-diag-sent').textContent).toContain('1')
    })
})
