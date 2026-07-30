#!/bin/bash

# 直接构建 AAB 文件脚本

set -e

echo "🚀 开始构建 Android App Bundle..."
echo ""

cd "$(dirname "$0")"

# 设置 Android SDK 路径
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# 检查 Android SDK
if [ ! -d "$ANDROID_HOME" ]; then
    echo "❌ 错误: Android SDK 未找到在 $ANDROID_HOME"
    exit 1
fi

# 检查 Keystore
if [ ! -f "android/app/upload-release.keystore" ]; then
    echo "❌ 错误: Keystore 文件未找到 (android/app/upload-release.keystore)"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 进入 android 目录
cd android

echo "🔨 开始构建..."
echo ""

# 构建 App Bundle
./gradlew bundleRelease --no-daemon --stacktrace

echo ""
echo "✅ 构建完成！"
echo ""

# 检查构建结果
AAB_FILE="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_FILE" ]; then
    echo "📦 App Bundle 位置: $(pwd)/$AAB_FILE"
    echo ""
    echo "文件信息:"
    ls -lh "$AAB_FILE"
    echo ""
    echo "🎉 构建成功！现在可以将此文件上传到 Google Play Console"
else
    echo "❌ 构建失败，未找到 App Bundle 文件"
    exit 1
fi

