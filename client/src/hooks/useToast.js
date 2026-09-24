import { useState, useCallback, useEffect, useRef } from 'react'

export function useToast() {
    const [toasts, setToasts] = useState([])
    const timersRef = useRef([])

    useEffect(() => {
        return () => timersRef.current.forEach(clearTimeout)
    }, [])

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev.slice(-2), { id, message, type }])
        const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
            timersRef.current = timersRef.current.filter(t => t !== timer)
        }, 4000)
        timersRef.current.push(timer)
    }, [])

    return { toasts, showToast }
}

