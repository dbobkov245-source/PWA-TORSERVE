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

describe('useVoiceSearch (Hybrid)', () => {
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

  it('returns transcript from primary (popup:false)', async () => {
    mockStart.mockResolvedValueOnce({ matches: ['Интерстеллар'] })

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      transcript = await result.current.startListening()
    })

    expect(transcript).toBe('Интерстеллар')
    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({ popup: false, partialResults: false })
    )
    expect(mockStop).not.toHaveBeenCalled()
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('falls back to popup:true on primary timeout', async () => {
    vi.useFakeTimers()
    mockStart
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({ matches: ['Аватар'] })

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      const promise = result.current.startListening()
      await vi.advanceTimersByTimeAsync(5000)
      transcript = await promise
    })

    expect(transcript).toBe('Аватар')
    expect(mockStart).toHaveBeenCalledTimes(2)
    expect(mockStop).toHaveBeenCalledTimes(1)
    expect(mockStart).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ popup: false })
    )
    expect(mockStart).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ popup: true })
    )
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('does not hang when stop() never resolves', async () => {
    vi.useFakeTimers()
    mockStart
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({ matches: ['Дюна'] })
    mockStop.mockImplementationOnce(() => new Promise(() => {}))

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      const promise = result.current.startListening()
      await vi.advanceTimersByTimeAsync(5600)
      transcript = await promise
    })

    expect(transcript).toBe('Дюна')
    expect(mockStart).toHaveBeenCalledTimes(2)
    expect(mockStop).toHaveBeenCalledTimes(1)
  })

  it('does NOT fallback on cancel error "0"', async () => {
    mockStart.mockRejectedValueOnce(new Error('0'))

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      transcript = await result.current.startListening()
    })

    expect(transcript).toBeNull()
    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(mockStop).not.toHaveBeenCalled()
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('does NOT fallback on cancel error "canceled"', async () => {
    mockStart.mockRejectedValueOnce(new Error('canceled'))

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      transcript = await result.current.startListening()
    })

    expect(transcript).toBeNull()
    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(mockStop).not.toHaveBeenCalled()
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('does fallback on "Client side error" (not cancel)', async () => {
    mockStart
      .mockRejectedValueOnce(new Error('Client side error'))
      .mockResolvedValueOnce({ matches: ['Матрица'] })

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      transcript = await result.current.startListening()
    })

    expect(transcript).toBe('Матрица')
    expect(mockStart).toHaveBeenCalledTimes(2)
    expect(mockStop).toHaveBeenCalledTimes(1)
    expect(mockStart).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ popup: false })
    )
    expect(mockStart).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ popup: true })
    )
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('fallback cancel returns null without warning', async () => {
    vi.useFakeTimers()
    mockStart
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockRejectedValueOnce(new Error('0'))

    const { result } = renderHook(() => useVoiceSearch())
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      let transcript
      await act(async () => {
        const promise = result.current.startListening()
        await vi.advanceTimersByTimeAsync(5000)
        transcript = await promise
      })

      expect(transcript).toBeNull()
      expect(mockStart).toHaveBeenCalledTimes(2)
      expect(mockStop).toHaveBeenCalledTimes(1)
      expect(warnSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('fallback real error logs warning and returns null', async () => {
    vi.useFakeTimers()
    mockStart
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useVoiceSearch())
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      let transcript
      await act(async () => {
        const promise = result.current.startListening()
        await vi.advanceTimersByTimeAsync(5000)
        transcript = await promise
      })

      expect(transcript).toBeNull()
      expect(mockStart).toHaveBeenCalledTimes(2)
      expect(mockStop).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Voice:fallback] error:'),
        expect.any(Error)
      )
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('retries fallback once on "RecognitionService busy"', async () => {
    vi.useFakeTimers()
    mockStart
      .mockImplementationOnce(() => new Promise(() => {})) // primary hangs -> timeout
      .mockRejectedValueOnce(new Error('RecognitionService busy')) // fallback attempt 1
      .mockResolvedValueOnce({ matches: ['Терминатор'] }) // fallback attempt 2

    const { result } = renderHook(() => useVoiceSearch())

    let transcript
    await act(async () => {
      const promise = result.current.startListening()
      await vi.advanceTimersByTimeAsync(7000)
      transcript = await promise
    })

    expect(transcript).toBe('Терминатор')
    expect(mockStart).toHaveBeenCalledTimes(3)
    expect(mockStop).toHaveBeenCalledTimes(2)
  })

  it('deduplicates concurrent startListening calls', async () => {
    vi.useFakeTimers()
    mockStart
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({ matches: ['Начало'] })

    const { result } = renderHook(() => useVoiceSearch())

    let transcript1
    let transcript2
    await act(async () => {
      const p1 = result.current.startListening()
      const p2 = result.current.startListening()
      await vi.advanceTimersByTimeAsync(5000)
      ;[transcript1, transcript2] = await Promise.all([p1, p2])
    })

    expect(transcript1).toBe('Начало')
    expect(transcript2).toBe('Начало')
    expect(mockStart).toHaveBeenCalledTimes(2)
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
})
