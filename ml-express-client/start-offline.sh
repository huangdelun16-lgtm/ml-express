#!/bin/bash

# 清理端口和进程
echo "清理端口和进程..."
lsof -ti:8081,8082 | xargs kill -9 2>/dev/null
pkill -f "expo" 2>/dev/null
pkill -f "metro" 2>/dev/null
sleep 2

# 设置环境变量
export EXPO_OFFLINE=1
export EXPO_NO_DOTENV=1
export EXPO_SKIP_DEPENDENCY_VALIDATION=1

# 启动Expo（离线模式，跳过依赖验证）
echo "启动Expo开发服务器（离线模式）..."
export EXPO_SKIP_DEPENDENCY_VALIDATION=1
npx expo start --offline --port 8081 --no-dev

