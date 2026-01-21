import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { findNextFocus } from '../utils/SpatialNavigation'

const NavigationContext = createContext(null)

export const NavigationProvider = ({ children }) => {
    // Stack of active layers. Topmost layer receives input.
    // Example: ['root', 'home-panel', 'movie-modal']
    const [layerStack, setLayerStack] = useState(['root'])
    const [activeElement, setActiveElement] = useState(null)

    // Refs to track focus history per layer
    const layerHistory = useRef({})

    // Push a new layer to the stack
    const pushLayer = useCallback((layerId) => {
        setLayerStack(prev => {
            if (prev.includes(layerId)) return prev
            console.log(`[Nav] Push layer: ${layerId}`)
            return [...prev, layerId]
        })
    }, [])

    // Pop a layer from the stack
    const popLayer = useCallback((layerId) => {
        setLayerStack(prev => {
            const newStack = prev.filter(id => id !== layerId)
            console.log(`[Nav] Pop layer: ${layerId} -> Active: ${newStack[newStack.length - 1]}`)
            return newStack
        })
    }, [])

    // Global focus handler
    const focus = useCallback((element) => {
        if (element) {
            element.focus()
            setActiveElement(element)

            // Scroll into view with centering (Lampa style)
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            })
        }
    }, [])

    // Global Key Listener
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            const activeLayer = layerStack[layerStack.length - 1]

            // Dispatch event via custom event to the active layer components
            // OR let the useNavigation hook handle it via local listeners?
            // Better approach: Let useNavigation hooks decide based on 'activeLayer' state.
            // BUT we need to prevent default scrolling for Arrows globally here.

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault()
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [layerStack])

    return (
        <NavigationContext.Provider value={{
            layerStack,
            activeLayer: layerStack[layerStack.length - 1],
            pushLayer,
            popLayer,
            focus,
            activeElement
        }}>
            {children}
        </NavigationContext.Provider>
    )
}

/**
 * Hook for components to participate in spatial navigation
 * @param {string} layerId - Unique ID for this navigation layer
 * @param {Object} options
 * @param {boolean} options.autoFocus - Whether to focus first element on mount
 */
export const useNavigation = (layerId, { autoFocus = false } = {}) => {
    const context = useContext(NavigationContext)
    if (!context) throw new Error('useNavigation must be used within NavigationProvider')

    const { layerStack, activeLayer, pushLayer, popLayer, focus } = context
    const isLayerActive = activeLayer === layerId
    const containerRef = useRef(null)

    // Register layer on mount
    useEffect(() => {
        pushLayer(layerId)
        return () => popLayer(layerId)
    }, [layerId, pushLayer, popLayer])

    // Auto-focus logic
    useEffect(() => {
        if (isLayerActive && autoFocus && containerRef.current) {
            const firstFocusable = containerRef.current.querySelector('.focusable')
            if (firstFocusable) {
                console.log(`[Nav] Auto-focusing first element in ${layerId}`)
                focus(firstFocusable)
            }
        }
    }, [isLayerActive, autoFocus, focus, layerId])

    // Handle Input for this layer
    const handleKeyDown = useCallback((e) => {
        if (!isLayerActive) return

        let direction = null
        switch (e.key) {
            case 'ArrowUp': direction = 'up'; break;
            case 'ArrowDown': direction = 'down'; break;
            case 'ArrowLeft': direction = 'left'; break;
            case 'ArrowRight': direction = 'right'; break;
        }

        if (direction) {
            e.preventDefault()
            const current = document.activeElement
            // Find next focus within the ENTIRE document (Global Spatial)
            // or scoped to container? "Focus is Global" -> Document.
            // But we might want to restrict to container for modals.
            // Let's search in document for now to allow jumping between rows seamlessly.

            const next = findNextFocus(current, direction)
            if (next) {
                focus(next)
            } else {
                console.log(`[Nav] No element found to the ${direction}`)
            }
        }
    }, [isLayerActive, focus])

    // Attach local listener when layer is active
    useEffect(() => {
        if (isLayerActive) {
            window.addEventListener('keydown', handleKeyDown)
            return () => window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isLayerActive, handleKeyDown])

    return {
        containerRef,
        isLayerActive,
        focus
    }
}
