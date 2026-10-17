/**
 * JacredGate - one jac.red request at a time, user searches first.
 *
 * jac.red answers 429 (retry-after 5s) to a second request from the same IP
 * within about a second. Running searches in parallel made half of them wait
 * 5s, past the badge (4.5s) and search (8s) timeouts, and the user's own
 * searches queued behind badge lookups (NAS logs 2026-10-17).
 *
 * The gate sends requests one by one, `minIntervalMs` apart. Interactive
 * requests go ahead of background ones (poster badges). A 429 pauses the
 * whole gate for its retry-after and the same request is retried, up to
 * `maxRetries` times; after that its caller gets the 429 response.
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const DEFAULT_RETRY_AFTER_MS = 5000

function retryAfterMs(response, maxPauseMs) {
    const seconds = parseFloat(response.headers?.get?.('retry-after'))
    const ms = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : DEFAULT_RETRY_AFTER_MS
    return Math.min(ms, maxPauseMs)
}

export class JacredGate {
    /**
     * @param {{minIntervalMs?: number, maxRetries?: number, maxPauseMs?: number}} [options]
     */
    constructor({ minIntervalMs = 1000, maxRetries = 2, maxPauseMs = 10000 } = {}) {
        this.minIntervalMs = minIntervalMs
        this.maxRetries = maxRetries
        this.maxPauseMs = maxPauseMs
        this.interactive = []
        this.background = []
        this.nextAt = 0
        this.running = false
    }

    /**
     * Queue a request.
     * @param {() => Promise<Response>} send - performs the HTTP request
     * @param {{background?: boolean}} [options] - background requests yield to interactive ones
     * @returns {Promise<Response>}
     */
    schedule(send, { background = false } = {}) {
        return new Promise((resolve, reject) => {
            const job = { send, resolve, reject, attempts: 0, background }
            ;(background ? this.background : this.interactive).push(job)
            this._pump()
        })
    }

    get size() {
        return this.interactive.length + this.background.length
    }

    async _pump() {
        if (this.running) return
        this.running = true
        try {
            while (this.size > 0) {
                const wait = this.nextAt - Date.now()
                if (wait > 0) {
                    await sleep(wait)
                    continue // a user search may have arrived while waiting
                }

                const lane = this.interactive.length > 0 ? this.interactive : this.background
                const job = lane.shift()
                this.nextAt = Date.now() + this.minIntervalMs

                let response
                try {
                    response = await job.send()
                } catch (err) {
                    job.reject(err)
                    continue
                }

                if (response?.status === 429 && job.attempts < this.maxRetries) {
                    job.attempts++
                    this.nextAt = Date.now() + retryAfterMs(response, this.maxPauseMs)
                    lane.unshift(job)
                    continue
                }
                job.resolve(response)
            }
        } finally {
            this.running = false
        }
    }
}

/** The gate every jac.red search shares (one NAS, one IP). */
export const jacredGate = new JacredGate({
    minIntervalMs: parseInt(process.env.JACRED_MIN_INTERVAL_MS || '1000', 10)
})
