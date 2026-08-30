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

test('both version.json copies agree', async () => {
    // There are two tracked copies: the repo root one, which GitHub raw serves
    // to the updater, and client/public/version.json, which the build copies to
    // dist and the server serves locally. appUpdater checks the LOCAL sources
    // first, so when these drift the newest release becomes invisible over LAN.
    // They sat three releases apart (3.18.0 vs 3.17.2) before this test existed.
    const { readFileSync } = await import('fs')
    const { fileURLToPath } = await import('url')
    const { dirname, join } = await import('path')

    const here = dirname(fileURLToPath(import.meta.url))
    const repoRoot = join(here, '..', '..')

    const root = JSON.parse(readFileSync(join(repoRoot, 'version.json'), 'utf8'))
    const published = JSON.parse(readFileSync(join(repoRoot, 'client', 'public', 'version.json'), 'utf8'))

    expect(published.version).toBe(root.version)
    expect(published.versionCode).toBe(root.versionCode)
    expect(published.url).toBe(root.url)
})
