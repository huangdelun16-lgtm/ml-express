#!/bin/bash

# 客户端App AAB文件构建脚本
# 使用方法：
#   1. 设置环境变量: export EXPO_TOKEN="your-token-here"
#   2. 或在项目根目录创建 .env 文件: EXPO_TOKEN=your-token-here
#   3. 运行: ./build-aab.sh

set -e

echo "🚀 开始构建客户端App AAB文件..."
echo ""

# 检查并设置Expo Token
if [ -f .env ]; then
    # 从 .env 文件加载环境变量
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$EXPO_TOKEN" ]; then
    echo "❌ 错误: EXPO_TOKEN 环境变量未设置"
    echo ""
    echo "请使用以下方式之一设置:"
    echo "  1. 环境变量: export EXPO_TOKEN=\"your-token-here\""
    echo "  2. .env 文件: 在项目根目录创建 .env 文件，添加: EXPO_TOKEN=your-token-here"
    echo ""
    echo "获取 Token: https://expo.dev/accounts/[your-account]/settings/access-tokens"
    exit 1
fi

export EXPO_TOKEN

# 进入项目目录
cd "$(dirname "$0")"

# 显示当前版本信息
echo "📋 当前版本信息："
echo "   - Version: 1.1.0"
echo "   - Version Code: 自动递增"
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
echo "⚠️  重要提示："
echo "   如果 Google Play Console 仍然显示签名密钥错误，"
echo "   请在 Google Play Console 中注册新的上传密钥："
echo "   SHA1: EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A"
echo ""

