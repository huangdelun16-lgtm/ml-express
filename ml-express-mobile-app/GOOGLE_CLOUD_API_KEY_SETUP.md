# 🔐 Google Cloud Console API 密钥安全配置指南

## 📋 概述

本指南将帮助您在 Google Cloud Console 中配置 API 密钥限制，确保 API 密钥安全。

---

## 🎯 目标

- 限制 API 密钥只能用于 Android 应用
- 限制只能从特定包名调用
- 设置 API 限制（仅允许必要的 Google Maps API）
- 设置使用配额限制

---

## 📝 步骤 1：访问 Google Cloud Console

1. 打开浏览器，访问：https://console.cloud.google.com
2. 登录您的 Google 账号
3. 选择或创建项目（如果还没有项目）

---

## 📝 步骤 2：导航到 API 密钥管理

1. 在左侧菜单中，点击 **"API 和服务"** → **"凭据"**
2. 找到您的 Google Maps API 密钥：`AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE`
3. 点击密钥名称进入编辑页面

---

## 📝 步骤 3：配置应用限制（Android 应用）

### 3.1 设置应用限制

1. 在 **"应用限制"** 部分，选择 **"Android 应用"**
2. 点击 **"添加项目"** 或 **"添加 Android 应用"**

### 3.2 添加 Android 应用信息

需要填写以下信息：

**包名称**:
```
com.marketlinkexpress.staff
```

**SHA-1 证书指纹**:
获取 SHA-1 指纹的方法：

#### 方法 1：使用 EAS Build（推荐）

```bash
# 在项目根目录运行
cd ml-express-mobile-app
eas credentials
```

选择 Android → 选择项目 → 查看证书信息

#### 方法 2：使用本地 keystore

如果您有本地 keystore 文件：

```bash
keytool -list -v -keystore your-keystore.jks -alias your-key-alias
```

#### 方法 3：使用 Google Play Console

1. 登录 Google Play Console
2. 进入应用 → 发布 → 应用完整性
3. 查看 **"应用签名密钥证书"** 的 SHA-1 指纹

### 3.3 保存应用限制

1. 输入包名和 SHA-1 指纹
2. 点击 **"保存"**

---

## 📝 步骤 4：配置 API 限制

### 4.1 设置 API 限制

1. 在 **"API 限制"** 部分，选择 **"限制密钥"**
2. 点击 **"选择 API"**

### 4.2 选择允许的 API

只选择应用实际使用的 Google Maps API：

✅ **必须启用的 API**:
- **Maps SDK for Android** - 用于显示地图
- **Maps JavaScript API** - 如果 Web 端也使用（可选）
- **Geocoding API** - 用于地址解析（如果使用）
- **Directions API** - 用于路线规划（如果使用）
- **Places API** - 如果使用地点搜索（可选）

❌ **不要启用**:
- 不需要的 API（如 Street View API、Maps Embed API 等）

### 4.3 保存 API 限制

1. 选择完 API 后，点击 **"保存"**

---

## 📝 步骤 5：配置使用配额限制（可选但推荐）

### 5.1 设置配额限制

1. 在 API 密钥编辑页面，找到 **"配额"** 或 **"使用限制"** 部分
2. 点击 **"设置配额"**

### 5.2 配置每日配额

建议设置：
- **每日请求数限制**: 根据预期使用量设置（例如：10,000 次/天）
- **每分钟请求数限制**: 防止突发流量（例如：100 次/分钟）

### 5.3 设置预算警报

1. 在 Google Cloud Console 中，进入 **"结算"** → **"预算和警报"**
2. 创建预算警报，当费用超过设定值时发送通知

---

## 📝 步骤 6：验证配置

### 6.1 测试 API 密钥

配置完成后，测试 API 密钥是否正常工作：

```bash
# 在移动应用中测试
cd ml-express-mobile-app
npm start
```

### 6.2 检查限制是否生效

1. 尝试从不被允许的应用使用 API 密钥（应该失败）
2. 尝试调用未启用的 API（应该失败）
3. 从正确的 Android 应用调用应该成功

---

## 🔒 安全最佳实践

### ✅ 已完成的配置

- ✅ API 密钥存储在环境变量中（`.env` 文件）
- ✅ `.env` 文件已添加到 `.gitignore`
- ✅ 创建了 `.env.example` 作为模板
- ✅ 使用 `app.config.js` 读取环境变量

### ⚠️ 额外建议

1. **定期轮换 API 密钥**:
   - 每 6-12 个月更换一次 API 密钥
   - 更换时，先在 Google Cloud Console 创建新密钥
   - 更新应用配置后，再删除旧密钥

2. **监控 API 使用情况**:
   - 定期检查 Google Cloud Console 中的 API 使用报告
   - 设置异常使用警报

3. **限制 IP 地址**（如果适用）:
   - 如果 API 密钥也用于服务器端，可以添加 IP 地址限制

4. **使用服务账号**（服务器端）:
   - 对于服务器端调用，使用服务账号而不是 API 密钥

---

## 📚 相关资源

- [Google Maps Platform 安全最佳实践](https://developers.google.com/maps/api-security-best-practices)
- [API 密钥限制文档](https://cloud.google.com/docs/authentication/api-keys#restricting_api_keys)
- [Expo 环境变量文档](https://docs.expo.dev/guides/environment-variables/)

---

## ✅ 配置检查清单

- [ ] 已设置 Android 应用限制（包名 + SHA-1）
- [ ] 已设置 API 限制（仅启用必要的 API）
- [ ] 已设置使用配额限制
- [ ] 已创建预算警报
- [ ] 已测试 API 密钥正常工作
- [ ] 已确认 `.env` 文件不被提交到 Git
- [ ] 已在 EAS Build 中配置环境变量（生产环境）

---

## 🚨 重要提醒

1. **不要将 API 密钥提交到 Git**
   - `.env` 文件已在 `.gitignore` 中
   - 使用 `.env.example` 作为模板

2. **EAS Build 环境变量配置**
   - 在生产环境构建时，需要在 EAS Secrets 中配置环境变量
   - 运行：`eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value your_api_key`

3. **API 密钥泄露处理**
   - 如果发现 API 密钥泄露，立即在 Google Cloud Console 中删除或限制该密钥
   - 创建新密钥并更新应用配置

---

**配置完成后，您的 API 密钥将受到严格保护，大大降低被滥用的风险！** 🔐

