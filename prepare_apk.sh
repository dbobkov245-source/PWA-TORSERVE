#!/bin/bash

# Prepare APK for PWA-TorServe

echo "Building React Client..."
cd client
npm run build

echo "Initializing Android Platform..."
# Check if android folder exists
if [ ! -d "android" ]; then
    npx cap add android
else
    echo "Android platform already added."
fi

cd ..

echo "Patching AndroidManifest.xml for Magnet Links..."
node patch_android_manifest.js

echo "Syncing Capacitor..."
cd client
npx cap sync

echo "---------------------------------------------------"
echo "DONE! To build the APK:"
echo "1. Open Android Studio: npx cap open android"
echo "2. Or build from command line if SDK is ready: cd client/android && ./gradlew assembleDebug"
echo "---------------------------------------------------"
