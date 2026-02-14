/**
 * App Auto-Updater Utility
 * Checks for updates via version.json hosted on GitHub,
 * downloads APK, and triggers native installation.
 * 
 * Only works on Capacitor (Android). No-op on web.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

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
        const [remoteRes, local] = await Promise.all([
            fetch(VERSION_URL, { cache: 'no-store' }),
            getCurrentVersion()
        ]);

        if (!remoteRes.ok) {
            console.warn('[Updater] Failed to fetch version.json:', remoteRes.status);
            return { available: false };
        }

        const remote = await remoteRes.json();
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
        // Notify start
        if (onProgress) onProgress(0);

        // Download APK as blob via fetch (better progress tracking than CapacitorHttp)
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;

        // Read the stream with progress
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (onProgress && total > 0) {
                onProgress(Math.round((received / total) * 100));
            }
        }

        // Combine chunks into a single Uint8Array
        const blob = new Blob(chunks);
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Convert to base64 for Capacitor Filesystem
        const base64 = uint8ArrayToBase64(uint8Array);

        // Write to cache directory (accessible by FileProvider)
        await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Cache
        });

        if (onProgress) onProgress(100);

        // Get the full file URI
        const fileInfo = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
        });

        // Trigger native APK installation
        await TVPlayer.installApk({ path: fileInfo.uri });
    } catch (e) {
        console.error('[Updater] Download/install failed:', e);
        throw e;
    }
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    // Process in chunks to avoid call stack overflow for large files
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}
