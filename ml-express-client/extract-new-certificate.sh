#!/bin/bash

# 从新的 EAS Keystore 提取 PEM 证书的脚本
# 用于 Google Play Console 上传密钥重置

set -e

echo "🔑 从新的 EAS Keystore 提取 PEM 证书"
echo ""

# 检查是否在正确的目录
if [ ! -f "app.json" ]; then
    echo "❌ 错误: 请在 ml-express-client 目录下运行此脚本"
    exit 1
fi

# 检查 EAS CLI
if ! command -v eas &> /dev/null; then
    echo "❌ 错误：未找到 eas CLI，请先安装："
    echo "   npm install -g eas-cli"
    exit 1
fi

echo "📋 步骤 1: 从 EAS 下载新的 Keystore"
echo ""
echo "⚠️  重要提示："
echo "   1. 运行此脚本后，会启动交互式菜单"
echo "   2. 请选择："
echo "      - Platform: Android"
echo "      - Build profile: production"
echo "      - Action: Download credentials"
echo "   3. 下载的 Keystore 文件会保存到当前目录"
echo ""
read -p "按 Enter 继续..."

# 启动 EAS credentials 下载
echo ""
echo "🚀 启动 EAS credentials 下载..."
eas credentials --platform android

echo ""
echo "📋 步骤 2: 提取 PEM 证书"
echo ""

# 查找下载的 keystore 文件
KEYSTORE_FILE=$(find . -name "*.jks" -o -name "*.keystore" | head -1)

if [ -z "$KEYSTORE_FILE" ]; then
    echo "❌ 错误: 未找到 Keystore 文件"
    echo "   请确保已从 EAS 下载 Keystore 文件"
    exit 1
fi

echo "✅ 找到 Keystore 文件: $KEYSTORE_FILE"
echo ""

# 检查 keytool
if ! command -v keytool &> /dev/null; then
    echo "❌ 错误: 未找到 keytool"
    echo "   请安装 Java JDK"
    exit 1
fi

# 提示用户输入密码
echo "请输入 Keystore 密码（如果 EAS 生成的，通常为空或 'android'）:"
read -s KEYSTORE_PASSWORD
echo ""

echo "请输入 Key alias（通常是 'upload' 或 'release'）:"
read KEY_ALIAS

if [ -z "$KEY_ALIAS" ]; then
    KEY_ALIAS="upload"
fi

# 导出 PEM 证书
OUTPUT_FILE="upload_certificate_new.pem"
echo ""
echo "🔨 正在提取 PEM 证书..."

if [ -z "$KEYSTORE_PASSWORD" ]; then
    keytool -export -rfc -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -file "$OUTPUT_FILE" -storepass "" 2>&1 || \
    keytool -export -rfc -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -file "$OUTPUT_FILE" -storepass "android" 2>&1 || \
    keytool -export -rfc -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -file "$OUTPUT_FILE" 2>&1
else
    keytool -export -rfc -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -file "$OUTPUT_FILE" -storepass "$KEYSTORE_PASSWORD" 2>&1
fi

if [ -f "$OUTPUT_FILE" ]; then
    echo ""
    echo "✅ 成功！PEM 证书已保存到: $OUTPUT_FILE"
    echo ""
    echo "📋 证书内容预览："
    echo "---"
    head -5 "$OUTPUT_FILE"
    echo "..."
    tail -5 "$OUTPUT_FILE"
    echo "---"
    echo ""
    echo "📤 下一步："
    echo "   1. 在 Google Play Console 的 'Request upload key reset' 页面"
    echo "   2. 上传文件: $OUTPUT_FILE"
    echo "   3. 点击 'Request' 按钮"
else
    echo ""
    echo "❌ 错误: 提取证书失败"
    echo "   请检查："
    echo "   - Keystore 文件路径是否正确"
    echo "   - Keystore 密码是否正确"
    echo "   - Key alias 是否正确"
    exit 1
fi


