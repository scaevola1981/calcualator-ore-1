#!/bin/bash
echo "Building Web Assets..."
npm run build

echo "Syncing with Android..."
npx cap sync android

echo "Building APK..."
cd android
./gradlew assembleDebug

echo "Done! APK location: android/app/build/outputs/apk/debug/app-debug.apk"
