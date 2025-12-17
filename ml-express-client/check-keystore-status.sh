#!/bin/bash

# 检查 EAS Keystore 状态的脚本

set -e

echo "🔍 检查 EAS Keystore 状态"
echo ""

# 检查是否在正确的目录
if [ ! -f "app.json" ]; then
    echo "❌ 错误: 请在 ml-express-client 目录下运行此脚本"
    exit 1
fi

# 检查 EAS CLI
if ! command -v eas &> /dev/null; then
    echo "❌ 错误：未找到 eas CLI"
    exit 1
fi

echo "📋 步骤 1: 检查最新的构建"
echo ""

# 检查最新的构建
LATEST_BUILD=$(eas build:list --platform android --limit 1 --json 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$LATEST_BUILD" ]; then
    echo "⚠️  无法获取构建信息（可能需要登录）"
    echo ""
    echo "请运行："
    echo "  eas login"
    echo "  eas build:list --platform android --limit 1"
else
    echo "✅ 最新构建 ID: $LATEST_BUILD"
fi

echo ""
echo "📋 步骤 2: 检查本地 AAB 文件的证书指纹"
echo ""

if [ -f "latest-build.aab" ]; then
    echo "✅ 找到 AAB 文件: latest-build.aab"
    echo ""
    echo "证书信息："
    keytool -printcert -jarfile latest-build.aab 2>&1 | grep -A 2 "SHA1:" || echo "无法读取证书"
    echo ""
    
    CURRENT_SHA1=$(keytool -printcert -jarfile latest-build.aab 2>&1 | grep "SHA1:" | awk '{print $2}')
    OLD_SHA1="EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A"
    
    if [ "$CURRENT_SHA1" = "$OLD_SHA1" ]; then
        echo "⚠️  警告：证书指纹与旧的相同！"
        echo "   当前 SHA1: $CURRENT_SHA1"
        echo "   旧的 SHA1:  $OLD_SHA1"
        echo ""
        echo "   这说明构建时仍在使用旧的 Keystore。"
        echo "   需要删除旧的 Keystore 并重新构建。"
    else
        echo "✅ 证书指纹已更新！"
        echo "   当前 SHA1: $CURRENT_SHA1"
        echo "   旧的 SHA1:  $OLD_SHA1"
        echo ""
        echo "   可以继续提取 PEM 证书。"
    fi
else
    echo "⚠️  未找到 latest-build.aab 文件"
    echo "   请先下载构建："
    echo "   eas build:download --platform android --limit 1"
fi

echo ""
echo "📋 步骤 3: 检查 EAS Keystore 状态"
echo ""
echo "⚠️  重要提示："
echo "   运行以下命令检查 Keystore 状态："
echo ""
echo "   eas credentials --platform android"
echo ""
echo "   操作步骤："
echo "   1. 选择 'production'"
echo "   2. 选择 'Keystore: ...'"
echo "   3. 查看 Keystore 信息"
echo ""
echo "   如果显示 'Keystore not found' 或提示创建新的，说明旧的已删除。"
echo "   如果显示 Keystore 信息，说明仍在使用旧的 Keystore。"
echo ""


