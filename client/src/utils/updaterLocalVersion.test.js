import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const serverSrc = fs.readFileSync(
    path.resolve(import.meta.dirname, '../../../server/index.js'),
    'utf8'
)

describe('NAS updater metadata', () => {
    it('prefers local client-dist version.json and rewrites APK URL to the requesting host', () => {
        expect(serverSrc).toContain('LOCAL_UPDATER_VERSION_PATH')
        expect(serverSrc).toContain('fs.existsSync(LOCAL_UPDATER_VERSION_PATH)')
        expect(serverSrc).toContain('req.get(\'host\')')
        expect(serverSrc).toContain('pwa-torserve-v${local.version}.apk')
    })
})
