# 📱 本地构建 Android App Bundle 完整指南

## 🎯 问题说明

如果遇到 EAS Build 403 错误，可以使用本地构建方案。

---

## ✅ 方案一：使用 EAS Build（推荐，但需要解决权限问题）

### 解决 403 错误的方法：

1. **检查 EAS 账户状态**
   - 访问 https://expo.dev/accounts/amt349/settings/billing
   - 确认账户是否有构建配额
   - 免费账户每月有构建次数限制

2. **检查项目权限**
   ```bash
   eas project:info
   ```
   确认项目所有者是 `amt349`

3. **尝试重新登录**
   ```bash
   eas logout
   eas login
   ```

---

## 🔧 方案二：本地构建（无需 EAS）

### 前置要求：
- ✅ Java JDK（已安装）
- ✅ Android SDK（已安装）
- ✅ 签名密钥（从 EAS 下载或使用新的）

### 步骤 1：生成原生 Android 项目

```bash
cd ml-express-client
npx expo prebuild --platform android --clean
```

### 步骤 2：配置签名密钥

#### 选项 A：从 EAS 下载现有密钥

```bash
# 下载 Keystore
eas credentials

# 选择：
# - Platform: Android
# - Build profile: production
# - Action: Download credentials
```

#### 选项 B：创建新的签名密钥

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
```

### 步骤 3：配置签名信息

编辑 `android/app/build.gradle`：

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

创建 `android/gradle.properties`（如果不存在）：

```properties
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=release
MYAPP_RELEASE_STORE_PASSWORD=your_store_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

### 步骤 4：构建 App Bundle

```bash
cd android
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# 构建 App Bundle
./gradlew bundleRelease
```

### 步骤 5：找到构建文件

构建完成后，App Bundle 文件位于：
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🚀 方案三：使用 Expo 的替代构建服务

如果 EAS Build 不可用，可以考虑：

1. **GitHub Actions** - 免费 CI/CD
2. **本地构建** - 完全控制
3. **其他云构建服务** - Codemagic, Bitrise 等

---

## 📝 快速命令总结

### 本地构建（完整流程）

```bash
# 1. 生成原生项目
cd ml-express-client
npx expo prebuild --platform android --clean

# 2. 配置签名（需要先设置密钥）
# 编辑 android/app/build.gradle 和 android/gradle.properties

# 3. 构建
cd android
export ANDROID_HOME=~/Library/Android/sdk
./gradlew bundleRelease

# 4. 找到文件
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## ⚠️ 注意事项

1. **签名密钥安全**：妥善保管签名密钥，丢失后无法更新应用
2. **版本号**：每次构建前更新 `app.json` 中的 `version` 和 `versionCode`
3. **环境变量**：确保 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` 等环境变量已配置
4. **构建时间**：本地构建可能需要 10-30 分钟

---

## 🆘 遇到问题？

1. **Gradle 错误**：检查 Java 版本（推荐 JDK 17）
2. **签名错误**：确认密钥路径和密码正确
3. **依赖问题**：运行 `npm install` 和 `cd android && ./gradlew clean`

