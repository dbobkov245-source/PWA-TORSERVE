/**
 * Deployment config regression tests.
 *
 * Ensures torrent networking requirements stay aligned with the backend:
 * - Docker publishes both TCP and UDP for TORRENT_PORT
 * - Example env enables fixed torrent port outside Docker too
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { test, expect } from './test-runner.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../..')

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

test('docker compose publishes torrent port over TCP and UDP', () => {
    const defaultCompose = readRepoFile('docker-compose.yml')
    expect(defaultCompose).toContain('"6881:6881/tcp"')
    expect(defaultCompose).toContain('"6881:6881/udp"')
})

test('synology compose keeps torrent networking reachable', () => {
    const synologyCompose = readRepoFile('docker-compose.synology.yml')
    const usesHostMode = synologyCompose.includes('network_mode: host')

    if (usesHostMode) {
        expect(synologyCompose).toContain('TORRENT_PORT=6881')
        expect(synologyCompose).toContain('TORRENT_DHT_PORT=6882')
        expect(synologyCompose).toContain('TORRENT_UTP=0')
        expect(synologyCompose).toContain('TORRENT_DHT_MODE=internal')
        expect(synologyCompose).toContain('TORRENT_CONNECTIONS=55')
        expect(synologyCompose).toContain('TORRENT_MAX_REQUESTS=32')
        return
    }

    expect(synologyCompose).toContain('"6881:6881/tcp"')
    expect(synologyCompose).toContain('"6881:6881/udp"')
})

test('env example enables fixed torrent port for inbound peer discovery', () => {
    const envExample = readRepoFile('.env.example')
    expect(envExample).toContain('TORRENT_PORT=6881')
})

test('stream handler uses async stat to avoid blocking the event loop', () => {
    const indexSrc = readRepoFile('server/index.js')
    expect(indexSrc).not.toContain('fs.statSync')
})

test('index.js has GET /api/status/stream SSE endpoint', () => {
    const indexSrc = readRepoFile('server/index.js')
    expect(indexSrc).toContain('/api/status/stream')
    expect(indexSrc).toContain('text/event-stream')
})
