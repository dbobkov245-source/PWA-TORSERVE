import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

// serverUrl persistence.
//
// localStorage alone is volatile on some Android TV WebViews — it gets wiped
// on APK update/reinstall, so the user had to re-enter the NAS IP every time.
// Capacitor Preferences is native (SharedPreferences) and survives updates.
//
// Strategy: write BOTH. localStorage stays as the synchronous fast-path for
// React state init; Preferences is the durable source. On startup we hydrate
// localStorage from Preferences when they diverge (e.g. after an update wiped
// the WebView storage).
const KEY = 'serverUrl'

export async function loadServerUrlFromPrefs() {
    if (!Capacitor.isNativePlatform()) return ''
    try {
        const { value } = await Preferences.get({ key: KEY })
        return (value || '').trim().replace(/\/+$/, '')
    } catch {
        return ''
    }
}

export async function persistServerUrl(url) {
    const clean = (url || '').trim().replace(/\/+$/, '')
    try { localStorage.setItem(KEY, clean) } catch { /* quota / disabled */ }
    if (Capacitor.isNativePlatform()) {
        try { await Preferences.set({ key: KEY, value: clean }) } catch { /* ignore */ }
    }
    return clean
}
