#!/bin/bash

# 本地构建 Android App Bundle 脚本
# 使用方法: ./build-aab-local.sh

set -e

echo "🚀 开始本地构建 Android App Bundle..."

# 检查是否在正确的目录
if [ ! -f "app.json" ]; then
    echo "❌ 错误: 请在 ml-express-client 目录下运行此脚本"
    exit 1
fi

# 设置 Android SDK 路径
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# 检查 Android SDK
if [ ! -d "$ANDROID_HOME" ]; then
    echo "❌ 错误: Android SDK 未找到在 $ANDROID_HOME"
    echo "请安装 Android Studio 或设置 ANDROID_HOME 环境变量"
    exit 1
fi

# 检查 Java
if ! command -v java &> /dev/null; then
    echo "❌ 错误: Java 未安装"
    exit 1
fi

echo "✅ 环境检查通过"

# 生成原生项目（如果需要）
if [ ! -d "android" ]; then
    echo "📦 生成原生 Android 项目..."
    npx expo prebuild --platform android --clean
fi

# 检查签名配置（必须使用 Play 登记的 release.keystore）
if [ ! -f "android/app/release.keystore" ]; then
    echo "❌ 未找到 android/app/release.keystore"
    echo "   这是 Google Play 登记的上传密钥，不可替换。"
    echo "   详见 docs/ANDROID_SIGNING.md"
    exit 1
fi

# 构建 App Bundle
echo "🔨 开始构建 App Bundle..."
cd android

# 清理之前的构建
./gradlew clean

# 构建 Release Bundle
./gradlew bundleRelease

# 检查构建结果
AAB_FILE="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_FILE" ]; then
    echo ""
    echo "✅ 构建成功！"
    echo "📦 App Bundle 位置: $(pwd)/$AAB_FILE"
    echo ""
    echo "文件大小:"
    ls -lh "$AAB_FILE" | awk '{print $5}'
    echo ""
    echo "🎉 现在可以将此文件上传到 Google Play Console！"
else
    echo "❌ 构建失败，未找到 App Bundle 文件"
    exit 1
fi

