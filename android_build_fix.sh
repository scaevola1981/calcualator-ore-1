#!/bin/bash

# 1. Set JAVA_HOME dynamically
# The instruction says: use readlink -f $(which java)
# But $(which java) points to the binary, e.g. /usr/bin/java -> /etc/alternatives/java -> /usr/lib/jvm/java-11-openjdk-amd64/bin/java
# JAVA_HOME should be the root dir, e.g. /usr/lib/jvm/java-11-openjdk-amd64
# modifying the command slightly to get the HOME, not the bin/java

JAVA_BIN=$(readlink -f $(which java))
if [ -z "$JAVA_BIN" ]; then
    echo "Error: Could not find java executable."
    exit 1
fi

# Strip /bin/java from the end
export JAVA_HOME=${JAVA_BIN%/bin/java}

echo "Detected JAVA_BIN: $JAVA_BIN"
echo "Setting JAVA_HOME to: $JAVA_HOME"

# 2. Configure local.properties
SDK_DIR="$HOME/Android/Sdk"
LOCAL_PROPERTIES="android/local.properties"

if [ ! -d "$SDK_DIR" ]; then
    echo "Warning: Default SDK directory $SDK_DIR not found. Please ensure Android SDK is installed."
else
    echo "sdk.dir=$SDK_DIR" > "$LOCAL_PROPERTIES"
    echo "Updated $LOCAL_PROPERTIES with sdk.dir=$SDK_DIR"
fi

# 3. Build APK
echo "Starting Build..."
cd android
chmod +x gradlew
./gradlew assembleDebug

# 4. Confirm Location
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo "BUILD SUCCESSFUL!"
    echo "APK Location: $(readlink -f $APK_PATH)"
else
    echo "BUILD FAILED. APK not found at $APK_PATH"
    exit 1
fi
