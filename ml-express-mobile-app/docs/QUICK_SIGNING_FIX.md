# 🚀 快速解决签名密钥问题

## 📋 问题

Google Play 期望的 SHA1: `8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`  
EAS 当前使用的 SHA1: `8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0`

**不匹配！** 需要修复。

---

## ✅ 最简单解决方案

### 方案 1：重置 Google Play 的上传密钥（推荐）

#### 步骤 1：在 Google Play Console 中重置

1. **登录 Google Play Console**
   - https://play.google.com/console
   - 选择您的应用

2. **进入应用完整性**
   - "发布" → "应用完整性"
   - 点击 **"App signing"** 卡片

3. **重置上传密钥**
   - 在详情页面查找 **"上传密钥"** 或 **"Upload key"**
   - 点击 **"请求上传密钥重置"** 或 **"Request upload key reset"**
   - 如果没有看到，可能需要联系 Google Play 支持

4. **等待 Google Play 审核**
   - 通常需要几个工作日
   - Google Play 会通过邮件通知

5. **获取新的上传密钥证书**
   - Google Play 会提供新的证书文件
   - 下载并保存

#### 步骤 2：配置 EAS 使用新证书

在终端中运行：

```bash
cd ml-express-mobile-app
eas credentials --platform android
```

然后：
1. 选择 **`production`**
2. 选择 **`Use existing Android Keystore`**
3. 上传 Google Play 提供的证书文件
4. 提供密码信息

#### 步骤 3：重新构建

```bash
eas build --platform android --profile production
```

---

### 方案 2：让 EAS 生成新密钥（如果这是首次上传）

如果这是**首次上传**这个包名的应用：

#### 步骤 1：配置 EAS 生成新密钥

在终端中运行：

```bash
cd ml-express-mobile-app
eas credentials --platform android
```

然后：
1. 选择 **`production`**
2. 选择 **`Set up a new Android Keystore`**
3. EAS 会自动生成新密钥
4. **记录生成的 SHA-1**（很重要！）

#### 步骤 2：重新构建

```bash
eas build --platform android --profile production
```

#### 步骤 3：上传到 Google Play

- 首次上传时，Google Play 会接受任何签名密钥
- 后续上传需要使用相同的密钥

---

## 🎯 推荐操作（根据您的情况）

### 如果之前已经上传过应用

**推荐：重置 Google Play 的上传密钥**

1. 在 Google Play Console 中重置上传密钥
2. 等待 Google Play 提供新证书
3. 配置 EAS 使用新证书
4. 重新构建并上传

### 如果是首次上传

**推荐：让 EAS 生成新密钥**

1. 配置 EAS 生成新密钥
2. 重新构建应用
3. 上传到 Google Play（首次上传会接受任何密钥）

---

## 📝 详细操作步骤

### 操作 1：配置 EAS 凭据

在终端中运行：

```bash
cd ml-express-mobile-app
eas credentials --platform android
```

**交互式操作**：

1. **选择构建配置文件**
   ```
   ? Which build profile do you want to configure? › production
   ```
   - 使用方向键选择 `production`
   - 按 Enter

2. **选择操作**
   ```
   ? What do you want to do? › Set up a new Android Keystore
   ```
   - 如果是首次上传，选择 `Set up a new Android Keystore`
   - 如果有 Google Play 提供的证书，选择 `Use existing Android Keystore`
   - 使用方向键选择，按 Enter

3. **如果选择 "Set up a new Android Keystore"**
   - EAS 会自动生成新密钥
   - 记录显示的 SHA-1 和 SHA-256

4. **如果选择 "Use existing Android Keystore"**
   - 提供证书文件路径
   - 提供密码信息

### 操作 2：重新构建应用

```bash
eas build --platform android --profile production
```

等待构建完成（通常 10-20 分钟）。

### 操作 3：上传到 Google Play

1. 下载构建完成的 `.aab` 文件
2. 在 Google Play Console 中上传
3. 验证签名密钥是否匹配

---

## ⚠️ 重要提示

1. **首次上传 vs 后续上传**
   - 首次上传：Google Play 会接受任何签名密钥
   - 后续上传：必须使用相同的签名密钥

2. **Google Play App Signing**
   - 已启用 "Signing by Google Play"
   - Google Play 会自动管理应用签名密钥
   - 您只需要确保上传密钥正确

3. **保存凭据信息**
   - 记录 SHA-1 和 SHA-256 指纹
   - EAS 会自动保存凭据，但建议备份

---

## 🆘 如果仍然遇到问题

### 联系 Google Play 支持

如果无法在 Google Play Console 中找到上传密钥重置选项：

1. **访问 Google Play 支持**
   - https://support.google.com/googleplay/android-developer
   - 说明情况：签名密钥不匹配，需要重置上传密钥

2. **提供信息**
   - 应用包名：`com.mlexpress.courier`
   - 当前 EAS 使用的 SHA-1：`8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0`
   - Google Play 期望的 SHA-1：`8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`

---

**文档创建时间**: 2025-01-16  
**状态**: ✅ 操作指南已准备

