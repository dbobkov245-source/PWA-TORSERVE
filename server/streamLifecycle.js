import { pipeline } from 'node:stream'

/** Pipe a playback response with one cleanup path for EOF, failure and disconnect. */
export function pipePlaybackStream({ stream, res, infoHash, file, fromDisk, monitor, stallTimeoutMs, onClose }) {
    let closed = false
    let timer = null
    const clearWatchdog = () => {
        if (timer) clearTimeout(timer)
        timer = null
    }
    const close = () => {
        if (closed) return
        closed = true
        clearWatchdog()
        monitor.closeStream(infoHash)
        onClose()
    }

    monitor.openStream(infoHash, { fromDisk, fileName: file.name, fileLength: file.length })
    stream.on('data', chunk => monitor.recordBytes(infoHash, chunk.length))
    stream.once('data', clearWatchdog)
    res.once('close', close)

    if (!fromDisk) {
        timer = setTimeout(() => {
            monitor.recordStall(infoHash)
            stream.destroy(new Error(`Stream stalled before first byte (${stallTimeoutMs}ms)`))
        }, stallTimeoutMs)
    }

    pipeline(stream, res, err => {
        close()
        if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            console.warn(`[Stream] ${infoHash}: ${err.message}`)
        }
    })
}
