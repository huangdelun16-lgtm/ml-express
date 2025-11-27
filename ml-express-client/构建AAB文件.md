# 📱 构建客户端 App 的 AAB 文件

## ✅ 所有配置已完成

- ✅ Keystore 已生成：`android/app/release.keystore`
- ✅ 签名配置已设置
- ✅ Build.gradle 已配置

---

## 🚀 执行构建（请在终端运行）

### 方法一：使用构建脚本（推荐）

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
./build-aab-now.sh
```

### 方法二：直接使用 Gradle

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client/android

# 设置 Android SDK 路径
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# 构建 App Bundle
./gradlew bundleRelease --no-daemon
```

---

## ⏱️ 构建时间

- **首次构建**：约 15-30 分钟（需要下载依赖和编译）
- **后续构建**：约 5-10 分钟

构建过程中会显示进度信息，请耐心等待。

---

## 📦 构建完成后

构建成功后，AAB 文件位于：
```
android/app/build/outputs/bundle/release/app-release.aab
```

您可以运行以下命令检查文件：
```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔑 签名信息（已配置）

- **Keystore**: `android/app/release.keystore`
- **Key Alias**: `release`
- **密码**: `mlexpress123`

---

## 🆘 如果遇到问题

### 问题 1: Gradle 守护进程锁定
```bash
pkill -f gradle
./gradlew bundleRelease --no-daemon
```

### 问题 2: 权限错误
确保您有权限访问 Android SDK 和 Gradle 目录。

### 问题 3: 构建失败
查看错误信息，通常是因为：
- 缺少依赖
- 配置错误
- 内存不足

---

## 📤 上传到 Google Play Console

构建完成后：
1. 登录 [Google Play Console](https://play.google.com/console)
2. 选择您的应用
3. 进入 "发布" → "生产环境"
4. 创建新版本
5. 上传 `app-release.aab` 文件

---

## ✅ 验证构建

构建完成后验证文件：
```bash
# 检查文件大小（通常应该在 20-50MB 左右）
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# 检查文件类型
file android/app/build/outputs/bundle/release/app-release.aab
```

