# 📱 构建 iOS 和 Android 应用指南

## 🎯 说明

- **iOS**: 使用 `.ipa` 格式，需要 Apple 开发者账号
- **Android**: 使用 `.apk` 格式，可直接安装

您的项目配置已完整，可以直接构建！

---

## 🚀 方案一：使用 EAS Build (推荐)

### 1. 安装 EAS CLI
```bash
npm install -g @expo/eas-cli
```

### 2. 登录 Expo 账号
```bash
eas login
```

### 3. 构建应用

#### iOS (需要 Apple 开发者账号)
```bash
cd ml-express-client
eas build --platform ios --profile production
```

#### Android
```bash
cd ml-express-client
eas build --platform android --profile production
```

---

## 🚀 方案二：本地构建

### iOS (需要 macOS + Xcode)
```bash
cd ml-express-client
npx expo run:ios
```

### Android
```bash
cd ml-express-client
npx expo run:android
```

---

## 🎁 免费方案 (无需 Apple 开发者账号)

### 使用 Internal Distribution (内部测试)
```bash
cd ml-express-client
eas build --platform ios --profile preview
```

构建完成后会获得：
- ✅ iOS 安装包 (可直接安装到手机)
- ✅ 无需 Apple 开发者账号
- ✅ 免费使用
- ⚠️ 只能通过链接安装

---

## 📋 详细步骤

### 步骤 1: 准备 EAS
```bash
# 安装
npm install -g @expo/eas-cli

# 登录
eas login

# 配置项目
cd ml-express-client
eas build:configure
```

### 步骤 2: 选择构建配置

#### iOS 选项：
- ✅ `preview` - 内部测试版本 (推荐，免费)
- ⚠️ `production` - 上架 App Store (需付费)

#### Android 选项：
- ✅ `preview` - APK 格式 (推荐)
- ✅ `production` - App Bundle 格式 (上架 Google Play)

### 步骤 3: 开始构建

#### 构建客户端 iOS
```bash
cd ml-express-client
eas build --platform ios --profile preview
```

#### 构建客户端 Android
```bash
cd ml-express-client
eas build --platform android --profile preview
```

### 步骤 4: 下载安装包

构建完成后：
1. 访问 https://expo.dev
2. 找到构建历史
3. 下载安装包
4. 直接安装到手机

---

## 📱 安装指南

### iOS 安装
1. 下载 `.ipa` 文件
2. 在 Mac 上打开 **Finder**
3. 连接 iPhone
4. 拖放 `.ipa` 文件到 iPhone
5. 在手机上信任开发者
6. 完成安装

### Android 安装
1. 下载 `.apk` 文件
2. 在手机上启用"未知来源"
3. 直接安装

---

## 🎯 快速开始

```bash
# 1. 安装 EAS CLI
npm install -g @expo/eas-cli

# 2. 登录
eas login

# 3. 构建 iOS (免费内部测试版)
cd ml-express-client
eas build --platform ios --profile preview

# 4. 等待构建完成 (5-20分钟)
# 5. 访问 https://expo.dev 下载安装包
# 6. 安装到手机
```

---

## ⚙️ 构建配置说明

### eas.json 已配置好的选项：

```json
{
  "preview": {          // 免费内部测试版
    "ios": {
      "resourceClass": "m-medium"
    },
    "android": {
      "buildType": "apk"  // APK 格式，可直接安装
    }
  },
  "production": {       // 上架版本 (需付费)
    "ios": {
      "resourceClass": "m-medium"
    },
    "android": {
      "buildType": "app-bundle"  // App Bundle 格式
    }
  }
}
```

---

## 💡 提示

### iOS
- **免费方案**: 使用 `preview` profile
- **缺点**: 只能通过安装包链接安装
- **优点**: 免费，无需 Apple 开发者账号

### Android  
- **完全免费**: 直接生成 APK
- **可以直接安装**: 不需要任何账号
- **推荐**: 使用 `preview` profile

---

## 🎉 开始构建！

选择您要构建的平台，然后运行：

```bash
# iOS
eas build --platform ios --profile preview

# Android
eas build --platform android --profile preview
```

构建完成后，您会收到下载链接，直接安装到手机即可使用！

