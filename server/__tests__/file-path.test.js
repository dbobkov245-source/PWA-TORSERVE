/**
 * File path safety tests.
 *
 * Protects destructive endpoints (DELETE /api/delete/:infoHash) from
 * path traversal attacks where torrent.name contains sequences like
 * "../../etc/passwd" that would escape the download directory.
 */

import { test, expect } from './test-runner.js'

test('safeJoinDownloadPath returns resolved path for normal torrent name', async () => {
    const { safeJoinDownloadPath } = await import('../utils/filePath.js')

    const result = safeJoinDownloadPath('/downloads', 'My.Movie.2024.mkv')
    expect(result).toBe('/downloads/My.Movie.2024.mkv')
})

test('safeJoinDownloadPath handles nested torrent folder name', async () => {
    const { safeJoinDownloadPath } = await import('../utils/filePath.js')

    const result = safeJoinDownloadPath('/downloads', 'ShowName.S01')
    expect(result).toBe('/downloads/ShowName.S01')
})

test('safeJoinDownloadPath throws on path traversal with ../', async () => {
    const { safeJoinDownloadPath } = await import('../utils/filePath.js')

    expect(() => safeJoinDownloadPath('/downloads', '../etc/passwd')).toThrow('Path traversal')
})

test('safeJoinDownloadPath throws on absolute path injection', async () => {
    const { safeJoinDownloadPath } = await import('../utils/filePath.js')

    expect(() => safeJoinDownloadPath('/downloads', '/etc/passwd')).toThrow('Path traversal')
})

test('safeJoinDownloadPath throws on nested traversal', async () => {
    const { safeJoinDownloadPath } = await import('../utils/filePath.js')

    expect(() => safeJoinDownloadPath('/downloads', 'sub/../../secret')).toThrow('Path traversal')
})
