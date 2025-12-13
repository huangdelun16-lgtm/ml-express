#!/bin/bash

# 骑手App AAB文件构建脚本
# 使用方法：在切换网络（如手机热点）后运行此脚本

set -e

echo "🚀 开始构建骑手App AAB文件..."
echo ""

# 设置Expo Token
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"

# 进入项目目录
cd "$(dirname "$0")"

# 显示当前版本信息
echo "📋 当前版本信息："
echo "   - Version: 1.1.2"
echo "   - Version Code: 12"
echo ""

# 检查EAS CLI
if ! command -v eas &> /dev/null; then
    echo "❌ 错误：未找到 eas CLI，请先安装："
    echo "   npm install -g eas-cli"
    exit 1
fi

echo "✅ EAS CLI 已安装"
echo ""

# 开始构建
echo "🔨 开始构建..."
echo "   这可能需要 15-25 分钟，请耐心等待..."
echo ""

eas build --platform android --profile production --non-interactive

echo ""
echo "✅ 构建完成！"
echo ""
echo "📥 下载AAB文件："
echo "   1. 访问构建日志中的链接"
echo "   2. 或运行：eas build:list --platform android --limit 1"
echo "   3. 下载 Application Archive URL 中的 .aab 文件"
echo ""

