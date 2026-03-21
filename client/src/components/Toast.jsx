import { useState, useCallback } from 'react'

export function useToast() {
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev.slice(-2), { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    return { toasts, showToast }
}

const TYPE_STYLES = {
    warning: 'bg-yellow-800 border-yellow-600 text-yellow-100',
    error:   'bg-red-900 border-red-700 text-red-100',
    info:    'bg-gray-700 border-gray-600 text-gray-100',
}

export function ToastContainer({ toasts }) {
    if (!toasts.length) return null
    return (
        <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`px-4 py-3 rounded-lg text-sm border shadow-xl max-w-xs ${TYPE_STYLES[t.type] || TYPE_STYLES.info}`}
                >
                    {t.message}
                </div>
            ))}
        </div>
    )
}
