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
const PENDING_INSTALL_KEY = 'app_update_pending_install';

// Fallback version if native call fails (web mode)
const FALLBACK_VERSION = { versionName: '0.0.0', versionCode: 0 };

function readPendingInstall() {
    try {
        const raw = localStorage.getItem(PENDING_INSTALL_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writePendingInstall(payload) {
    try {
        localStorage.setItem(PENDING_INSTALL_KEY, JSON.stringify(payload));
    } catch { }
}

function clearPendingInstall() {
    try {
        localStorage.removeItem(PENDING_INSTALL_KEY);
    } catch { }
}

async function installCachedApk(fileName, onProgress) {
    const fileInfo = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache
    });

    if (onProgress) onProgress(100);
    await TVPlayer.installApk({ path: fileInfo.uri });
}

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

        if (!available) {
            clearPendingInstall();
        }

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
 * @param {{ version?: string }} options - Optional release metadata
 * @returns {Promise<void>}
 */
export async function downloadAndInstall(url, onProgress, options = {}) {
    if (!Capacitor.isNativePlatform()) {
        throw new Error('Updates only available on Android');
    }

    const version = String(options.version || 'latest').replace(/[^\w.-]/g, '_');
    const fileName = `update-${version}.apk`;

    try {
        const pending = readPendingInstall();
        const canReuseCached = pending?.url === url && pending?.fileName === fileName;

        if (canReuseCached) {
            try {
                await Filesystem.stat({ path: fileName, directory: Directory.Cache });
                if (onProgress) onProgress(95);
                await installCachedApk(fileName, onProgress);
                return;
            } catch {
                // Cache entry is stale -> continue with fresh download.
            }
        }

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

        writePendingInstall({
            url,
            fileName,
            version,
            timestamp: Date.now()
        });

        if (onProgress) onProgress(90);

        // Trigger native APK installation
        await installCachedApk(fileName, onProgress);
    } catch (e) {
        console.error('[Updater] Download/install failed:', e);
        throw e;
    }
}

/**
 * Try to install a pending update from cache if available.
 * Call this on app launch before checking for new updates.
 * @returns {Promise<boolean>} true if installation started, false otherwise
 */
export async function tryInstallPending() {
    if (!Capacitor.isNativePlatform()) return false;

    const pending = readPendingInstall();
    if (!pending || !pending.fileName) return false;

    try {
        // Check if file exists in cache
        await Filesystem.stat({
            path: pending.fileName,
            directory: Directory.Cache
        });

        console.log('[Updater] Found pending install:', pending.fileName);

        // Trigger install
        await installCachedApk(pending.fileName);
        return true;
    } catch (e) {
        console.warn('[Updater] Pending install file not found or invalid:', e);
        clearPendingInstall();
        return false;
    }
}
