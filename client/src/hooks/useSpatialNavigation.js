/**
 * useSpatialNavigation.js - Core Spatial Engine for TV Navigation (v4.0)
 * 
 * Based on LAMPA SpatialNavigator principles:
 * 1. Zero Indices: We don't care about row/col indexes.
 * 2. DOM-Primary: The focus state in DOM is the source of truth.
 * 3. Pure Geometry: Closest neighbor is found via bounding boxes.
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Short, human-readable identity for an element, for diagnostics only.
 * Kept tiny because it is rendered on a TV screen and read off a photo.
 */
export const describeElement = (element) => {
    if (!element) return 'none'
    const tag = element.tagName || '?'
    if (tag === 'BODY' || tag === 'HTML') return tag
    const id = element.id ? `#${element.id}` : ''
    const cls = typeof element.className === 'string' && element.className
        ? `.${element.className.trim().split(/\s+/)[0]}`
        : ''
    return `${tag}${id}${cls}`
}

/**
 * How many candidates sit strictly above / below the cursor.
 *
 * This is what separates "the list really ends here" from "a row failed to
 * mount". Without it a dead end and a lost row look identical in the trace.
 */
const countNeighbours = (current, elements) => {
    if (!current || typeof current.getBoundingClientRect !== 'function') {
        return { aboveCount: null, belowCount: null }
    }
    const rect = current.getBoundingClientRect()
    let aboveCount = 0
    let belowCount = 0
    for (const candidate of elements) {
        if (candidate === current) continue
        const other = candidate.getBoundingClientRect()
        if (other.bottom <= rect.top + 5) aboveCount++
        else if (other.top >= rect.bottom - 5) belowCount++
    }
    return { aboveCount, belowCount }
}

/**
 * Where to put the cursor when it is not in the zone at all (usually <body>,
 * after the focused row unmounted).
 *
 * The old fallback was `elements[0]` — whichever element happened to register
 * first that session — which read on the device as a random teleport. Prefer
 * whatever the viewer can actually see.
 */
const topmostVisible = (elements) => {
    const height = window.innerHeight || 0
    let best = null
    let bestTop = Infinity
    for (const candidate of elements) {
        const rect = candidate.getBoundingClientRect?.()
        if (!rect) continue
        if (rect.bottom <= 0 || rect.top >= height) continue
        if (rect.top < bestTop) {
            bestTop = rect.top
            best = candidate
        }
    }
    return best
}

const SpatialEngine = {
    zones: {},
    activeZone: 'main',
    idMap: {}, // zone -> id -> element

    // Optional observer for move(). Null in normal builds, so this costs nothing;
    // the diagnostics overlay installs a sink to record why the cursor did or did
    // not move on a real device.
    diagnosticsSink: null,

    setDiagnosticsSink(sink) {
        this.diagnosticsSink = typeof sink === 'function' ? sink : null
    },

    /** Emit one diagnostics record. Never let a sink break navigation. */
    reportMove(record) {
        if (!this.diagnosticsSink) return
        try {
            this.diagnosticsSink({ ...record, at: Date.now() })
        } catch {
            // A broken sink must not take the D-Pad down with it.
        }
    },

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

        // Snapshot for diagnostics before anything moves.
        const before = describeElement(current);
        const base = {
            key: direction,
            zone: this.activeZone,
            zoneSize: allZoneElements.length,
            candidateCount: elements.length,
            currentInZone: elements.includes(current),
            // Distinguishes "geometry found nothing" from "the cursor is on a
            // node that has been unmounted" — a lazy row or a virtualised card
            // can pull the focused element out from under the D-Pad.
            beforeInDom: Boolean(current && document.body.contains(current)),
            // Neighbour counts cost a getBoundingClientRect per candidate, so
            // only pay for them when something is actually listening.
            ...(this.diagnosticsSink ? countNeighbours(current, elements) : {}),
            before
        };

        if (!elements.length) {
            this.reportMove({
                ...base,
                found: false,
                target: null,
                after: describeElement(document.activeElement),
                moved: false,
                outcome: 'no-candidates'
            });
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
            const onScreen = fromOutside ? null : topmostVisible(elements);
            const target = fromOutside || onScreen || elements[0];
            const recovery = fromOutside
                ? 'steered'
                : (onScreen ? 'topmost-visible' : 'first-registered');
            target.focus({ preventScroll: true });
            if (fromOutside && (direction === 'ArrowUp' || direction === 'ArrowDown')) {
                target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            }
            this.reportMove({
                ...base,
                found: Boolean(fromOutside),
                target: describeElement(target),
                after: describeElement(document.activeElement),
                moved: document.activeElement === target,
                recovery,
                outcome: 'entered-from-outside'
            });
            return;
        }

        const next = this.findNearest(current, elements, direction);
        if (next) {
            next.focus({ preventScroll: true });
            if (direction === 'ArrowUp' || direction === 'ArrowDown') {
                next.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            }
            this.reportMove({
                ...base,
                found: true,
                target: describeElement(next),
                after: describeElement(document.activeElement),
                // The distinction that matters on the TV: a target was found, but
                // did focus() actually take?
                moved: document.activeElement === next,
                outcome: 'moved'
            });
            return;
        }

        // Nothing registered that way. Vertically that usually means the next
        // row is still a lazy placeholder with no focusable child: it mounts
        // when it intersects the viewport, but the viewport only moves when
        // focus moves, and focus cannot move because the row has not mounted.
        // Nudging the page breaks that deadlock — the row mounts and the next
        // press lands on it. Horizontal dead ends are genuine row edges.
        // A dead end used to scroll the page, on the theory that the next row
        // was an unmounted lazy placeholder. Measured over two device sessions
        // and 434 dead ends, candidateCount never rose once — and scrolling the
        // real container was actively worse, moving content 80% of a screen away
        // from a cursor that stayed put. A dead end now does nothing; the
        // above/below counts in the record say whether it was a true list edge.
        const isVertical = direction === 'ArrowUp' || direction === 'ArrowDown';

        this.reportMove({
            ...base,
            found: false,
            target: null,
            after: describeElement(document.activeElement),
            moved: false,
            outcome: isVertical ? 'nudged' : 'edge'
        });
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
