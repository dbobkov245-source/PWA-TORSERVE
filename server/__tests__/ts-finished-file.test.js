/**
 * Serving a finished TorrServer download.
 *
 * A TS-migrated torrent keeps its real infoHash, but once the job stops
 * downloading `getActiveTsJob` returns null and the stream route falls through
 * to the local library — which indexes files under a synthetic sha1 of their
 * path, so the real hash misses and playback 404s. The bytes are on disk the
 * whole time; the job record knows exactly where.
 */

import { test, expect } from './test-runner.js'

const doneJob = {
    infoHash: '6eea6e56f897fefa49f835726c6da09ed8e56ec2',
    name: 'Mutiny.2026.2160p.WEB-DL.HDR.H265.Master5.mkv',
    status: 'done',
    files: [{ path: 'Mutiny.2026.2160p.WEB-DL.HDR.H265.Master5.mkv', length: 19976640505, tsId: 1 }]
}

test('resolves a finished job file to its path on disk', async () => {
    const { resolveFinishedTsFile } = await import('../tsDownload.js')

    const file = resolveFinishedTsFile(doneJob, 0, '/downloads')

    expect(file.absPath).toBe('/downloads/Mutiny.2026.2160p.WEB-DL.HDR.H265.Master5.mkv')
    expect(file.name).toBe('Mutiny.2026.2160p.WEB-DL.HDR.H265.Master5.mkv')
    expect(file.length).toBe(19976640505)
})

test('refuses a job that is still downloading', async () => {
    const { resolveFinishedTsFile } = await import('../tsDownload.js')
    // While downloading, the player must be redirected to TorrServer instead —
    // the file on disk is still a partial prefix.
    expect(resolveFinishedTsFile({ ...doneJob, status: 'downloading' }, 0, '/downloads')).toBe(null)
})

test('refuses a missing job, a bad index and a job with no files', async () => {
    const { resolveFinishedTsFile } = await import('../tsDownload.js')

    expect(resolveFinishedTsFile(null, 0, '/downloads')).toBe(null)
    expect(resolveFinishedTsFile(doneJob, 7, '/downloads')).toBe(null)
    expect(resolveFinishedTsFile({ ...doneJob, files: [] }, 0, '/downloads')).toBe(null)
})

test('keeps a traversing path inside the download folder', async () => {
    const { resolveFinishedTsFile } = await import('../tsDownload.js')

    const evil = { ...doneJob, files: [{ path: '../../etc/passwd', length: 1, tsId: 1 }] }
    const file = resolveFinishedTsFile(evil, 0, '/downloads')

    expect(file === null || file.absPath.startsWith('/downloads')).toBe(true)
})

test('uses the basename for a nested torrent path', async () => {
    const { resolveFinishedTsFile } = await import('../tsDownload.js')

    const nested = { ...doneJob, files: [{ path: 'Dark.Matter.S02/Dark.Matter.S02E01.1080p.mkv', length: 42, tsId: 3 }] }
    const file = resolveFinishedTsFile(nested, 0, '/downloads')

    expect(file.name).toBe('Dark.Matter.S02E01.1080p.mkv')
    expect(file.absPath).toBe('/downloads/Dark.Matter.S02/Dark.Matter.S02E01.1080p.mkv')
})

test('the stream route asks for a finished TorrServer file before giving up', async () => {
    const { readFileSync } = await import('fs')
    const { fileURLToPath } = await import('url')
    const { dirname, join } = await import('path')
    const here = dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(join(here, '..', 'index.js'), 'utf8')

    // Without this the route answers 404 for every completed TS download,
    // which is what broke playback of every newly grabbed film.
    expect(src).toContain('getFinishedTsFile')
    const finishedAt = src.indexOf('getFinishedTsFile(infoHash, index)')
    const notFoundAt = src.indexOf("res.status(404).send('Torrent not found')")
    expect(finishedAt > -1).toBe(true)
    expect(finishedAt < notFoundAt).toBe(true)
})
