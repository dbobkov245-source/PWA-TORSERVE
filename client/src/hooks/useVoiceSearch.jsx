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

const PRIMARY_TIMEOUT_MS = 4000
const STOP_GUARD_MS = 700
const FALLBACK_RETRY_DELAY_MS = 350
const FALLBACK_ATTEMPTS = 2

/** User cancellation (Back / cancel). */
function isCancelError(message) {
  const m = String(message ?? '').toLowerCase()
  return m === '0' || m === 'cancelled' || m === 'canceled'
}

/** Android recognizer may still be tearing down from primary stage. */
function isBusyError(message) {
  const m = String(message ?? '').toLowerCase()
  return m.includes('recognitionservice busy')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function stopListeningWithGuard() {
  try {
    await Promise.race([
      SpeechRecognition.stop(),
      new Promise((resolve) => setTimeout(resolve, STOP_GUARD_MS)),
    ])
  } catch {}
}

// ─── Hook ──────────────────────────────────────────────────────

export function useVoiceSearch() {
  const [isListening, setIsListening] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const availableRef = useRef(null)
  const inFlightRef = useRef(null)

  // Initial check (non-blocking)
  useEffect(() => {
    SpeechRecognition.available()
      .then(({ available }) => {
        availableRef.current = available
        if (available) {
          SpeechRecognition.requestPermissions().catch(() => {})
        }
      })
      .catch(() => {
        availableRef.current = false
      })
  }, [])

  const showToast = useCallback((msg) => setToastMessage(msg), [])
  const dismissToast = useCallback(() => setToastMessage(null), [])

  const startListening = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    const run = (async () => {
      // 1. Check availability
      if (availableRef.current === null) {
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

      // 3. Start recognition (hybrid flow)
      setIsListening(true)
      try {
        // Primary: popup false with timeout
        let timeoutId
        console.log('[Voice:primary] start')
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('VOICE_TIMEOUT')),
            PRIMARY_TIMEOUT_MS
          )
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

          const transcript = result?.matches?.[0]?.trim()
          if (transcript) {
            console.log('[Voice:primary] result:', transcript)
            return transcript
          }
          console.log('[Voice:primary] empty -> fallback')
        } catch (primaryErr) {
          if (isCancelError(primaryErr?.message ?? primaryErr)) {
            console.log('[Voice:primary] cancelled')
            return null
          }
          console.log('[Voice:primary] timeout/error:', primaryErr?.message ?? primaryErr)
        } finally {
          clearTimeout(timeoutId)
        }

        // Plugin stop() may never resolve on some Android builds; guard it.
        await stopListeningWithGuard()
        await sleep(FALLBACK_RETRY_DELAY_MS)

        // Fallback: popup true with one busy retry
        for (let attempt = 1; attempt <= FALLBACK_ATTEMPTS; attempt += 1) {
          console.log(`[Voice:fallback] start (attempt ${attempt})`)
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
            const message = fallbackErr?.message ?? fallbackErr
            if (isCancelError(message)) {
              console.log('[Voice:fallback] cancelled')
              return null
            }

            if (attempt < FALLBACK_ATTEMPTS && isBusyError(message)) {
              console.log('[Voice:fallback] busy -> retry')
              await stopListeningWithGuard()
              await sleep(FALLBACK_RETRY_DELAY_MS)
              continue
            }

            console.warn('[Voice:fallback] error:', fallbackErr)
            showToast('🎤 Голос не распознан, попробуйте снова')
            return null
          }
        }

        return null
      } finally {
        setIsListening(false)
      }
    })()

    inFlightRef.current = run
    try {
      return await run
    } finally {
      inFlightRef.current = null
    }
  }, [showToast])

  const ToastPortal = toastMessage
    ? () => <VoiceToast message={toastMessage} onDismiss={dismissToast} />
    : () => null

  return { startListening, isListening, ToastPortal }
}
