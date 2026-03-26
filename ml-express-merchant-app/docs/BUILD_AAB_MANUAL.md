# 📱 手动构建 Android App Bundle 指南

## ✅ 配置已完成

以下配置已经完成：
- ✅ Keystore 已生成：`android/app/release.keystore`
- ✅ 签名配置已设置：`android/gradle.properties`
- ✅ Build.gradle 已更新：使用 release 签名
- ✅ Hermes 配置已修复

---

## 🚀 手动构建步骤

### 方法一：使用构建脚本（推荐）

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
./build-aab-local.sh
```

### 方法二：直接使用 Gradle

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client/android

# 设置 Android SDK 路径
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# 清理之前的构建
./gradlew clean

# 构建 App Bundle
./gradlew bundleRelease
```

---

## 📦 构建完成后

构建成功后，App Bundle 文件位于：
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔑 签名信息

**Keystore 文件**: `android/app/release.keystore`
**Key Alias**: `release`
**Store Password**: `mlexpress123`
**Key Password**: `mlexpress123`

⚠️ **重要**: 请妥善保管这些信息，丢失后无法更新应用！

---

## 🆘 如果遇到问题

### 问题 1: Gradle 守护进程锁定
```bash
# 停止所有 Gradle 进程
pkill -f gradle

# 或者使用 --no-daemon 标志
./gradlew bundleRelease --no-daemon
```

### 问题 2: 权限错误
确保您有权限访问：
- Android SDK 目录
- Gradle 缓存目录 (`~/.gradle`)

### 问题 3: 构建时间过长
首次构建可能需要 10-30 分钟，这是正常的。后续构建会更快。

---

## 📤 上传到 Google Play Console

构建完成后：
1. 登录 Google Play Console
2. 进入您的应用
3. 转到 "发布" → "生产环境"
4. 创建新版本
5. 上传 `app-release.aab` 文件

---

## ✅ 验证构建

构建完成后，可以验证文件：
```bash
# 检查文件大小
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# 应该看到类似这样的输出：
# -rw-r--r--  1 user  staff  25M  ...  app-release.aab
```

