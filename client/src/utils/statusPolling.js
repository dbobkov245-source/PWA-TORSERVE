export function createSerializedPollTask(task) {
    let inFlight = null
    let trailingArgs = null

    const start = (args) => {
        let result
        try {
            result = task(...args)
        } catch (error) {
            result = Promise.reject(error)
        }

        const current = Promise.resolve(result)
        inFlight = current

        const settle = () => {
            if (inFlight !== current) return
            inFlight = null
            if (!trailingArgs) return

            const nextArgs = trailingArgs
            trailingArgs = null
            start(nextArgs)
        }
        current.then(settle, settle)

        return current
    }

    const run = (...args) => {
        if (inFlight) return inFlight
        return start(args)
    }

    // Lifecycle refreshes must not race an active interval request. Coalesce
    // repeated resume events into one trailing run instead of dropping them.
    run.afterCurrent = (...args) => {
        if (!inFlight) return start(args)
        trailingArgs = args
        return inFlight
    }

    return run
}
