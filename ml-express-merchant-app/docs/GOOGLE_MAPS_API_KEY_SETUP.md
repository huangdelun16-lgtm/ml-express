# 🔑 Google Maps API Key 配置指南

## ⚠️ 问题说明

如果看到错误信息："Google Maps API Key 未配置，自动完成功能不可用"，说明需要配置 Google Maps API Key。

---

## 📋 配置步骤

### 步骤 1：在 Google Cloud Console 中启用 API

1. **访问 Google Cloud Console**
   - 打开：https://console.cloud.google.com
   - 选择你的项目（或创建新项目）

2. **启用必要的 API**
   
   需要启用以下 API：
   - ✅ **Places API**（地点搜索和自动完成）
   - ✅ **Maps SDK for Android**（Android 地图显示）
   - ✅ **Maps SDK for iOS**（iOS 地图显示）
   - ✅ **Geocoding API**（地址解析）
   - ✅ **Maps JavaScript API**（Web 地图，如果需要）

   **启用方法**：
   - 进入：**API 和服务** → **库**
   - 搜索上述 API 名称
   - 点击每个 API，然后点击 **"启用"**

### 步骤 2：创建 API Key

1. **创建凭据**
   - 进入：**API 和服务** → **凭据**
   - 点击 **"+ 创建凭据"** → **"API 密钥"**

2. **限制 API Key（重要！）**
   
   点击刚创建的 API Key，进行限制：
   
   **应用程序限制**：
   - ✅ **Android 应用**：
     - 包名：`com.mlexpress.client`
     - SHA-1 证书指纹：（需要获取，见下方）
   
   - ✅ **iOS 应用**：
     - Bundle ID：`com.mlexpress.client`
   
   - ✅ **HTTP 引荐来源网址**（用于开发服务器）：
     - `localhost:8081`
     - `localhost:8082`
     - `192.168.*.*:8081`
     - `192.168.*.*:8082`
     - `exp://*`
     - `exp://192.168.*.*:8081`

   **API 限制**：
   - ✅ 限制为以下 API：
     - Places API
     - Maps SDK for Android
     - Maps SDK for iOS
     - Geocoding API
     - Maps JavaScript API（如果需要）

### 步骤 3：获取 Android SHA-1 证书指纹

**开发环境（Debug）**：
```bash
# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**生产环境（Release）**：
```bash
# 使用你的发布密钥库
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

### 步骤 4：配置 API Key 到项目

#### 方法 1：使用环境变量（推荐）

1. **创建 `.env` 文件**（在 `ml-express-client` 目录下）：
   ```bash
   cd ml-express-client
   touch .env
   ```

2. **在 `.env` 文件中添加**：
   ```
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=你的API密钥
   ```

3. **添加到 `.gitignore`**（如果还没有）：
   ```
   .env
   ```

#### 方法 2：直接在 app.config.js 中配置（不推荐，仅用于测试）

修改 `app.config.js`：
```javascript
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '你的API密钥';
```

#### 方法 3：使用 EAS Secrets（生产环境推荐）

```bash
# 安装 EAS CLI（如果还没有）
npm install -g eas-cli

# 登录
eas login

# 设置密钥
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value 你的API密钥
```

---

## 🔍 验证配置

### 检查 API Key 是否配置成功

1. **重启 Expo 开发服务器**：
   ```bash
   cd ml-express-client
   npx expo start --clear
   ```

2. **在应用中测试**：
   - 打开地图选择页面
   - 在地址输入框中输入文字
   - 应该能看到自动完成建议

3. **检查控制台**：
   - 如果没有错误信息，说明配置成功
   - 如果仍有错误，检查 API Key 是否正确配置

---

## 🛡️ 安全注意事项

### ⚠️ 重要安全提示

1. **不要将 API Key 提交到 Git**
   - 确保 `.env` 文件在 `.gitignore` 中
   - 不要在代码中硬编码 API Key

2. **限制 API Key 使用范围**
   - 在 Google Cloud Console 中设置应用程序限制
   - 限制 API 使用范围（只启用需要的 API）

3. **监控 API 使用**
   - 在 Google Cloud Console 中设置使用配额
   - 设置预算警报

4. **定期轮换 API Key**
   - 定期更换 API Key 以提高安全性

---

## 🆘 常见问题

### Q1: API Key 配置后仍然无效？

**A:** 检查以下几点：
1. 环境变量名称是否正确：`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
2. 是否重启了 Expo 开发服务器
3. API Key 是否在 Google Cloud Console 中正确限制
4. 是否启用了必要的 API（Places API 等）

### Q2: 如何检查 API Key 是否有效？

**A:** 可以在浏览器中测试：
```
https://maps.googleapis.com/maps/api/place/autocomplete/json?input=test&key=你的API密钥
```

如果返回 JSON 数据，说明 API Key 有效。

### Q3: 开发环境和生产环境使用不同的 API Key？

**A:** 是的，建议：
- **开发环境**：使用限制较少的 API Key（允许 localhost 等）
- **生产环境**：使用严格限制的 API Key（只允许特定包名和 Bundle ID）

### Q4: 如何获取 Android SHA-1 指纹？

**A:** 使用 keytool 命令（见步骤 3）

---

## 📝 快速配置清单

- [ ] 在 Google Cloud Console 中启用 Places API
- [ ] 在 Google Cloud Console 中启用 Maps SDK for Android
- [ ] 在 Google Cloud Console 中启用 Maps SDK for iOS
- [ ] 创建 API Key
- [ ] 限制 API Key（应用程序限制 + API 限制）
- [ ] 获取 Android SHA-1 证书指纹
- [ ] 在 Google Cloud Console 中添加 Android 应用限制
- [ ] 在 Google Cloud Console 中添加 iOS 应用限制
- [ ] 在项目中配置环境变量 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] 重启 Expo 开发服务器
- [ ] 测试自动完成功能

---

## 🔗 相关链接

- [Google Cloud Console](https://console.cloud.google.com)
- [Places API 文档](https://developers.google.com/maps/documentation/places/web-service)
- [Maps SDK for Android](https://developers.google.com/maps/documentation/android-sdk)
- [Maps SDK for iOS](https://developers.google.com/maps/documentation/ios-sdk)
- [API Key 最佳实践](https://developers.google.com/maps/api-security-best-practices)

---

**最后更新**: 2025-01-XX

