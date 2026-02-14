/**
 * Tests for useVoiceSearch hook.
 *
 * Key invariant: window.prompt() is NEVER called.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceSearch } from './useVoiceSearch.jsx'

// Mock SpeechRecognition from Capacitor
const mockAvailable = vi.fn()
const mockRequestPermissions = vi.fn()
const mockStart = vi.fn()

vi.mock('@capacitor-community/speech-recognition', () => ({
    SpeechRecognition: {
        available: (...args) => mockAvailable(...args),
        requestPermissions: (...args) => mockRequestPermissions(...args),
        start: (...args) => mockStart(...args),
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
    })

    it('returns transcript on successful recognition', async () => {
        mockStart.mockResolvedValue({ matches: ['Интерстеллар'] })

        const { result } = renderHook(() => useVoiceSearch())

        let transcript
        await act(async () => {
            transcript = await result.current.startListening()
        })

        expect(transcript).toBe('Интерстеллар')
        expect(promptSpy).not.toHaveBeenCalled()
    })

    it('returns null on cancel (error "0")', async () => {
        mockStart.mockRejectedValue(new Error('0'))

        const { result } = renderHook(() => useVoiceSearch())

        let transcript
        await act(async () => {
            transcript = await result.current.startListening()
        })

        expect(transcript).toBeNull()
        expect(promptSpy).not.toHaveBeenCalled()
    })

    it('returns null and shows toast on recognition error', async () => {
        mockStart.mockRejectedValue(new Error('speech service error'))

        const { result } = renderHook(() => useVoiceSearch())

        let transcript
        await act(async () => {
            transcript = await result.current.startListening()
        })

        expect(transcript).toBeNull()
        expect(promptSpy).not.toHaveBeenCalled()
    })

    it('returns null when SpeechRecognition is unavailable (no prompt)', async () => {
        mockAvailable.mockResolvedValue({ available: false })

        const { result } = renderHook(() => useVoiceSearch())

        // Wait for the mount effect to settle
        await act(async () => {
            await new Promise((r) => setTimeout(r, 10))
        })

        let transcript
        await act(async () => {
            transcript = await result.current.startListening()
        })

        expect(transcript).toBeNull()
        expect(mockStart).not.toHaveBeenCalled()
        expect(promptSpy).not.toHaveBeenCalled()
    })

    it('NEVER calls window.prompt in any scenario', async () => {
        // Scenario 1: available + error
        mockAvailable.mockResolvedValue({ available: true })
        mockStart.mockRejectedValue(new Error('fail'))

        const { result: r1 } = renderHook(() => useVoiceSearch())
        await act(async () => { await r1.current.startListening() })

        // Scenario 2: unavailable
        mockAvailable.mockResolvedValue({ available: false })

        const { result: r2 } = renderHook(() => useVoiceSearch())
        await act(async () => {
            await new Promise((r) => setTimeout(r, 10))
        })
        await act(async () => { await r2.current.startListening() })

        // Total: prompt should NEVER have been called
        expect(promptSpy).not.toHaveBeenCalled()
    })

    it('resets isListening to false after recognition completes', async () => {
        mockStart.mockResolvedValue({ matches: ['test'] })

        const { result } = renderHook(() => useVoiceSearch())

        expect(result.current.isListening).toBe(false)

        await act(async () => {
            await result.current.startListening()
        })

        // After completion, isListening must be false
        expect(result.current.isListening).toBe(false)
    })

    it('resets isListening to false after recognition error', async () => {
        mockStart.mockRejectedValue(new Error('fail'))

        const { result } = renderHook(() => useVoiceSearch())

        await act(async () => {
            await result.current.startListening()
        })

        expect(result.current.isListening).toBe(false)
    })
})
