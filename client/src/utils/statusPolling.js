export function createSerializedPollTask(task) {
    let inFlight = null

    return (...args) => {
        if (inFlight) return inFlight

        inFlight = Promise.resolve(task(...args))
            .finally(() => {
                inFlight = null
            })

        return inFlight
    }
}
