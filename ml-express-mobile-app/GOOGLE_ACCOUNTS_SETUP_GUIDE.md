# 🔐 Google Cloud Console 和 Google Play Console 账号配置指南

## ❓ 常见问题

**Q: Google Cloud Console 账号和 Google Play 开发者账号不一样可以吗？**

**A: ✅ 可以！但需要注意配置。**

---

## ✅ 可以使用不同账号

### 工作原理

- **Google Cloud Console（账号A）**: 管理 API Key、配额、计费
- **Google Play Console（账号B）**: 管理应用发布、更新、用户

**关键点**: API Key 本身不绑定账号，只要配置正确，任何应用都可以使用。

---

## 🔧 配置步骤（不同账号）

### 步骤 1：在 Google Cloud Console（账号A）中配置 API Key

1. **登录账号A的 Google Cloud Console**
   - 访问：https://console.cloud.google.com
   - 使用账号A登录

2. **创建或选择项目**
   - 创建新项目或选择现有项目

3. **创建 API Key**
   - 导航到：**"API 和服务"** → **"凭据"**
   - 点击 **"创建凭据"** → **"API 密钥"**
   - 复制生成的 API Key

4. **配置应用限制（重要！）**
   - 点击 API Key 进入编辑页面
   - 在 **"应用限制"** 部分，选择 **"Android 应用"**
   - 点击 **"添加项目"** 或 **"添加 Android 应用"**
   - 填写以下信息：
     ```
     包名称: com.mlexpress.courier
     SHA-1 证书指纹: [从 EAS Build 或 Google Play 获取]
     ```
   - 点击 **"保存"**

5. **配置 API 限制**
   - 在 **"API 限制"** 部分，选择 **"限制密钥"**
   - 选择以下 API：
     - ✅ Maps SDK for Android
     - ✅ Geocoding API
     - ✅ Directions API
     - ✅ Distance Matrix API
   - 点击 **"保存"**

### 步骤 2：获取 SHA-1 证书指纹

#### 方法 1：从 EAS Build 获取（推荐）

```bash
cd ml-express-mobile-app
eas credentials
```

选择：
- Platform: **Android**
- Project: **MarketLinkStaffApp**
- 查看证书信息，复制 SHA-1 指纹

#### 方法 2：从 Google Play Console 获取

1. 登录账号B的 Google Play Console
2. 进入应用 → **"发布"** → **"应用完整性"**
3. 查看 **"应用签名密钥证书"** 的 SHA-1 指纹
4. 复制这个 SHA-1 指纹

### 步骤 3：更新 Google Cloud Console（账号A）

1. 回到账号A的 Google Cloud Console
2. 在 API Key 的 Android 应用限制中
3. 添加包名：`com.mlexpress.courier`
4. 添加 SHA-1 指纹（从步骤2获取）
5. 保存更改

### 步骤 4：在 Google Play Console（账号B）中发布

1. **登录账号B的 Google Play Console**
   - 访问：https://play.google.com/console
   - 使用账号B登录

2. **创建应用**
   - 点击 **"创建应用"**
   - 填写应用信息
   - 包名使用：`com.mlexpress.courier`

3. **上传 App Bundle**
   - 进入 **"发布"** → **"内部测试"**
   - 上传构建好的 `.aab` 文件

---

## ⚠️ 重要注意事项

### 1. API Key 限制配置（必须正确）

**关键配置**:
- ✅ **应用限制**: Android 应用
- ✅ **包名**: `com.mlexpress.courier`
- ✅ **SHA-1 指纹**: 必须匹配应用的签名证书
- ✅ **API 限制**: 只允许必要的 Google Maps API

**为什么重要**:
- 如果限制配置错误，应用将无法使用 Google Maps
- 包名和 SHA-1 必须完全匹配

### 2. 配额和计费

- ⚠️ API 使用配额和计费由 **Google Cloud Console（账号A）** 管理
- ⚠️ 确保账号A有足够的配额和有效的付款方式
- ⚠️ 如果配额用完，应用将无法使用 Google Maps

### 3. SHA-1 指纹匹配

**重要**: SHA-1 指纹必须匹配应用的签名证书

**如果使用 Google Play App Signing**:
- Google Play 会使用自己的签名证书
- 需要使用 Google Play 的签名证书 SHA-1
- 在 Google Play Console → 应用完整性 → 应用签名密钥证书中查看

**如果使用 EAS Build**:
- EAS 会自动管理签名
- 从 `eas credentials` 获取 SHA-1

---

## 📋 配置检查清单

使用不同账号时，请确认：

- [ ] ✅ Google Cloud Console（账号A）中已创建 API Key
- [ ] ✅ API Key 已配置 Android 应用限制
- [ ] ✅ 包名已添加到限制：`com.mlexpress.courier`
- [ ] ✅ SHA-1 指纹已添加到限制（从 EAS Build 或 Google Play 获取）
- [ ] ✅ API 限制已配置（只允许必要的 Google Maps API）
- [ ] ✅ 账号A有足够的配额和有效的付款方式
- [ ] ✅ 应用代码中已配置 API Key
- [ ] ✅ 应用已重新构建（使用新包名）
- [ ] ✅ Google Play Console（账号B）中已创建应用
- [ ] ✅ 应用包名匹配：`com.mlexpress.courier`

---

## 🎯 最佳实践建议

### 推荐方案

1. **如果可能，使用同一个账号**
   - ✅ 管理最简单
   - ✅ 避免权限和配额问题
   - ✅ 账单统一

2. **如果必须使用不同账号**
   - ✅ 确保 API Key 限制配置正确
   - ✅ 确保两个账号都有相应权限
   - ✅ 定期检查配额使用情况

---

## 📞 常见问题

### Q1: API Key 可以跨账号使用吗？

**A**: ✅ 可以！只要 API Key 限制配置正确（包名 + SHA-1），任何应用都可以使用。

### Q2: 如果 Google Cloud 项目在账号A，应用在账号B发布，会有问题吗？

**A**: ✅ 不会有问题，只要：
- API Key 限制配置正确（包名 + SHA-1）
- 账号A的项目有足够的配额
- API Key 已启用必要的 API

### Q3: 如何查看 API Key 的使用情况？

**A**: 
1. 登录账号A的 Google Cloud Console
2. 导航到 **"API 和服务"** → **"仪表板"**
3. 查看各个 API 的使用情况

### Q4: 如果配额用完怎么办？

**A**: 
1. 登录账号A的 Google Cloud Console
2. 导航到 **"IAM 和管理"** → **"配额"**
3. 增加配额限制或升级付费计划

---

## ✅ 总结

**答案**: ✅ **可以使用不同的账号！**

**关键点**:
1. ✅ API Key 限制必须正确配置（包名 + SHA-1）
2. ✅ 确保 Google Cloud Console（账号A）有足够的配额
3. ✅ 确保两个账号都有相应权限
4. ✅ 定期检查 API 使用情况

**推荐**: 如果可能，使用同一个账号会更简单。但如果必须使用不同账号，只要配置正确，完全可以正常工作。

---

**文档创建时间**: 2025-01-16

