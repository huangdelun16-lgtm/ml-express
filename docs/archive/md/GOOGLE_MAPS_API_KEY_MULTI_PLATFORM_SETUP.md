# 🔐 Google Maps API Key 多平台配置指南

## ❌ 问题

**问题**: 将 API Key 的 Application restrictions 设置为 "Android apps" 后，客户端 Web 和 Admin Web 上的 Google Maps 都无法使用。

**原因**: Android apps 限制只允许 Android 应用使用该 API Key，Web 应用无法使用。

---

## ✅ 解决方案：创建多个 API Key

### 方案 1：创建多个 API Key（推荐）

为不同平台创建不同的 API Key，分别配置不同的限制。

#### API Key 1：Android 应用专用

**用途**: 骑手 App（Android）

**配置**:
- **Application restrictions**: Android apps
- **包名**: `com.mlexpress.courier`
- **SHA-1 指纹**: 
  - `8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`（应用签名密钥）
  - `8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0`（上传密钥）

**API 限制**:
- ✅ Maps SDK for Android
- ✅ Geocoding API
- ✅ Directions API
- ✅ Distance Matrix API

#### API Key 2：Web 应用专用

**用途**: 客户端 Web 和 Admin Web

**配置**:
- **Application restrictions**: HTTP referrers (web sites)
- **允许的网站**:
  - `https://market-link-express.com/*`
  - `https://*.market-link-express.com/*`
  - `https://admin-market-link-express.com/*`
  - `https://*.admin-market-link-express.com/*`
  - `http://localhost:*`（开发环境）
  - `http://127.0.0.1:*`（开发环境）

**API 限制**:
- ✅ Maps JavaScript API
- ✅ Geocoding API
- ✅ Directions API
- ✅ Distance Matrix API

---

## 📝 详细配置步骤

### 步骤 1：创建 Android 应用专用 API Key

1. **登录 Google Cloud Console**
   - 访问：https://console.cloud.google.com
   - 选择您的项目

2. **创建新的 API Key**
   - 导航到：**"API 和服务"** → **"凭据"**
   - 点击 **"创建凭据"** → **"API 密钥"**
   - 复制生成的 API Key（例如：`AIzaSy...Android`）

3. **配置应用限制**
   - 点击 API Key 进入编辑页面
   - **应用限制**: 选择 **"Android 应用"**
   - 点击 **"添加项目"**
   - 填写：
     ```
     包名称: com.mlexpress.courier
     SHA-1 证书指纹: 8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8
     ```
   - 再添加一个 SHA-1：
     ```
     SHA-1 证书指纹: 8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0
     ```

4. **配置 API 限制**
   - **API 限制**: 选择 **"限制密钥"**
   - 选择以下 API：
     - ✅ Maps SDK for Android
     - ✅ Geocoding API
     - ✅ Directions API
     - ✅ Distance Matrix API

5. **保存更改**

### 步骤 2：创建 Web 应用专用 API Key

1. **创建新的 API Key**
   - 在同一个项目中，点击 **"创建凭据"** → **"API 密钥"**
   - 复制生成的 API Key（例如：`AIzaSy...Web`）

2. **配置应用限制**
   - 点击 API Key 进入编辑页面
   - **应用限制**: 选择 **"HTTP referrers (web sites)"**
   - 点击 **"添加项目"**
   - 添加以下网站：
     ```
     https://market-link-express.com/*
     https://*.market-link-express.com/*
     https://admin-market-link-express.com/*
     https://*.admin-market-link-express.com/*
     http://localhost:*
     http://127.0.0.1:*
     ```

3. **配置 API 限制**
   - **API 限制**: 选择 **"限制密钥"**
   - 选择以下 API：
     - ✅ Maps JavaScript API
     - ✅ Geocoding API
     - ✅ Directions API
     - ✅ Distance Matrix API

4. **保存更改**

### 步骤 3：更新应用配置

#### 3.1 更新 Android 应用配置

**文件**: `ml-express-mobile-app/app.config.js`

```javascript
android: {
  config: {
    googleMaps: {
      apiKey: "AIzaSy...Android" // 使用 Android 专用 API Key
    }
  }
}
```

#### 3.2 更新客户端 Web 配置

**文件**: `ml-express-client-web/.env` 或 Netlify 环境变量

```
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSy...Web
```

**Netlify 环境变量配置**:
1. 登录 Netlify Dashboard
2. 选择项目：`client-ml-express`
3. 进入 **Site settings** → **Environment variables**
4. 更新 `REACT_APP_GOOGLE_MAPS_API_KEY` 为 Web 专用 API Key

#### 3.3 更新 Admin Web 配置

**文件**: `vercel.json` 或 Vercel 环境变量

```json
{
  "env": {
    "REACT_APP_GOOGLE_MAPS_API_KEY": "AIzaSy...Web"
  }
}
```

**Vercel 环境变量配置**:
1. 登录 Vercel Dashboard
2. 选择项目
3. 进入 **Settings** → **Environment Variables**
4. 更新 `REACT_APP_GOOGLE_MAPS_API_KEY` 为 Web 专用 API Key

---

## 🔄 方案 2：使用同一个 API Key（如果支持）

**注意**: Google Cloud Console 的 API Key 限制通常只能选择一种类型（Android apps、iOS apps、HTTP referrers 等）。

**如果您的 Google Cloud Console 支持同时添加多种限制**（某些情况下可能支持）：

1. **保持 Application restrictions 为 "None"**（不推荐，安全性较低）
2. **只使用 API 限制**来限制可以使用的 API
3. **在代码中验证来源**（不推荐，安全性较低）

**推荐**: 使用方案 1（创建多个 API Key），更安全、更清晰。

---

## 📋 配置检查清单

完成配置后，请确认：

### Android 应用 API Key
- [ ] ✅ 已创建 Android 专用 API Key
- [ ] ✅ Application restrictions 设置为 "Android apps"
- [ ] ✅ 已添加包名：`com.mlexpress.courier`
- [ ] ✅ 已添加两个 SHA-1 指纹
- [ ] ✅ API 限制已配置（Maps SDK for Android 等）
- [ ] ✅ Android 应用配置已更新

### Web 应用 API Key
- [ ] ✅ 已创建 Web 专用 API Key
- [ ] ✅ Application restrictions 设置为 "HTTP referrers (web sites)"
- [ ] ✅ 已添加所有 Web 域名
- [ ] ✅ 已添加本地开发环境（localhost）
- [ ] ✅ API 限制已配置（Maps JavaScript API 等）
- [ ] ✅ 客户端 Web 配置已更新（Netlify）
- [ ] ✅ Admin Web 配置已更新（Vercel）

---

## 🚀 快速操作步骤

### 1. 创建两个 API Key

```bash
# 在 Google Cloud Console 中操作
# 1. 创建 Android 专用 API Key
# 2. 创建 Web 专用 API Key
```

### 2. 更新应用配置

#### Android 应用
```bash
cd ml-express-mobile-app
# 编辑 app.config.js，更新 Android API Key
```

#### 客户端 Web（Netlify）
1. 登录 Netlify Dashboard
2. 更新环境变量：`REACT_APP_GOOGLE_MAPS_API_KEY`

#### Admin Web（Vercel）
1. 登录 Vercel Dashboard
2. 更新环境变量：`REACT_APP_GOOGLE_MAPS_API_KEY`

### 3. 重新部署

#### 客户端 Web
```bash
# Netlify 会自动检测并重新部署
# 或手动触发部署
```

#### Admin Web
```bash
# Vercel 会自动检测并重新部署
# 或手动触发部署
```

---

## ⚠️ 重要提示

### 1. 安全性

- ✅ **使用多个 API Key 更安全**：每个平台使用独立的 API Key
- ✅ **限制更精确**：可以为每个平台设置不同的限制
- ✅ **便于管理**：如果某个 API Key 泄露，只需要更换该平台的 API Key

### 2. 配额管理

- ⚠️ 每个 API Key 都有独立的配额限制
- ✅ 可以为不同平台设置不同的配额限制
- ✅ 便于监控各平台的使用情况

### 3. 成本管理

- ⚠️ 使用多个 API Key 不会增加成本
- ✅ 所有 API Key 都使用同一个 Google Cloud 项目的配额
- ✅ 便于分别监控各平台的使用情况

---

## 📞 常见问题

### Q1: 可以使用同一个 API Key 吗？

**A**: 不推荐。Google Cloud Console 的 API Key 限制通常只能选择一种类型（Android apps、HTTP referrers 等）。如果设置为 Android apps，Web 应用将无法使用。

### Q2: 创建多个 API Key 会增加成本吗？

**A**: 不会。所有 API Key 都使用同一个 Google Cloud 项目的配额和计费。

### Q3: 如何查看各平台的使用情况？

**A**: 
1. 登录 Google Cloud Console
2. 导航到 **"API 和服务"** → **"仪表板"**
3. 查看各个 API 的使用情况
4. 可以为每个 API Key 设置不同的配额限制

---

## ✅ 总结

**解决方案**: ✅ **创建多个 API Key，分别用于不同平台**

**配置**:
1. ✅ Android 应用专用 API Key（Android apps 限制）
2. ✅ Web 应用专用 API Key（HTTP referrers 限制）

**优点**:
- ✅ 更安全
- ✅ 更灵活
- ✅ 便于管理
- ✅ 不会增加成本

---

**文档创建时间**: 2025-01-16

