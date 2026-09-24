import fs from 'node:fs/promises'
import vm from 'node:vm'
import { Writable } from 'node:stream'

/** Evaluate the actual route registration without starting index.js and its background jobs. */
export async function loadRoute(relativeFile, marker, bindings = {}) {
    const source = await fs.readFile(new URL(relativeFile, import.meta.url), 'utf8')
    const start = source.indexOf(marker)
    if (start < 0) throw new Error(`Route not found: ${marker}`)
    const end = source.indexOf('\n})', start) + 3
    let handler
    const register = (...args) => { handler = args.at(-1) }
    const context = vm.createContext({
        console: { log() {}, warn() {}, error() {} }, Buffer, URL, Date,
        setTimeout, clearTimeout, process: { env: {} },
        app: { get: register, post: register, delete: register, put: register },
        router: { get: register, post: register }, ...bindings
    })
    // Include an optional wrapper's closing parenthesis.
    vm.runInContext(source.slice(start, end + (source[end] === ')' ? 1 : 0)), context)
    return { handler, context }
}

/** A real Writable with the HTTP surface used by these handlers. */
export function responseStream() {
    const chunks = []
    const res = new Writable({ write(chunk, encoding, done) { chunks.push(Buffer.from(chunk)); done() } })
    res.headersSent = false
    res.statusCode = 200
    res.headers = {}
    res.status = code => { res.statusCode = code; return res }
    res.set = res.setHeader = (key, value) => { res.headers[key.toLowerCase()] = value; return res }
    res.writeHead = (code, headers) => { res.statusCode = code; Object.entries(headers).forEach(([k, v]) => res.set(k, v)); res.headersSent = true; return res }
    res.send = value => { res.headersSent = true; res.end(value); return res }
    res.json = value => res.send(JSON.stringify(value))
    res.on('error', () => {})
    res.body = () => Buffer.concat(chunks).toString()
    return res
}

export const tick = () => new Promise(resolve => setImmediate(resolve))
