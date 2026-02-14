# 🚀 PWA-TorServe Release Process

This document outlines the standard operating procedure (SOP) for releasing a new version of the Android client. **Strict adherence to this process is required to ensure the auto-update mechanism works correctly.**

## 📋 Pre-Release Checklist

### 1. Version Bump (CRITICAL)

The auto-update logic relies on a strict mismatch between the remote `version.json` and the local `build.gradle` version.

1.  **Determine the new version number** (e.g., `3.7.2`).
2.  **Update `client/android/app/build.gradle`**:
    *   Increment `versionCode` (e.g., `4` -> `5`).
    *   Update `versionName` (e.g., `"3.7.1"` -> `"3.7.2"`).

    ```gradle
    defaultConfig {
        // ...
        versionCode 5      // <--- Increment this!
        versionName "3.7.2" // <--- Update this!
    }
    ```

3.  **Update `version.json` (Project Root)**:
    *   Set `version` to the **new** version (e.g., `"3.7.2"`).
    *   Set `versionCode` to the **new** code (e.g., `5`).
    *   Update `url` to point to the *future* release asset (e.g., `.../v3.7.2/app-debug.apk`).
    *   Add release notes in `notes`.

    ```json
    {
      "version": "3.7.2",
      "versionCode": 5,
      "minVersion": "1.0.0",
      "url": "https://github.com/dbobkov245-source/PWA-TORSERVE/releases/download/v3.7.2/app-debug.apk",
      "notes": "Description of changes..."
    }
    ```

### 2. Clean Build

Always perform a clean build to ensure the new version numbers are baked into the APK.

```bash
cd client
rm -rf dist
npm run build
npx cap sync android
cd android
./gradlew clean
./gradlew assembleDebug
```

**Artifact Location:** `client/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🚀 Release Steps

1.  **Commit & Push**:
    *   Commit the changes to `build.gradle` and `version.json`.
    *   Message: `Bump version to 3.7.2`.
    *   Push to `main`.

2.  **Create GitHub Release**:
    *   Go to GitHub Releases -> Draft a new release.
    *   **Tag version**: `v3.7.2` (Must match the tag in `version.json` URL).
    *   **Release title**: `v3.7.2 - Proper Title`.
    *   **Description**: Paste the release notes.
    *   **Attach Binary**: Upload the `app-debug.apk` built in Step 2.

3.  **Publish Release**.

## 🔄 Verification

After publishing:
1.  Open the app on the TV (old version).
2.  The auto-update prompt should appear.
3.  Accept the update.
4.  Verify that the app updates and the new version is displayed in Diagnostics/Settings.
