#!/bin/bash

# 设置 Android SDK 环境变量
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin

# 检查模拟器是否运行
echo "检查 Android 模拟器状态..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
    echo "没有检测到运行的模拟器，正在启动..."
    
    # 列出可用的模拟器
    AVD_LIST=$($ANDROID_HOME/emulator/emulator -list-avds)
    if [ -z "$AVD_LIST" ]; then
        echo "❌ 错误：没有找到可用的 Android 模拟器"
        echo "请先通过 Android Studio 创建一个模拟器："
        echo "1. 打开 Android Studio"
        echo "2. Tools → Device Manager"
        echo "3. Create Device → 选择设备 → 下载系统镜像 → Finish"
        exit 1
    fi
    
    # 使用第一个可用的模拟器
    FIRST_AVD=$(echo "$AVD_LIST" | head -n 1)
    echo "启动模拟器: $FIRST_AVD"
    
    # 后台启动模拟器
    $ANDROID_HOME/emulator/emulator -avd "$FIRST_AVD" > /dev/null 2>&1 &
    EMULATOR_PID=$!
    
    # 等待模拟器启动（最多等待 60 秒）
    echo "等待模拟器启动..."
    for i in {1..60}; do
        sleep 2
        DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
        if [ "$DEVICES" -gt 0 ]; then
            echo "✅ 模拟器已启动！"
            break
        fi
        if [ $i -eq 60 ]; then
            echo "❌ 超时：模拟器启动失败"
            kill $EMULATOR_PID 2>/dev/null
            exit 1
        fi
        echo -n "."
    done
    echo ""
else
    echo "✅ 检测到运行的模拟器"
fi

# 显示连接的设备
echo "连接的设备："
adb devices

# 切换到项目目录
cd "$(dirname "$0")"

# 运行 Expo Android 构建
echo ""
echo "开始构建并运行 Android 应用..."
npm run android

