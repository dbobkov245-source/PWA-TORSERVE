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
  const message = err?.message ?? err
  const m = String(message).toLowerCase()
  return (
    m === '0' ||
    m === 'cancelled' ||
    m === 'canceled'
  )
}

// ─── Utils ─────────────────────────────────────────────────────

// Simple timeout wrapper for promises
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms))
  ])

// ─── Hook ──────────────────────────────────────────────────────

export function useVoiceSearch() {
  const [isListening, setIsListening] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const availableRef = useRef(null)

  // Initial check (non-blocking)
  useEffect(() => {
    SpeechRecognition.available()
      .then(({ available }) => { availableRef.current = available })
      .catch(() => { availableRef.current = false })
  }, [])

  const showToast = useCallback((msg) => setToastMessage(msg), [])
  const dismissToast = useCallback(() => setToastMessage(null), [])

  const startListening = useCallback(async () => {
    console.log('[Voice] Start listening initiated')

    // 1. Check availability with timeout
    if (availableRef.current === null) {
      try {
        console.log('[Voice] Checking availability...')
        const { available } = await withTimeout(SpeechRecognition.available(), 1000, 'Availability')
        availableRef.current = available
      } catch (err) {
        console.warn('[Voice] Availability check failed:', err)
        availableRef.current = false
      }
    }

    if (!availableRef.current) {
      console.warn('[Voice] Not available')
      showToast('🎤 Голосовой поиск недоступен')
      return null
    }

    // 2. Request permissions with timeout
    try {
      console.log('[Voice] Requesting permissions...')
      await withTimeout(SpeechRecognition.requestPermissions(), 2000, 'Permissions')
    } catch (err) {
      console.warn('[Voice] Permissions check failed:', err)
      showToast('🎤 Нет разрешения на микрофон')
      return null
    }

    // 3. Start recognition (Direct Popup Mode - HOTFIX)
    setIsListening(true)
    try {
      console.log('[Voice] Starting recognition (popup: true)...')

      // HOTFIX: Disable Hybrid Flow due to freezes on some devices/emulators.
      // Reverting to direct popup:true usage.

      const result = await SpeechRecognition.start({
        language: 'ru-RU',
        maxResults: 1,
        prompt: 'Что хотите посмотреть?',
        partialResults: false,
        popup: true,
      })

      const transcript = result?.matches?.[0]?.trim()
      if (transcript) {
        console.log('[Voice] Result:', transcript)
        return transcript
      }
      return null

    } catch (err) {
      setIsListening(false) // Ensure state reset

      if (isCancelError(err)) {
        console.log('[Voice] Cancelled')
        return null
      }

      console.warn('[Voice] Recognition error:', err)
      showToast('🎤 Ошибка распознавания')
      return null
    } finally {
      setIsListening(false)
    }
  }, [showToast])

  const ToastPortal = toastMessage
    ? () => <VoiceToast message={toastMessage} onDismiss={dismissToast} />
    : () => null

  return { startListening, isListening, ToastPortal }
}
