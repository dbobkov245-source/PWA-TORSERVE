/**
 * useVoiceSearch — centralized voice search hook.
 *
 * Replaces duplicated voice logic in App.jsx and SearchPanel.jsx.
 * NEVER falls back to window.prompt() — uses toast notifications instead.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { createPortal } from 'react-dom'

// ─── Toast Component ───────────────────────────────────────────

const TOAST_DURATION = 3000

const VoiceToast = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 99999,
        background: 'rgba(30, 30, 30, 0.95)',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        animation: 'voiceToastIn 0.3s ease-out',
        maxWidth: '320px',
      }}
    >
      {message}
      <style>{`
        @keyframes voiceToastIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  )
}

/** Пользовательская отмена (Back / cancel) */
function isCancelError(err) {
  // Устойчивость к структуре ошибки
  const message = err?.message ?? err
  const m = String(message).toLowerCase()

  return (
    m === '0' ||           // Android popup: RESULT_CANCELED
    m === 'cancelled' ||   // iOS / legacy
    m === 'canceled'       // Typo variant
  )
}

// ─── Hook ──────────────────────────────────────────────────────

export function useVoiceSearch() {
  const [isListening, setIsListening] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const availableRef = useRef(null) // null = unchecked, true/false = result

  // Check availability once on mount
  useEffect(() => {
    SpeechRecognition.available()
      .then(({ available }) => {
        availableRef.current = available
        if (available) {
          SpeechRecognition.requestPermissions().catch(() => { })
        }
      })
      .catch(() => {
        availableRef.current = false
      })
  }, [])

  const showToast = useCallback((msg) => {
    setToastMessage(msg)
  }, [])

  const dismissToast = useCallback(() => {
    setToastMessage(null)
  }, [])

  /**
   * Start voice listening.
   * @returns {Promise<string|null>} transcript or null (cancel/unavailable/error)
   */
  const startListening = useCallback(async () => {
    // 1. Check availability
    if (availableRef.current === null) {
      // Still loading — try inline check
      try {
        const { available } = await SpeechRecognition.available()
        availableRef.current = available
      } catch {
        availableRef.current = false
      }
    }

    if (!availableRef.current) {
      showToast('🎤 Голосовой поиск недоступен на этом устройстве')
      return null
    }

    // 2. Request permissions (idempotent)
    try {
      await SpeechRecognition.requestPermissions()
    } catch {
      showToast('🎤 Нет разрешения на микрофон')
      return null
    }

    // 3. Start recognition (Hybrid Flow)
    const TIMEOUT_MS = 4000
    setIsListening(true)

    try {
      // ── Primary: popup:false ──
      let timeoutId
      console.log('[Voice:primary] start')

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('VOICE_TIMEOUT')), TIMEOUT_MS)
      })

      try {
        const result = await Promise.race([
          SpeechRecognition.start({
            language: 'ru-RU',
            maxResults: 1,
            partialResults: false,
            popup: false,
          }),
          timeoutPromise,
        ])
        clearTimeout(timeoutId)

        const transcript = result?.matches?.[0]?.trim()
        if (transcript) {
          console.log('[Voice:primary] result:', transcript)
          return transcript
        }
        console.log('[Voice:primary] empty → fallback')
      } catch (primaryErr) {
        clearTimeout(timeoutId)

        if (isCancelError(primaryErr)) {
          console.log('[Voice:primary] cancelled')
          return null
        }
        console.log('[Voice:primary] timeout/error:', primaryErr?.message)
      }

      // Гарантированный stop перед fallback (RecognitionService busy fix)
      try { await SpeechRecognition.stop() } catch { }

      // ── Fallback: popup:true ──
      console.log('[Voice:fallback] start')
      try {
        const fallbackResult = await SpeechRecognition.start({
          language: 'ru-RU',
          maxResults: 1,
          prompt: 'Что хотите посмотреть?',
          partialResults: false,
          popup: true,
        })

        const transcript = fallbackResult?.matches?.[0]?.trim()
        if (transcript) {
          console.log('[Voice:fallback] result:', transcript)
          return transcript
        }
        return null
      } catch (fallbackErr) {
        if (isCancelError(fallbackErr)) {
          console.log('[Voice:fallback] cancelled')
          return null
        }
        console.warn('[Voice:fallback] error:', fallbackErr)
        showToast('🎤 Голос не распознан, попробуйте снова')
        return null
      }
    } finally {
      setIsListening(false)
    }
  }, [showToast])

  // Toast portal element
  const ToastPortal = toastMessage
    ? () => <VoiceToast message={toastMessage} onDismiss={dismissToast} />
    : () => null

  return {
    startListening,
    isListening,
    ToastPortal,
  }
}
