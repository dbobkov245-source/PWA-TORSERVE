import { test, expect } from './test-runner.js'

test('scheduleBackgroundRefresh does not await the refresh promise', async () => {
    const { scheduleBackgroundRefresh } = await import('../statusResponse.js')

    let resolved = false
    scheduleBackgroundRefresh(() => new Promise((resolve) => {
        setTimeout(() => {
            resolved = true
            resolve()
        }, 10)
    }))

    expect(resolved).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 20))
    expect(resolved).toBe(true)
})

test('scheduleBackgroundRefresh forwards refresh errors to the warning handler', async () => {
    const { scheduleBackgroundRefresh } = await import('../statusResponse.js')

    let warningMessage = null
    scheduleBackgroundRefresh(
        () => Promise.reject(new Error('background refresh failed')),
        (err) => { warningMessage = err.message }
    )

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(warningMessage).toBe('background refresh failed')
})

test('serializeStatusItems preserves the public /api/status payload shape', async () => {
    const { serializeStatusItems } = await import('../statusResponse.js')

    const items = serializeStatusItems([{
        infoHash: 'abc123',
        name: 'Example Torrent',
        progress: 0.5,
        isReady: false,
        downloaded: 500,
        totalSize: 1000,
        downloadSpeed: 128,
        numPeers: 7,
        eta: 4,
        files: [{
            name: 'video.mkv',
            length: 1000,
            index: 0,
            path: '/should/not/leak'
        }]
    }])

    expect(items).toEqual([{
        infoHash: 'abc123',
        name: 'Example Torrent',
        progress: 0.5,
        isReady: false,
        downloaded: 500,
        totalSize: 1000,
        downloadSpeed: 128,
        numPeers: 7,
        eta: 4,
        files: [{
            name: 'video.mkv',
            length: 1000,
            index: 0
        }]
    }])
})
