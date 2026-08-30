// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installGlobalErrorReporting, reportClientEvent } from './clientTrace'

afterEach(() => vi.restoreAllMocks())

describe('reportClientEvent', () => {
    it('sends the event to the debug endpoint in the shared envelope', async () => {
        const send = vi.fn(() => Promise.resolve())

        await reportClientEvent({ t: 'error', message: 'boom' }, { send })

        expect(send).toHaveBeenCalledTimes(1)
        const [events] = send.mock.calls[0]
        expect(events).toHaveLength(1)
        expect(events[0].message).toBe('boom')
        // Shares the D-Pad timeline on purpose: the crash then sits in order
        // right after the key presses that led to it.
        expect(typeof events[0].at).toBe('number')
    })

    it('defaults the type to error', async () => {
        const send = vi.fn(() => Promise.resolve())
        await reportClientEvent({ message: 'boom' }, { send })
        expect(send.mock.calls[0][0][0].t).toBe('error')
    })

    it('never throws when the server is unreachable', async () => {
        const send = vi.fn(() => Promise.reject(new Error('offline')))
        await expect(reportClientEvent({ message: 'boom' }, { send })).resolves.toBe(false)
    })
})

describe('installGlobalErrorReporting', () => {
    it('reports uncaught errors', () => {
        const report = vi.fn()
        const stop = installGlobalErrorReporting({ report })

        window.dispatchEvent(Object.assign(new Event('error'), {
            message: 'Cannot read properties of undefined',
            filename: 'index.js',
            lineno: 42
        }))

        expect(report).toHaveBeenCalledTimes(1)
        expect(report.mock.calls[0][0].message).toContain('Cannot read properties')
        stop()
    })

    it('reports unhandled promise rejections', () => {
        const report = vi.fn()
        const stop = installGlobalErrorReporting({ report })

        window.dispatchEvent(Object.assign(new Event('unhandledrejection'), {
            reason: new Error('fetch failed')
        }))

        expect(report).toHaveBeenCalledTimes(1)
        expect(report.mock.calls[0][0].kind).toBe('unhandledrejection')
        stop()
    })

    it('stops reporting once removed', () => {
        const report = vi.fn()
        const stop = installGlobalErrorReporting({ report })
        stop()

        window.dispatchEvent(Object.assign(new Event('error'), { message: 'later' }))

        expect(report).not.toHaveBeenCalled()
    })
})
