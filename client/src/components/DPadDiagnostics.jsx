import { useCallback, useEffect, useRef, useState } from 'react'
import SpatialEngine, { describeElement } from '../hooks/useSpatialNavigation'
import { getServerBase } from '../utils/serverApi'

/**
 * On-screen + server-streamed D-Pad diagnostics for a real TV.
 *
 * The failure is intermittent: it survives hundreds of presses and then jumps
 * or sticks once. Six lines on screen cannot catch that, so every press is
 * streamed to `POST /api/debug/dpad` and the whole run is read back off the NAS
 * afterwards. The overlay stays as the fallback when the server is unreachable.
 *
 * Two event kinds share one sequence counter, which is what lets the run be put
 * back in order:
 *  - `key`  — a D-Pad press seen by a capture-phase listener on `window`.
 *  - `move` — what `SpatialEngine.move()` decided.
 * A `key` with no matching `move` means something upstream swallowed the press.
 *
 * Off unless VITE_DPAD_DIAG=1 at build time. It never takes a tab stop and
 * ignores pointer events, so it cannot perturb what it measures.
 */

const MAX_RECORDS = 6
const WATCHED_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']
const DEFAULT_ENABLED = import.meta.env?.VITE_DPAD_DIAG === '1'
const DEFAULT_BATCH = 12
const DEFAULT_FLUSH_MS = 4000

const postEvents = async events => {
    const response = await fetch(`${getServerBase()}/api/debug/dpad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
}

const styles = {
    box: {
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 2147483647,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.86)',
        color: '#7CFFB2',
        font: '15px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #2DD4BF',
        maxWidth: '74vw',
        whiteSpace: 'pre-wrap'
    },
    head: { color: '#FFD166', fontWeight: 700, marginBottom: 6 },
    row: { color: '#E6E6E6' },
    bad: { color: '#FF6B6B' }
}

export default function DPadDiagnostics({
    enabled = DEFAULT_ENABLED,
    send = postEvents,
    batchSize = DEFAULT_BATCH,
    flushMs = DEFAULT_FLUSH_MS
}) {
    const [records, setRecords] = useState([])
    const [keyCount, setKeyCount] = useState(0)
    const [moveCount, setMoveCount] = useState(0)
    const [sentCount, setSentCount] = useState(0)
    const [failedCount, setFailedCount] = useState(0)

    const queueRef = useRef([])
    const seqRef = useRef(0)
    const sendingRef = useRef(false)
    const sendRef = useRef(send)
    sendRef.current = send

    const flush = useCallback(async () => {
        if (sendingRef.current || queueRef.current.length === 0) return

        const batch = queueRef.current
        queueRef.current = []
        sendingRef.current = true
        try {
            await sendRef.current(batch)
            setSentCount(count => count + batch.length)
        } catch {
            // Losing the upload must not lose the run: the counters stay on
            // screen so a photo is still worth something.
            setFailedCount(count => count + batch.length)
        } finally {
            sendingRef.current = false
        }
    }, [])

    const enqueue = useCallback(event => {
        seqRef.current += 1
        queueRef.current.push({ ...event, seq: seqRef.current, at: Date.now() })
        if (queueRef.current.length >= batchSize) flush()
    }, [batchSize, flush])

    useEffect(() => {
        if (!enabled) return undefined

        SpatialEngine.setDiagnosticsSink(record => {
            setRecords(prev => [record, ...prev].slice(0, MAX_RECORDS))
            setMoveCount(count => count + 1)
            enqueue({ t: 'move', ...record })
        })

        // Capture phase: counts the key even if a later handler stops it.
        const onKeyDown = event => {
            if (!WATCHED_KEYS.includes(event.key)) return
            setKeyCount(count => count + 1)
            enqueue({
                t: 'key',
                key: event.key,
                active: describeElement(document.activeElement)
            })
        }
        window.addEventListener('keydown', onKeyDown, true)

        const timer = setInterval(flush, flushMs)

        return () => {
            window.removeEventListener('keydown', onKeyDown, true)
            clearInterval(timer)
            SpatialEngine.setDiagnosticsSink(null)
            flush()
        }
    }, [enabled, enqueue, flush, flushMs])

    if (!enabled) return null

    // Read at render time, which React runs after the key event has settled —
    // so this shows where focus ended up, not where it started.
    const active = typeof document !== 'undefined'
        ? describeElement(document.activeElement)
        : 'none'

    return (
        <div style={styles.box} data-testid="dpad-diag">
            <div style={styles.head}>
                D-PAD · KEYS <span data-testid="dpad-diag-keys">{keyCount}</span>
                {' · MOVES '}<span data-testid="dpad-diag-moves">{moveCount}</span>
                {' · SENT '}<span data-testid="dpad-diag-sent">{sentCount}</span>
                {' · FAIL '}<span data-testid="dpad-diag-failed">{failedCount}</span>
            </div>
            <div style={styles.row}>ACTIVE: {active}</div>
            <div data-testid="dpad-diag-log">
                {records.length === 0 && <div style={styles.bad}>no move() calls yet</div>}
                {records.map((record, index) => (
                    <div key={`${record.at}-${index}`} style={record.moved ? styles.row : styles.bad}>
                        {record.key.replace('Arrow', '')} {record.outcome}
                        {' cand='}{record.candidateCount}/{record.zoneSize}
                        {' in='}{record.currentInZone ? 'Y' : 'N'}
                        {' '}{record.before}{' -> '}{record.after}
                    </div>
                ))}
            </div>
        </div>
    )
}
