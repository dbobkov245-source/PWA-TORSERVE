/**
 * useSpatialNavigation.js - Core Spatial Engine for TV Navigation (v4.0)
 * 
 * Based on LAMPA SpatialNavigator principles:
 * 1. Zero Indices: We don't care about row/col indexes.
 * 2. DOM-Primary: The focus state in DOM is the source of truth.
 * 3. Pure Geometry: Closest neighbor is found via bounding boxes.
 */

import { useCallback, useRef, useEffect } from 'react';

const SpatialEngine = {
    zones: {}, // { zoneName: Set<HTMLElement> }
    activeZone: 'main',

    register(zone, element) {
        if (!this.zones[zone]) this.zones[zone] = new Set();
        this.zones[zone].add(element);
    },

    unregister(zone, element) {
        if (this.zones[zone]) {
            this.zones[zone].delete(element);
        }
    },

    setActiveZone(zone) {
        console.log(`[SpatialNav] Active Zone: ${this.activeZone} -> ${zone}`);
        this.activeZone = zone;
    },

    move(direction) {
        const current = document.activeElement;
        const elements = Array.from(this.zones[this.activeZone] || [])
            .filter(el => el.offsetParent !== null); // Filter visible

        if (!elements.length) return;

        // If nothing focused, focus first or best
        if (!elements.includes(current)) {
            elements[0].focus();
            return;
        }

        const next = this.findNearest(current, elements, direction);
        if (next) {
            next.focus();
        } else {
            console.warn(`[SpatialNav] Edge reached for ${direction} in zone ${this.activeZone}`);
        }
    },

    findNearest(current, elements, direction) {
        const curRect = current.getBoundingClientRect();
        let bestCandidate = null;
        let minDistance = Infinity;

        elements.forEach(candidate => {
            if (candidate === current) return;
            const candRect = candidate.getBoundingClientRect();

            // 1. Directional Filtering
            let isCorrectDirection = false;
            switch (direction) {
                case 'ArrowUp': isCorrectDirection = candRect.bottom <= curRect.top + 5; break;
                case 'ArrowDown': isCorrectDirection = candRect.top >= curRect.bottom - 5; break;
                case 'ArrowLeft': isCorrectDirection = candRect.right <= curRect.left + 5; break;
                case 'ArrowRight': isCorrectDirection = candRect.left >= curRect.right - 5; break;
            }

            if (!isCorrectDirection) return;

            // 2. Distance Calculation (Euclidean of centers + penalty for axis misalignment)
            const dx = Math.abs((curRect.left + curRect.width / 2) - (candRect.left + candRect.width / 2));
            const dy = Math.abs((curRect.top + curRect.height / 2) - (candRect.top + candRect.height / 2));

            // Weight the axis of movement less than the orthogonal axis to prefer straight jumps
            const distance = (direction === 'ArrowLeft' || direction === 'ArrowRight')
                ? dx + dy * 2
                : dy + dx * 2;

            if (distance < minDistance) {
                minDistance = distance;
                bestCandidate = candidate;
            }
        });

        return bestCandidate;
    }
};

/**
 * Hook for components to register focusable items
 */
export const useSpatialItem = (zone = 'main') => {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (el) {
            SpatialEngine.register(zone, el);
        }
        return () => {
            if (el) SpatialEngine.unregister(zone, el);
        };
    }, [zone]);

    return ref;
};

/**
 * Hook for the App to initialize the Global Arbiter
 */
export const useSpatialArbiter = (onBack) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (isTyping) return;
                e.preventDefault();
                SpatialEngine.move(e.key);
            }

            if (e.key === 'Enter' || e.key === ' ') {
                if (isTyping) return;
                const active = document.activeElement;
                if (active && active.classList.contains('focusable')) {
                    active.click();
                }
            }

            if (e.key === 'Escape' || e.key === 'Backspace') {
                if (isTyping && e.key === 'Backspace') return;
                if (onBack) {
                    onBack();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onBack]);

    return {
        setActiveZone: (zone) => SpatialEngine.setActiveZone(zone)
    };
};

export default SpatialEngine;
