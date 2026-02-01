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
    zones: {},
    activeZone: 'main',
    idMap: {}, // zone -> id -> element

    register(zone, element, id = null) {
        if (!this.zones[zone]) this.zones[zone] = new Set();
        this.zones[zone].add(element);

        if (id) {
            if (!this.idMap[zone]) this.idMap[zone] = {};
            this.idMap[zone][id] = element;
        }
    },

    unregister(zone, element) {
        if (this.zones[zone]) {
            this.zones[zone].delete(element);
        }
        // Cleanup ID map (expensive reverse lookup or just ignore leaking?)
        // Better: Check if this element is in idMap for this zone
        if (this.idMap[zone]) {
            for (const [id, el] of Object.entries(this.idMap[zone])) {
                if (el === element) {
                    delete this.idMap[zone][id];
                    break;
                }
            }
        }
    },

    focusId(zone, id) {
        if (this.idMap[zone] && this.idMap[zone][id]) {
            const element = this.idMap[zone][id];
            if (element.offsetParent !== null && !element.disabled) { // Check visibility and enabled state
                console.log(`[SpatialNav] Focusing element with ID '${id}' in zone '${zone}'`);
                this.activeZone = zone; // Set active zone if focusing by ID
                element.focus();
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true;
            } else {
                console.warn(`[SpatialNav] Element with ID '${id}' in zone '${zone}' is not visible or disabled.`);
            }
        } else {
            console.warn(`[SpatialNav] Element with ID '${id}' not found in zone '${zone}'.`);
        }
        return false;
    },

    setActiveZone(zone) {
        console.log(`[SpatialNav] Active Zone: ${this.activeZone} -> ${zone}`);

        // Aggressively cleanup stale references in BOTH old and new zones
        [this.activeZone, zone].forEach(z => {
            if (this.zones[z]) {
                const before = this.zones[z].size;
                this.zones[z] = new Set(
                    Array.from(this.zones[z]).filter(el => document.body.contains(el))
                );
                const after = this.zones[z].size;
                if (before !== after) {
                    console.log(`[SpatialNav] Cleaned ${before - after} stale refs from zone '${z}'`);
                }
            }
        });

        this.activeZone = zone;
    },

    move(direction) {
        const current = document.activeElement;
        const allZoneElements = Array.from(this.zones[this.activeZone] || []);
        const elements = allZoneElements
            .filter(el => document.body.contains(el) && el.offsetParent !== null); // Filter valid + visible

        // Debug logging: track focus and zone state
        console.log(`[SpatialNav] move(${direction}): activeElement=${current?.tagName}#${current?.id || 'no-id'}, class=${current?.className?.substring(0, 30)}, zone=${this.activeZone}, zoneSize=${allZoneElements.length}, visible=${elements.length}`);

        if (!elements.length) {
            console.warn(`[SpatialNav] No visible elements in zone ${this.activeZone}`);
            return;
        }

        // If nothing focused, focus first or best
        if (!elements.includes(current)) {
            console.log(`[SpatialNav] Current element not in zone, focusing first element`);
            elements[0].focus();
            return;
        }

        const next = this.findNearest(current, elements, direction);
        if (next) {
            next.focus();
            next.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    },

    recoverFocus(zone, retryCount = 5) {
        const targetZone = zone || this.activeZone;

        // Clean stale references before recovery (BUG-1 fix)
        if (this.zones[targetZone]) {
            const before = this.zones[targetZone].size;
            this.zones[targetZone] = new Set(
                Array.from(this.zones[targetZone]).filter(el => document.body.contains(el))
            );
            const after = this.zones[targetZone].size;
            if (before !== after) {
                console.log(`[SpatialNav] Cleaned ${before - after} stale refs before recovery in '${targetZone}'`);
            }
        }

        const attempt = () => {
            const elements = Array.from(this.zones[targetZone] || [])
                .filter(el => document.body.contains(el) && el.offsetParent !== null && !el.disabled);

            if (elements.length > 0) {
                console.log(`[SpatialNav] Recovering focus in ${targetZone}, ${elements.length} candidates`);
                this.activeZone = targetZone;

                // Prefer elements in current viewport (visible without scroll) - BUG-1 fix v2
                const viewportHeight = window.innerHeight;
                const inViewport = elements.filter(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.top >= 0 && rect.bottom <= viewportHeight;
                });

                // Focus first visible element, or fallback to first registered
                const target = inViewport[0] || elements[0];
                target.focus();
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true;
            }
            if (retryCount > 0) {
                retryCount--;
                setTimeout(attempt, 100);
            }
            return false;
        };
        attempt();
    }
};

/**
 * Hook for components to register focusable items
 */
export const useSpatialItem = (zone = 'main', id = null) => {
    const elementRef = useRef(null);

    const setRef = useCallback((node) => {
        // If the node has changed (or is unmounting)
        if (elementRef.current && elementRef.current !== node) {
            SpatialEngine.unregister(zone, elementRef.current);
        }

        if (node) {
            SpatialEngine.register(zone, node, id);
        }

        elementRef.current = node;
    }, [zone, id]); // Depend on ID now

    return setRef;
};

/**
 * Hook for the App to initialize the Global Arbiter
 */
export const useSpatialArbiter = (onBack) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                // Allow Up/Down to escape input, and Left/Right if not typing
                if (isTyping && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;

                e.preventDefault();
                SpatialEngine.move(e.key);
            }

            if (e.key === 'Enter' || e.key === ' ') {
                if (isTyping) return;

                e.preventDefault();
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
