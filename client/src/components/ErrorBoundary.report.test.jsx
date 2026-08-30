// @vitest-environment happy-dom
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../utils/clientTrace', () => ({
    reportClientEvent: vi.fn(() => Promise.resolve(true)),
    installGlobalErrorReporting: vi.fn(() => () => {})
}))

import { reportClientEvent } from '../utils/clientTrace'
import ErrorBoundary from './ErrorBoundary'

const Boom = () => { throw new Error('render exploded') }

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ErrorBoundary reporting', () => {
    it('ships the crash to the server instead of only the console', () => {
        // The TV console is unreachable, so a crash used to leave nothing but a
        // photo of the fallback screen.
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        render(<ErrorBoundary><Boom /></ErrorBoundary>)

        expect(reportClientEvent).toHaveBeenCalledTimes(1)
        const payload = reportClientEvent.mock.calls[0][0]
        expect(payload.kind).toBe('react-render')
        expect(payload.message).toContain('render exploded')
        expect(typeof payload.componentStack).toBe('string')
        consoleError.mockRestore()
    })
})
