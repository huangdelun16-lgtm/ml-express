# 🚀 EAS Build - Android AAB 构建指南

## 📋 前置条件

- ✅ EAS CLI 已安装
- ✅ `eas.json` 已配置（`appVersionSource: "local"`）
- ✅ 版本号已同步（见“版本号来源与同步规则”）

---

## 🔧 构建步骤

### Step 1: 登录 EAS（如果未登录）

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
eas login
```

### Step 2: 检查环境变量

确保 Google Maps API Key 已配置在 EAS Secrets：

```bash
# 查看已配置的 secrets
eas secret:list --platform android

# 如果需要添加 Google Maps API Key
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value YOUR_API_KEY --platform android
```

### Step 3: 开始构建

```bash
# 构建 Android App Bundle (AAB)
eas build --platform android --profile production
```

### Step 4: 等待构建完成

- 构建通常在 15-30 分钟完成
- 可以在 Expo Dashboard 查看构建进度
- 构建完成后会收到通知

### Step 5: 下载 AAB 文件

构建完成后：

```bash
# 下载最新构建
eas build:download --platform android --profile production

# 或指定构建 ID
eas build:download --id BUILD_ID
```

---

## 📦 构建产物位置

下载后，AAB 文件通常位于：
```
./build-*.aab
```

---

## ⚙️ 构建配置

当前 `eas.json` 配置：
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"  // ✅ 构建 AAB 格式
      }
    }
  }
}
```

---

## 🧾 版本号来源与同步规则（重要）

EAS 读取本地版本号（`appVersionSource: "local"`），但 **Android 版本号会被 Gradle 覆盖**，必须保持一致：

### ✅ 需要同步的文件

**1）`ml-express-client/app.json`**
- `expo.version` → 显示版本（如 `2.2.0`）
- `ios.buildNumber` → iOS 构建号（如 `46`）
- `android.versionCode` → Android 版本码（如 `46`）

**2）`ml-express-client/android/app/build.gradle`**
- `defaultConfig.versionCode` → Android 版本码（如 `46`）
- `defaultConfig.versionName` → 显示版本（如 `2.2.0`）

> 说明：Expo 会优先使用 `build.gradle` 的 `versionCode/versionName`，  
> 如果它和 `app.json` 不一致，**最终显示会以 `build.gradle` 为准**。

### ✅ 推荐同步示例

```
expo.version = 2.2.0
ios.buildNumber = 46
android.versionCode = 46
android/build.gradle: versionCode = 46, versionName = 2.2.0
```

---

## 🔑 签名配置

EAS Build 会自动管理签名密钥：
- 首次构建会提示创建或上传 keystore
- 后续构建会自动使用相同的密钥
- 密钥安全存储在 Expo 服务器

---

## 📝 环境变量

确保以下环境变量已配置：

### 必需的环境变量：
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API Key

### 配置方法：
```bash
# 在 EAS Secrets 中配置
eas env:create --scope project \
  --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
  --value "[请从 Google Cloud Console 获取]" \
  --visibility sensitive \
  --environment production
```

---

## 🆘 常见问题

### 问题 1: 未登录
```bash
eas login
```

### 问题 2: 环境变量未配置
```bash
eas secret:list --platform android
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value YOUR_KEY --platform android
```

### 问题 3: 构建失败
- 查看构建日志：`eas build:view`
- 检查 app.json 配置
- 确认所有依赖已安装

---

## ✅ 验证构建

构建完成后：
1. 检查文件大小（通常 20-50MB）
2. 验证版本号（例如 `2.2.0 (46)`）
3. 上传到 Google Play Console 测试

---

## 📤 上传到 Google Play Console

构建完成后：
1. 下载 AAB 文件
2. 登录 Google Play Console
3. 进入应用 → Release → Production
4. 创建新版本
5. 上传 AAB 文件

---

**现在开始构建！**

