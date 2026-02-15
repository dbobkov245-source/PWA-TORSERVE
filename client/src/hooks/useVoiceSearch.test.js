/**
 * Tests for useVoiceSearch hook.
 *
 * Key invariant: window.prompt() is NEVER called.
 * Hybrid Flow: Primary (popup:false) -> Fallback (popup:true)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceSearch } from './useVoiceSearch.jsx'

// Mock SpeechRecognition from Capacitor
const mockAvailable = vi.fn()
const mockRequestPermissions = vi.fn()
const mockStart = vi.fn()
const mockStop = vi.fn().mockResolvedValue(undefined)

vi.mock('@capacitor-community/speech-recognition', () => ({
    SpeechRecognition: {
        available: (...args) => mockAvailable(...args),
        requestPermissions: (...args) => mockRequestPermissions(...args),
        start: (...args) => mockStart(...args),
        stop: (...args) => mockStop(...args),
    },
}))

describe('useVoiceSearch', () => {
    let promptSpy

    beforeEach(() => {
        vi.clearAllMocks()
        mockAvailable.mockResolvedValue({ available: true })
        mockRequestPermissions.mockResolvedValue({ speechRecognition: 'granted' })
        promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)
    })

    afterEach(() => {
        promptSpy.mockRestore()
        vi.useRealTimers()
    })

    // ── Primary Flow Checks ──

    it('returns transcript from primary (popup:false)', async () => {
        mockStart.mockResolvedValueOnce({ matches: ['Интерстеллар'] })
        const { result } = renderHook(() => useVoiceSearch())

        let transcript
        await act(async () => { transcript = await result.current.startListening() })

        expect(transcript).toBe('Интерстеллар')
        expect(mockStart).toHaveBeenCalledTimes(1)
        expect(mockStart).toHaveBeenCalledWith(
            expect.objectContaining({ popup: false, partialResults: false })
        )
        expect(promptSpy).not.toHaveBeenCalled()
    })

    it('does NOT fallback on cancel error "0"', async () => {
        mockStart.mockRejectedValueOnce(new Error('0'))
        const { result } = renderHook(() => useVoiceSearch())

        let transcript
        await act(async () => { transcript = await result.current.startListening() })

        expect(transcript).toBeNull()
        expect(mockStart).toHaveBeenCalledTimes(1)
    })

    it('does NOT fallback on cancel error "canceled" (1 l)', async () => {
        mockStart.mockRejectedValueOnce(new Error('canceled'))
        const { result } = renderHook(() => useVoiceSearch())

        let transcript
        await act(async () => { transcript = await result.current.startListening() })

        expect(transcript).toBeNull()
        expect(mockStart).toHaveBeenCalledTimes(1)
    })

    // ── Hybrid / Fallback Flow Checks ──

    it('falls back to popup:true on primary timeout', async () => {
        vi.useFakeTimers()
        mockStart
            .mockImplementationOnce(() => new Promise(() => { })) // Primary hangs
            .mockResolvedValueOnce({ matches: ['Аватар'] })      // Fallback succeeds

        const { result } = renderHook(() => useVoiceSearch())

        let transcript
        await act(async () => {
            const promise = result.current.startListening()
            await vi.advanceTimersByTimeAsync(4000)
            transcript = await promise
        })

        expect(transcript).toBe('Аватар')
        expect(mockStop).toHaveBeenCalledTimes(1)
        expect(mockStart).toHaveBeenNthCalledWith(1,
            expect.objectContaining({ popup: false })
        )
        expect(mockStart).toHaveBeenNthCalledWith(2,
            expect.objectContaining({ popup: true })
        )
    })

    it('DOES fallback on "Client side error"', async () => {
        mockStart
            .mockRejectedValueOnce(new Error('Client side error'))
            .mockResolvedValueOnce({ matches: ['Матрица'] })

        const { result } = renderHook(() => useVoiceSearch())

        let transcript
        await act(async () => { transcript = await result.current.startListening() })

        expect(transcript).toBe('Матрица')
        expect(mockStop).toHaveBeenCalledTimes(1)
        expect(mockStart).toHaveBeenCalledTimes(2)
    })

    it('fallback returns null (silent) on cancel error "0" without toast', async () => {
        vi.useFakeTimers()
        mockStart
            .mockImplementationOnce(() => new Promise(() => { })) // Primary timeout
            .mockRejectedValueOnce(new Error('0'))               // Fallback cancel

        const { result } = renderHook(() => useVoiceSearch())
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

        try {
            let transcript
            await act(async () => {
                const promise = result.current.startListening()
                await vi.advanceTimersByTimeAsync(4000)
                transcript = await promise
            })

            expect(transcript).toBeNull()
            expect(warnSpy).not.toHaveBeenCalled()
        } finally {
            warnSpy.mockRestore()
        }
    })

    it('fallback logs WARNING on real error (proxy for toast)', async () => {
        vi.useFakeTimers()
        mockStart
            .mockImplementationOnce(() => new Promise(() => { }))
            .mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useVoiceSearch())
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

        try {
            let transcript
            await act(async () => {
                const promise = result.current.startListening()
                await vi.advanceTimersByTimeAsync(4000)
                transcript = await promise
            })

            expect(transcript).toBeNull()
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Voice:fallback] error'),
                expect.any(Error)
            )
        } finally {
            warnSpy.mockRestore()
        }
    })

    // ── Resets Checks ──

    it('resets isListening to false after completion', async () => {
        mockStart.mockResolvedValue({ matches: ['test'] })
        const { result } = renderHook(() => useVoiceSearch())

        await act(async () => { await result.current.startListening() })
        expect(result.current.isListening).toBe(false)
    })

    it('NEVER calls window.prompt', async () => {
        mockAvailable.mockResolvedValue({ available: false })
        const { result } = renderHook(() => useVoiceSearch())
        await act(async () => { await new Promise(r => setTimeout(r, 10)) }) // Mount check
        await act(async () => { await result.current.startListening() })
        expect(promptSpy).not.toHaveBeenCalled()
    })
})
