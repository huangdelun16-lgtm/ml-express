#!/bin/bash

# 开发构建重试脚本
# 解决网络连接问题

echo "🔧 准备构建开发版本..."

# 1. 清除代理设置（如果存在）
unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy

# 2. 检查网络连接
echo "📡 检查网络连接..."
if curl -I --connect-timeout 5 https://api.expo.dev > /dev/null 2>&1; then
    echo "✅ 网络连接正常"
else
    echo "⚠️  网络连接可能有问题，但继续尝试构建..."
fi

# 3. 确保 expo-dev-client 已安装
if ! npm list expo-dev-client > /dev/null 2>&1; then
    echo "📦 安装 expo-dev-client..."
    npm install expo-dev-client@~4.0.0 --save --legacy-peer-deps
fi

# 4. 构建开发版本
echo "🚀 开始构建 Android 开发版本..."
echo "   这可能需要 10-15 分钟，请耐心等待..."
echo ""

# 使用非交互模式，避免提示
eas build --profile development --platform android --non-interactive

# 如果失败，提供建议
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 构建失败"
    echo ""
    echo "💡 建议："
    echo "1. 检查网络连接是否稳定"
    echo "2. 尝试使用 VPN（如果网络受限）"
    echo "3. 等待几分钟后重试"
    echo "4. 查看详细错误信息：eas build --profile development --platform android"
    exit 1
else
    echo ""
    echo "✅ 构建成功！"
    echo "📱 请下载并安装 APK 到您的设备"
fi

