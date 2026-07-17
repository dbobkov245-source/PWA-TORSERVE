export function createOperationTracker({ now = Date.now, maxMarkers = 100 } = {}) {
    let sequence = 0
    const active = new Map()
    const markers = []

    function push(marker) {
        markers.push(marker)
        while (markers.length > maxMarkers) markers.shift()
    }

    return {
        start(name, metadata = {}) {
            const id = `${name}:${++sequence}`
            const startedAt = now()
            active.set(id, { id, name, startedAt })
            push({ t: startedAt, id, name, phase: 'start', ...metadata })
            return id
        },

        finish(id, outcome = {}) {
            const operation = active.get(id)
            if (!operation) return false

            const finishedAt = now()
            active.delete(id)
            push({
                t: finishedAt,
                id,
                name: operation.name,
                phase: 'finish',
                durationMs: Math.max(0, finishedAt - operation.startedAt),
                ...outcome,
            })
            return true
        },

        activeCount() {
            return active.size
        },

        drain() {
            return markers.splice(0, markers.length)
        },
    }
}
