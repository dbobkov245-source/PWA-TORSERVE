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

    pruneZone(zone) {
        const elements = this.zones[zone];
        if (!elements) return 0;

        let removed = 0;
        for (const element of [...elements]) {
            if (document.body.contains(element)) continue;
            this.unregister(zone, element);
            removed++;
        }

        if (removed > 0) {
            console.log(`[SpatialNav] Pruned ${removed} stale refs from zone '${zone}'`);
        }
        return removed;
    },

    focusId(zone, id) {
        if (this.idMap[zone] && this.idMap[zone][id]) {
            const element = this.idMap[zone][id];
            if (element.offsetParent !== null && !element.disabled) { // Check visibility and enabled state
                console.log(`[SpatialNav] Focusing element with ID '${id}' in zone '${zone}'`);
                this.activeZone = zone; // Set active zone if focusing by ID
                element.focus();
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        if (this.activeZone === zone) return false;

        console.log(`[SpatialNav] Active Zone: ${this.activeZone} -> ${zone}`);
        this.activeZone = zone;
        return true;
    },

    move(direction) {
        const current = document.activeElement;
        const zoneElements = this.zones[this.activeZone] || new Set();
        const allZoneElements = Array.from(zoneElements);
        const isHorizontal = direction === 'ArrowLeft' || direction === 'ArrowRight';
        const currentRow = isHorizontal && zoneElements.has(current)
            ? current.closest?.('.snap-container')
            : null;
        const candidates = currentRow
            ? Array.from(currentRow.querySelectorAll('.focusable')).filter(element => zoneElements.has(element))
            : allZoneElements;
        const elements = candidates
            .filter(el => document.body.contains(el) && el.offsetParent !== null && el.tabIndex !== -1); // Filter valid, visible, and focusable

        if (!elements.length) {
            return;
        }

        // Focus can sit on something outside the zone: the top bar buttons and
        // the picker banner carry .focusable and a tab stop but never register
        // via useSpatialItem. Jumping straight to elements[0] — whichever
        // element happened to register first that session — ignored the
        // direction entirely, so the cursor parked at the top of the screen and
        // neither Up nor Down went anywhere. Steer by geometry when the current
        // element has some, and keep the blind jump only as a last resort.
        if (!elements.includes(current)) {
            const fromOutside = current && typeof current.getBoundingClientRect === 'function'
                ? this.findNearest(current, elements, direction)
                : null;
            const target = fromOutside || elements[0];
            target.focus({ preventScroll: true });
            if (fromOutside && (direction === 'ArrowUp' || direction === 'ArrowDown')) {
                target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            }
            return;
        }

        const next = this.findNearest(current, elements, direction);
        if (next) {
            next.focus({ preventScroll: true });
            if (direction === 'ArrowUp' || direction === 'ArrowDown') {
                next.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            }
            return;
        }

        // Nothing registered that way. Vertically that usually means the next
        // row is still a lazy placeholder with no focusable child: it mounts
        // when it intersects the viewport, but the viewport only moves when
        // focus moves, and focus cannot move because the row has not mounted.
        // Nudging the page breaks that deadlock — the row mounts and the next
        // press lands on it. Horizontal dead ends are genuine row edges.
        if (direction === 'ArrowUp' || direction === 'ArrowDown') {
            const step = Math.round(window.innerHeight * 0.8);
            window.scrollBy({ top: direction === 'ArrowDown' ? step : -step, behavior: 'auto' });
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

            // 2. Distance Calculation
            // For vertical navigation: if the candidate spans most of the viewport width (like a banner),
            // use horizontal overlap/edge distance instead of center-to-center to avoid inflated dx penalty
            const vw = window.innerWidth;
            const candidateSpansWidth = candRect.width > vw * 0.7;
            let dx, dy;

            if (candidateSpansWidth && (direction === 'ArrowUp' || direction === 'ArrowDown')) {
                // Use edge-to-edge horizontal distance (0 if overlapping)
                dx = Math.max(0, curRect.left - candRect.right, candRect.left - curRect.right);
            } else {
                dx = Math.abs((curRect.left + curRect.width / 2) - (candRect.left + candRect.width / 2));
            }
            dy = Math.abs((curRect.top + curRect.height / 2) - (candRect.top + candRect.height / 2));

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
        this.pruneZone(targetZone);

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
                target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    const setActiveZone = useCallback((zone) => {
        return SpatialEngine.setActiveZone(zone);
    }, []);

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

    return { setActiveZone };
};

export default SpatialEngine;
