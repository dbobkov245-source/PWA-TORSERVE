/**
 * dpadTrace.js — bounded store for D-Pad navigation traces sent by the TV.
 *
 * The TV's focus failure is intermittent: it survives hundreds of presses and
 * then jumps or sticks once. A six-line on-screen overlay cannot catch that, so
 * the device streams every press here and the whole run is read back afterwards.
 *
 * Bounded on purpose — this runs on a NAS that has already been taken down once
 * by unbounded growth, so the buffer drops its oldest entries rather than the
 * box dropping everything else.
 */

const DEFAULT_LIMIT = 5000

const isPlainObject = value =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

export function createDpadTrace({ limit = DEFAULT_LIMIT, append = null } = {}) {
    const entries = []

    return {
        /**
         * @param {Array<object>} batch entries from the device
         * @returns {number} how many were accepted
         */
        record(batch) {
            if (!Array.isArray(batch)) return 0

            const accepted = batch.filter(isPlainObject)
            if (accepted.length === 0) return 0

            const rxAt = Date.now()
            for (const entry of accepted) {
                const stamped = { ...entry, rxAt }
                entries.push(stamped)

                if (append) {
                    try {
                        append(JSON.stringify(stamped))
                    } catch {
                        // Durability is a convenience here; losing the file must
                        // never cost us the in-memory trace we are about to read.
                    }
                }
            }

            if (entries.length > limit) {
                entries.splice(0, entries.length - limit)
            }

            return accepted.length
        },

        all() {
            return [...entries]
        },

        size() {
            return entries.length
        },

        clear() {
            entries.length = 0
        }
    }
}

export default createDpadTrace

/**
 * Append lines to a file that is not allowed to grow without bound.
 *
 * This NAS has already been taken down once by unbounded growth, so the trace
 * rotates to a single `.1` sibling and starts over rather than filling the
 * volume. Two files, bounded total, no cron needed.
 */
export function createFileAppender({ path, maxBytes = 5 * 1024 * 1024, fs }) {
    const sizeOf = () => {
        try {
            return fs.statSync(path).size
        } catch {
            return 0 // not written yet
        }
    }

    return line => {
        if (sizeOf() + line.length > maxBytes) {
            try {
                fs.renameSync(path, `${path}.1`)
            } catch {
                // A stuck rotation must not stop us recording.
            }
        }
        fs.appendFileSync(path, line + '\n')
    }
}
