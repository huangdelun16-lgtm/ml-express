#!/bin/bash

# 修复骑手端 iOS 模拟器 Expo Go 安装问题
# 路径: ml-express-mobile-app/fix-ios-simulator.sh

echo "🛠️ 正在修复骑手端 iOS 模拟器..."

# 1. 进入项目目录
cd "$(dirname "$0")"

# 2. 清理可能的缓存
echo "🧹 清理缓存..."
rm -rf .expo

# 3. 确保网络连接并强制安装 Expo Go
echo "🌐 正在尝试连接网络并安装 Expo Go 到模拟器..."
echo "💡 如果弹出权限请求，请点击允许。"

# 使用强制安装命令
# 我们需要确保 EXPO_OFFLINE 没被设置
export EXPO_OFFLINE=0

# 启动并尝试直接打开 iOS 模拟器
# --localhost 确保即使在某些受限网络下也能绑定本地
npx expo start --ios --localhost --no-dev

echo ""
echo "✅ 修复指令已发出。"
echo "📱 请查看您的 iOS 模拟器："
echo "1. 如果看到 'Installing Expo Go'，请等待完成。"
echo "2. 如果提示 'Expo Go is already installed'，则说明环境已就绪。"
echo "3. 如果依然报错，请确保您的 Mac 已经连接到互联网（建议开启 VPN）。"
