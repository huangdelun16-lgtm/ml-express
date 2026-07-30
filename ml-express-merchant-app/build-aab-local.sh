#!/bin/bash

# 本地构建 Android App Bundle 脚本
# 使用方法: ./build-aab-local.sh

set -e

echo "🚀 开始本地构建 Android App Bundle..."

# 检查是否在正确的目录
if [ ! -f "app.json" ]; then
    echo "❌ 错误: 请在 ml-express-merchant-app 目录下运行此脚本"
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

# 检查签名配置
if [ ! -f "android/app/upload-release.keystore" ]; then
    echo "⚠️  警告: 未找到 upload-release.keystore"
    echo "请先配置签名密钥："
    echo "1. 从 EAS 下载: eas credentials --platform android --profile production"
    echo "2. 或创建新的: keytool -genkeypair -v -storetype PKCS12 -keystore android/app/upload-release.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000"
    echo ""
    read -p "是否使用 debug keystore 继续构建？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
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

