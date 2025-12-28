# 📱 Android 模拟器使用指南

## ✅ 问题已解决

已配置好 Android SDK 环境变量和启动脚本。

## 🚀 快速启动

### 方法 1：使用自动启动脚本（推荐）

```bash
cd ml-express-mobile-app
npm run android:setup
```

这个脚本会：
1. 自动检测并启动 Android 模拟器
2. 等待模拟器完全启动
3. 自动运行 `expo run:android`

### 方法 2：手动启动

1. **启动模拟器**（如果还没启动）：
   ```bash
   # 方式 A：通过 Android Studio
   # 打开 Android Studio → Tools → Device Manager → 点击播放按钮
   
   # 方式 B：通过命令行
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   $ANDROID_HOME/emulator/emulator -avd Medium_Phone_API_33 &
   ```

2. **等待模拟器启动**（约 30-60 秒）

3. **运行应用**：
   ```bash
   cd ml-express-mobile-app
   npm run android
   ```

## 🔧 环境变量配置

Android SDK 环境变量已自动添加到 `~/.zshrc`：

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin
```

**注意**：如果当前终端窗口是在配置之前打开的，需要：
```bash
source ~/.zshrc
```
或者重新打开终端窗口。

## 📋 检查模拟器状态

```bash
# 检查连接的设备
adb devices

# 列出所有可用的模拟器
$ANDROID_HOME/emulator/emulator -list-avds
```

## 🐛 常见问题

### 1. "No Android connected device found"

**解决方案**：
- 确保模拟器已启动（在 Android Studio 的 Device Manager 中查看）
- 运行 `adb devices` 确认设备已连接
- 如果模拟器未启动，运行 `npm run android:setup`

### 2. "ANDROID_HOME not set"

**解决方案**：
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
source ~/.zshrc  # 或重新打开终端
```

### 3. 模拟器启动很慢

**解决方案**：
- 第一次启动需要较长时间（1-2 分钟）
- 后续启动会快很多
- 可以保持模拟器运行，不需要每次都关闭

### 4. 没有可用的模拟器

**解决方案**：
1. 打开 Android Studio
2. Tools → Device Manager
3. Create Device → 选择设备（推荐 Pixel 5）
4. 下载系统镜像（推荐 API 33）
5. Finish

## 📝 当前配置

- **Android SDK 路径**：`~/Library/Android/sdk`
- **可用模拟器**：`Medium_Phone_API_33`
- **项目路径**：`ml-express-mobile-app`

## 🎯 下一步

现在可以正常使用 Android 模拟器了！运行：

```bash
cd ml-express-mobile-app
npm run android:setup
```

