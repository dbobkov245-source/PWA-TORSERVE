/**
 * Request metadata tests.
 *
 * Keeps audit logging stable for destructive endpoints such as DELETE.
 */

import { test, expect } from './test-runner.js'

test('describeRequestSource prefers x-forwarded-for and includes user agent', async () => {
    const { describeRequestSource } = await import('../requestMeta.js')

    const source = describeRequestSource({
        headers: {
            'x-forwarded-for': '192.168.1.50, 10.0.0.2',
            'user-agent': 'Mozilla/5.0 (Android TV)'
        },
        ip: '::1',
        connection: { remoteAddress: '127.0.0.1' }
    })

    expect(source).toBe('ip=192.168.1.50 ua="Mozilla/5.0 (Android TV)"')
})

test('describeRequestSource falls back to req.ip and unknown user agent', async () => {
    const { describeRequestSource } = await import('../requestMeta.js')

    const source = describeRequestSource({
        headers: {},
        ip: '::ffff:192.168.1.70'
    })

    expect(source).toBe('ip=::ffff:192.168.1.70 ua="unknown"')
})
