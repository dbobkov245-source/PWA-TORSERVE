/**
 * Event Loop Lag Monitor v2.3
 * Detects when Node.js event loop is blocked
 * 
 * v2.3: Adaptive settings for production (less sensitive, less overhead)
 * 
 * Usage:
 *   import { LagMonitor } from './utils/lag-monitor.js'
 *   const lagMonitor = new LagMonitor()  // Auto-detects prod/dev
 *   lagMonitor.start()
 */

export class LagMonitor {
    constructor(threshold = null) {
        // 🔥 v2.3: Adaptive settings based on environment
        const isProd = process.env.NODE_ENV === 'production'
        
        // Production: less sensitive (200ms threshold, 1s interval)
        // Development: more sensitive for debugging (50ms threshold, 250ms interval)
        this.threshold = threshold ?? (isProd ? 200 : 50)
        this.checkInterval = isProd ? 1000 : 250
        
        this.lastCheck = Date.now()
        this.lagEvents = []
        this.intervalId = null
        this.isProd = isProd
    }

    start() {
        if (this.intervalId) return // Already running

        this.intervalId = setInterval(() => {
            const now = Date.now()
            // 🔥 v2.3: expected = interval + 50ms tolerance for I/O delays
            const expected = this.checkInterval + 50
            const lag = now - this.lastCheck - expected

            if (lag > this.threshold) {
                const event = {
                    timestamp: now,
                    lag: lag,
                    memory: Math.round(process.memoryUsage().rss / 1024 / 1024)
                }

                this.lagEvents.push(event)
                
                // 🔥 v2.3: Only log warnings in dev, or critical lags (>1s) in prod
                if (!this.isProd || lag > 1000) {
                    console.warn(`[LagMonitor] Event loop lag: ${lag}ms, RAM: ${event.memory}MB`)
                }

                // Keep only last 50 events
                if (this.lagEvents.length > 50) {
                    this.lagEvents.shift()
                }
            }

            this.lastCheck = now
        }, this.checkInterval)

        console.log(`[LagMonitor] Started (${this.isProd ? 'prod' : 'dev'} mode: ${this.checkInterval}ms interval, ${this.threshold}ms threshold)`)
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
            console.log('[LagMonitor] Stopped')
        }
    }

    getStats() {
        const now = Date.now()
        const recentLags = this.lagEvents.filter(e =>
            now - e.timestamp < 60000
        )

        return {
            totalLags: this.lagEvents.length,
            recentLags: recentLags.length,
            avgLag: recentLags.length > 0
                ? Math.round(recentLags.reduce((sum, e) => sum + e.lag, 0) / recentLags.length)
                : 0,
            maxLag: recentLags.length > 0
                ? Math.max(...recentLags.map(e => e.lag))
                : 0
        }
    }
}
