# PWA-TorServe Setup Guide

## 1. Server Immortality (Termux:Boot)
To ensure the server starts automatically on the Ugoos device:

1.  **Install Termux:Boot** app on the Ugoos device.
2.  **Launch Termux:Boot** once.
3.  **Ensure SSH is running** on Ugoos:
    ```bash
    sshd
    ```
4.  **Run the setup script** from your Mac:
    ```bash
    ./run_setup_remote.sh
    ```
    *If this fails (Connection refused), make sure `sshd` is running on port 8022 on the device.*

    **Manual Method:**
    Copy `termux_boot_setup.sh` to the device and run:
    ```bash
    sh termux_boot_setup.sh
    ```

## 2. Build APK (Capacitor)
To build the APK for Sony TV:

1.  **Prepare the project** (First time):
    ```bash
    ./prepare_apk.sh
    ```
    *This might take a while (Gradle Sync).*

2.  **Update Client Code** (After changes):
    ```bash
    ./update_client.sh
    ```

3.  **Build the APK**:
    - **Option A (Android Studio)**:
        ```bash
        cd client
        npx cap open android
        ```
    - **Option B (Command Line)**:
        ```bash
        cd client/android
        ./gradlew assembleDebug
        ```
        APK Location: `client/android/app/build/outputs/apk/debug/app-debug.apk`

## 3. App Features
- **Server URL**: Configurable via **⚙️ Settings** button. Defaults to `http://192.168.1.88:3000`.
- **Performance**: Polling interval set to 5s. File lists are collapsible.
- **Magnet Links**: Supports opening `magnet:` links directly.

## 4. Testing on Smartphone
You can absolutely test the APK on an Android phone before installing on TV.

1.  **Transfer APK**: Send `client/android/app/build/outputs/apk/debug/app-debug.apk` to your phone (via USB, Telegram, etc.).
2.  **Install**: Allow installation from unknown sources.
3.  **Connect**:
    *   Ensure your phone is on the **same Wi-Fi** as the Ugoos.
    *   Open the App.
    *   Tap **⚙️** and enter `http://192.168.1.88:3000`.
4.  **Verify**: Try adding a magnet link. If it works on the phone, it will work on the TV.
