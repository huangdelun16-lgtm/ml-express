# 🔑 创建新的 Google Maps API Key 指南

## 📋 步骤 1：在 Google Cloud Console 创建 API Key

### 1.1 登录 Google Cloud Console

1. 访问：https://console.cloud.google.com
2. 选择您的项目（或创建新项目）

### 1.2 启用必要的 API

确保以下 API 已启用：
- ✅ **Maps JavaScript API**
- ✅ **Places API**
- ✅ **Geocoding API**
- ✅ **Directions API**

**启用方法**：
1. 进入 **APIs & Services** → **Library**
2. 搜索并启用上述 API

### 1.3 创建新的 API Key

1. 进入 **APIs & Services** → **Credentials**
2. 点击 **"Create Credentials"** → **"API Key"**
3. 复制生成的 API Key（格式：`AIzaSy...`）

### 1.4 配置 API Key 限制（重要！）

点击刚创建的 API Key 进行编辑：

#### Application restrictions（应用限制）

**客户端 Web API Key**：
- 选择：**HTTP referrers (web sites)**
- 添加以下域名：
  ```
  https://market-link-express.com/*
  https://www.market-link-express.com/*
  https://*.netlify.app/*
  http://localhost:*
  http://localhost:3000/*
  ```

**后台管理 Web API Key**：
- 选择：**HTTP referrers (web sites)**
- 添加以下域名：
  ```
  https://admin-market-link-express.com/*
  https://*.netlify.app/*
  http://localhost:*
  http://localhost:3000/*
  ```

**客户端 App API Key**：
- 选择：**Android apps**
- 添加 Android 应用：
  - Package name: `com.mlexpress.client`（或您的实际包名）
  - SHA-1 certificate fingerprint: （从 Google Play Console 获取）

#### API restrictions（API 限制）

选择：**Restrict key**
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API
- ✅ Directions API

---

## 📋 步骤 2：准备 API Key 信息

创建完成后，请提供以下信息：

1. **客户端 Web API Key**：`AIzaSy...`（用于 market-link-express.com）
2. **后台管理 Web API Key**：`AIzaSy...`（用于 admin-market-link-express.com）
3. **客户端 App API Key**：`AIzaSy...`（用于 Android App）

**或者**：如果只创建一个通用 API Key，也可以使用同一个 Key。

---

## 📋 步骤 3：我会帮您配置到以下位置

✅ **Netlify 环境变量**（客户端 Web）
- `REACT_APP_GOOGLE_MAPS_API_KEY`

✅ **Netlify 环境变量**（后台管理 Web）
- `REACT_APP_GOOGLE_MAPS_API_KEY`

✅ **EAS Secrets**（客户端 App）
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

✅ **本地 .env 文件**
- `REACT_APP_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## ⚠️ 重要提醒

1. **不要**在代码中硬编码 API Key
2. **必须**配置 API Key 限制（HTTP referrers 或 Android apps）
3. **必须**配置 API 限制（仅允许必要的 API）
4. **不要**将 `.env` 文件提交到 Git

---

创建完成后，请将新的 API Key 发给我，我会立即帮您配置！

