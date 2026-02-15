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

describe('useVoiceSearch (Simple popup:true)', () => {
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

  it('returns transcript from popup:true recognition', async () => {
    mockStart.mockResolvedValueOnce({ matches: ['Интерстеллар'] })

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      transcript = await result.current.startListening()
    })

    expect(transcript).toBe('Интерстеллар')
    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({ popup: true, partialResults: false })
    )
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('returns null on cancel error "0"', async () => {
    mockStart.mockRejectedValueOnce(new Error('0'))

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      transcript = await result.current.startListening()
    })

    expect(transcript).toBeNull()
    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('returns null on cancel error "Cancelled"', async () => {
    mockStart.mockRejectedValueOnce(new Error('Cancelled'))

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      transcript = await result.current.startListening()
    })

    expect(transcript).toBeNull()
    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('shows toast on recognition error (not cancel)', async () => {
    mockStart.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useVoiceSearch())
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

    try {
      let transcript
      await act(async () => {
        transcript = await result.current.startListening()
      })

      expect(transcript).toBeNull()
      expect(mockStart).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        '[VoiceSearch] Recognition error:',
        expect.any(Error)
      )
    } finally {
      warnSpy.mockRestore()
    }

    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('returns null on empty result (no speech)', async () => {
    mockStart.mockResolvedValueOnce({ matches: [] })

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      transcript = await result.current.startListening()
    })

    expect(transcript).toBeNull()
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('shows toast when speech unavailable', async () => {
    mockAvailable.mockResolvedValue({ available: false })

    const { result } = renderHook(() => useVoiceSearch())

    // Wait for mount effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    let transcript
    await act(async () => {
      transcript = await result.current.startListening()
    })

    expect(transcript).toBeNull()
    expect(mockStart).not.toHaveBeenCalled()
  })

  it('resets isListening to false after completion', async () => {
    mockStart.mockResolvedValueOnce({ matches: ['test'] })

    const { result } = renderHook(() => useVoiceSearch())
    expect(result.current.isListening).toBe(false)

    await act(async () => {
      await result.current.startListening()
    })

    expect(result.current.isListening).toBe(false)
  })

  it('resets isListening to false after error', async () => {
    mockStart.mockRejectedValueOnce(new Error('fail'))

    const { result } = renderHook(() => useVoiceSearch())
    vi.spyOn(console, 'warn').mockImplementation(() => { })

    await act(async () => {
      await result.current.startListening()
    })

    expect(result.current.isListening).toBe(false)
    console.warn.mockRestore()
  })

  it('NEVER calls window.prompt()', async () => {
    mockStart.mockRejectedValueOnce(new Error('any error'))

    const { result } = renderHook(() => useVoiceSearch())
    vi.spyOn(console, 'warn').mockImplementation(() => { })

    await act(async () => {
      await result.current.startListening()
    })

    expect(promptSpy).not.toHaveBeenCalled()
    console.warn.mockRestore()
  })
})
