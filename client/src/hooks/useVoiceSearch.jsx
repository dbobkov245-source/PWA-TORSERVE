/**
 * useVoiceSearch — centralized voice search hook.
 *
 * Replaces duplicated voice logic in App.jsx and SearchPanel.jsx.
 * NEVER falls back to window.prompt() — uses toast notifications instead.
 *
 * v3.9.0: Rolled back to v3.7.2 simple approach (popup: true only).
 * The hybrid flow (popup:false → timeout → popup:true) caused double-press
 * bugs on Android TV devices. Simple popup:true works reliably on TCL/Sony.
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
   * Uses popup: true for reliable system Google dialog on Android TV.
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

    // 3. Start recognition — simple popup:true approach
    try {
      setIsListening(true)
      const result = await SpeechRecognition.start({
        language: 'ru-RU',
        maxResults: 1,
        prompt: 'Что хотите посмотреть?',
        partialResults: false,
        popup: true,
      })
      setIsListening(false)

      const transcript = result?.matches?.[0]?.trim()
      if (transcript) {
        return transcript
      }

      // Empty result = no speech detected, silent return (no toast)
      return null
    } catch (err) {
      setIsListening(false)

      // error.message === "0" means cancel/back pressed — silent return
      if (err?.message === '0' || err?.message === 'Cancelled') {
        return null
      }

      // Any other error — show toast, NOT prompt()
      console.warn('[VoiceSearch] Recognition error:', err)
      showToast('🎤 Голос не распознан, попробуйте снова')
      return null
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
