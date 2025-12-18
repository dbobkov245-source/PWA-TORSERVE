/**
 * Event Loop Lag Monitor
 * Detects when Node.js event loop is blocked
 * 
 * Usage:
 *   import { LagMonitor } from './utils/lag-monitor.js'
 *   const lagMonitor = new LagMonitor(50) // 50ms threshold
 *   lagMonitor.start()
 */

export class LagMonitor {
    constructor(threshold = 50) {
        this.threshold = threshold
        this.lastCheck = Date.now()
        this.lagEvents = []
        this.intervalId = null
    }

    start() {
        if (this.intervalId) return // Already running
        
        this.intervalId = setInterval(() => {
            const now = Date.now()
            const expected = 100
            const lag = now - this.lastCheck - expected
            
            if (lag > this.threshold) {
                const event = {
                    timestamp: now,
                    lag: lag,
                    memory: Math.round(process.memoryUsage().rss / 1024 / 1024)
                }
                
                this.lagEvents.push(event)
                console.warn(`[LagMonitor] Event loop lag: ${lag}ms, RAM: ${event.memory}MB`)
                
                // Keep only last 100 events
                if (this.lagEvents.length > 100) {
                    this.lagEvents.shift()
                }
            }
            
            this.lastCheck = now
        }, 100)
        
        console.log('[LagMonitor] Started')
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
