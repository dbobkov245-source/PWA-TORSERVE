import { describe, expect, it } from 'vitest'
import { describeTraktError } from './traktApi.js'

describe('describeTraktError', () => {
    it('blames the app key, not the login, when Trakt rejects the client id', () => {
        expect(describeTraktError({ reason: 'device_code_failed', status: 401 })).toMatch(/ключ приложения/)
        expect(describeTraktError({ reason: 'discovery_failed', status: 403 })).toMatch(/ключ приложения/)
    })

    it('asks to reconnect when Trakt revoked the session', () => {
        expect(describeTraktError({ reason: 'refresh_rejected', status: 401 })).toMatch(/подключи заново/i)
    })

    it('calls a temporary outage temporary', () => {
        expect(describeTraktError({ reason: 'refresh_unavailable', status: 503 })).toMatch(/временно/)
    })

    it('says plainly when scrobbles are being dropped', () => {
        expect(describeTraktError({ reason: 'scrobble_dropped' })).toMatch(/не отправляются/)
    })

    it('stays quiet without an error', () => {
        expect(describeTraktError(null)).toBe('')
    })
})
