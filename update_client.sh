#!/bin/bash

# Update Client Code in APK Project
# Run this after making changes to React code

echo "Building React Client..."
cd client
npm run build

echo "Syncing to Android Project..."
npx cap sync

echo "Done! Now rebuild the APK in Android Studio or with Gradle."
