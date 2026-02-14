/**
 * App Auto-Updater Utility
 * Checks for updates via version.json hosted on GitHub,
 * downloads APK, and triggers native installation.
 * 
 * Only works on Capacitor (Android). No-op on web.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { CapacitorHttp } from '@capacitor/core';

const TVPlayer = registerPlugin('TVPlayer');

// URL to raw version.json in your GitHub repo (main branch)
const VERSION_URL = 'https://raw.githubusercontent.com/dbobkov245-source/PWA-TORSERVE/main/version.json';

// Fallback version if native call fails (web mode)
const FALLBACK_VERSION = { versionName: '0.0.0', versionCode: 0 };

/**
 * Compare two semver strings: returns true if remote > local
 */
function isNewerVersion(remote, local) {
    const r = remote.split('.').map(Number);
    const l = local.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const rv = r[i] || 0;
        const lv = l[i] || 0;
        if (rv > lv) return true;
        if (rv < lv) return false;
    }
    return false;
}

/**
 * Get the current installed app version from native Android.
 * Returns { versionName: string, versionCode: number }
 */
export async function getCurrentVersion() {
    if (!Capacitor.isNativePlatform()) return FALLBACK_VERSION;
    try {
        return await TVPlayer.getAppVersion();
    } catch (e) {
        console.warn('[Updater] Failed to get app version:', e);
        return FALLBACK_VERSION;
    }
}

/**
 * Check if an update is available.
 * Returns { available: boolean, version?: string, notes?: string, url?: string, forceUpdate?: boolean }
 */
export async function checkForUpdate() {
    if (!Capacitor.isNativePlatform()) {
        return { available: false };
    }

    try {
        // Use CapacitorHttp for the version check too (bypasses CORS)
        const remoteRes = await CapacitorHttp.get({
            url: VERSION_URL,
            headers: { 'Cache-Control': 'no-cache' }
        });
        const local = await getCurrentVersion();

        if (remoteRes.status !== 200) {
            console.warn('[Updater] Failed to fetch version.json:', remoteRes.status);
            return { available: false };
        }

        const remote = typeof remoteRes.data === 'string'
            ? JSON.parse(remoteRes.data)
            : remoteRes.data;
        const available = isNewerVersion(remote.version, local.versionName);

        // Check if force update is needed (current version is below minVersion)
        const forceUpdate = remote.minVersion
            ? isNewerVersion(remote.minVersion, local.versionName)
            : false;

        return {
            available,
            forceUpdate,
            version: remote.version,
            notes: remote.notes || '',
            url: remote.url,
            currentVersion: local.versionName
        };
    } catch (e) {
        console.warn('[Updater] Update check failed:', e);
        return { available: false };
    }
}

/**
 * Download the APK and trigger installation.
 * Uses CapacitorHttp (native HTTP, no CORS) + Filesystem for writing.
 * @param {string} url - Direct download URL for the APK
 * @param {function} onProgress - Optional callback(percent: number)
 * @returns {Promise<void>}
 */
export async function downloadAndInstall(url, onProgress) {
    if (!Capacitor.isNativePlatform()) {
        throw new Error('Updates only available on Android');
    }

    const fileName = 'update.apk';

    try {
        if (onProgress) onProgress(5);

        // Use CapacitorHttp.get with responseType blob
        // This runs natively and handles redirects (GitHub → objects.githubusercontent.com)
        const response = await CapacitorHttp.get({
            url: url,
            responseType: 'blob',  // Get as base64 data
            readTimeout: 120000,   // 2 minutes for large APK
            connectTimeout: 30000
        });

        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Download failed: HTTP ${response.status}`);
        }

        if (onProgress) onProgress(60);

        // response.data is base64-encoded when responseType is 'blob'
        await Filesystem.writeFile({
            path: fileName,
            data: response.data,
            directory: Directory.Cache
        });

        if (onProgress) onProgress(90);

        // Get the full file URI for the native installer
        const fileInfo = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
        });

        if (onProgress) onProgress(100);

        // Trigger native APK installation
        await TVPlayer.installApk({ path: fileInfo.uri });
    } catch (e) {
        console.error('[Updater] Download/install failed:', e);
        throw e;
    }
}
