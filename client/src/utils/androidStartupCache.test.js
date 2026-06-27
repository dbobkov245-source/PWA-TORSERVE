import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const mainActivitySrc = fs.readFileSync(
    path.resolve(import.meta.dirname, '../../android/app/src/main/java/com/torserve/pwa/MainActivity.java'),
    'utf8'
)

describe('Android startup cache guard', () => {
    it('clears stale WebView cache after an APK versionCode change', () => {
        expect(mainActivitySrc).toContain('clearWebViewCacheAfterUpdate')
        expect(mainActivitySrc).toContain('getPackageInfo(getPackageName()')
        expect(mainActivitySrc).toContain('LAST_CACHE_CLEAR_VERSION_CODE = "last_cache_clear_version_code"')
        expect(mainActivitySrc).toContain('getLong(LAST_CACHE_CLEAR_VERSION_CODE')
        expect(mainActivitySrc).toContain('webView.clearCache(true)')
        expect(mainActivitySrc).toContain('edit().putLong(LAST_CACHE_CLEAR_VERSION_CODE')
    })
})
