# 🔐 首次上传应用签名密钥问题解决方案

## 📋 当前情况

- ✅ **App signing**: "Signing by Google Play"（已启用）
- ❌ **没有看到"上传密钥"部分**
- ❌ **上传 App Bundle 时显示签名密钥不匹配**

## 🔍 问题分析

### 为什么没有"上传密钥"部分？

当应用**首次上传**时，Google Play Console 可能不会立即显示"上传密钥"部分，因为：

1. **首次上传时**：Google Play 会接受任何签名密钥作为上传密钥
2. **后续上传时**：Google Play 会要求使用相同的上传密钥

### 当前情况

- Google Play 期望的 SHA1: `8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`
- EAS Build 使用的 SHA1: `8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0`

这说明**之前已经上传过应用**，Google Play 已经记录了上传密钥。

---

## ✅ 解决方案

### 方案 1：查找上传密钥信息（推荐）

#### 步骤 1：检查应用签名密钥证书

1. **在 Google Play Console 中**
   - 进入 **"发布"** → **"应用完整性"**
   - 查看 **"应用签名密钥证书"** 部分
   - 记录 SHA-1 指纹：`8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`

#### 步骤 2：检查上传历史

1. **查看之前的构建**
   - 进入 **"发布"** → **"内部测试"** 或 **"生产"**
   - 查看之前上传的版本
   - 如果有之前的版本，说明已经设置过上传密钥

#### 步骤 3：查看应用签名详细信息

1. **在"应用完整性"页面**
   - 点击 **"App signing"** 或 **"应用签名"** 卡片
   - 查看详细信息
   - 可能会显示上传密钥的信息

---

### 方案 2：重置上传密钥（如果找不到）

如果无法找到上传密钥信息，可以重置：

#### 步骤 1：请求上传密钥重置

1. **在 Google Play Console 中**
   - 进入 **"发布"** → **"应用完整性"**
   - 点击 **"App signing"** 卡片
   - 查找 **"上传密钥"** 或 **"Upload key"** 相关选项
   - 点击 **"请求上传密钥重置"** 或 **"Request upload key reset"**

2. **如果没有看到重置选项**
   - 可能需要联系 Google Play 支持
   - 访问：https://support.google.com/googleplay/android-developer

#### 步骤 2：等待 Google Play 审核

- 通常需要几个工作日
- Google Play 会通过邮件通知您

#### 步骤 3：获取新的上传密钥证书

- Google Play 会提供新的上传密钥证书
- 下载并保存证书文件

#### 步骤 4：配置 EAS 使用新证书

```bash
cd ml-express-mobile-app

# 配置 Android 凭据
eas credentials --platform android

# 选择 "Use existing Android Keystore"
# 上传 Google Play 提供的证书文件
```

---

### 方案 3：使用 EAS 当前密钥，更新 Google Play（如果这是新应用）

如果这是**新应用**（包名：`com.mlexpress.courier`），可以：

#### 步骤 1：让 EAS 生成新的上传密钥

```bash
cd ml-express-mobile-app

# 配置 Android 凭据
eas credentials --platform android

# 选择 "Set up a new Android Keystore"
# EAS 会生成新的密钥
```

#### 步骤 2：获取 EAS 生成的 SHA-1

```bash
# 查看 EAS 凭据
eas credentials --platform android
```

查看输出的 SHA-1 指纹。

#### 步骤 3：在 Google Play Console 中更新上传密钥

1. **进入应用签名设置**
   - 进入 **"发布"** → **"应用完整性"**
   - 点击 **"App signing"** 卡片

2. **上传 EAS 生成的证书**
   - 查找 **"上传密钥"** 或 **"Upload key"** 选项
   - 上传 EAS 生成的证书文件

---

### 方案 4：检查是否在"应用签名"详情页面

上传密钥信息可能在"应用签名"的详情页面中：

#### 步骤 1：进入应用签名详情

1. **在"应用完整性"页面**
   - 点击 **"App signing"** 卡片（显示 "Signing by Google Play"）
   - 进入详情页面

#### 步骤 2：查看上传密钥信息

在详情页面中，您可能会看到：
- **应用签名密钥证书**（App signing key certificate）
- **上传密钥证书**（Upload key certificate）- 这就是您需要的

#### 步骤 3：下载上传密钥证书

- 如果看到上传密钥证书，点击 **"下载"** 或 **"导出"**
- 保存证书文件（`.pem` 或 `.der` 格式）

---

## 🔧 详细操作步骤（推荐流程）

### 步骤 1：深入查看应用签名设置

1. **登录 Google Play Console**
   - 访问：https://play.google.com/console
   - 选择您的应用

2. **进入应用完整性页面**
   - 进入 **"发布"** → **"应用完整性"**

3. **点击"App signing"卡片**
   - 点击显示 "Signing by Google Play" 的卡片
   - 进入详情页面

4. **查找上传密钥信息**
   - 在详情页面中查找：
     - "Upload key certificate"（上传密钥证书）
     - "Upload key SHA-1"（上传密钥 SHA-1）
     - 或类似的选项

### 步骤 2：如果找到了上传密钥证书

1. **下载证书文件**
   - 点击下载或导出
   - 保存为 `.pem` 或 `.der` 文件

2. **配置 EAS 使用这个证书**
   ```bash
   cd ml-express-mobile-app
   eas credentials --platform android
   ```
   - 选择 **"Use existing Android Keystore"**
   - 上传下载的证书文件

3. **重新构建应用**
   ```bash
   eas build --platform android --profile production
   ```

### 步骤 3：如果找不到上传密钥证书

1. **检查是否有之前的构建**
   - 进入 **"发布"** → **"内部测试"** 或 **"生产"**
   - 查看是否有之前上传的版本

2. **如果有之前的版本**
   - 说明已经设置过上传密钥
   - 需要找到之前使用的密钥或重置

3. **如果没有之前的版本**
   - 这可能是首次上传
   - 可以尝试让 EAS 生成新密钥，然后更新 Google Play

---

## 🚀 快速解决方案

### 如果这是首次上传（推荐）

1. **让 EAS 生成新的上传密钥**
   ```bash
   cd ml-express-mobile-app
   eas credentials --platform android
   # 选择 "Set up a new Android Keystore"
   ```

2. **重新构建应用**
   ```bash
   eas build --platform android --profile production
   ```

3. **上传新的 App Bundle**
   - 在 Google Play Console 中上传
   - 首次上传时，Google Play 会接受任何签名密钥

4. **后续上传时**
   - Google Play 会要求使用相同的签名密钥
   - 确保后续构建使用相同的密钥

### 如果之前已经上传过

1. **查找之前的构建信息**
   - 查看之前的版本历史
   - 找到之前使用的签名密钥

2. **配置 EAS 使用相同的密钥**
   ```bash
   eas credentials --platform android
   # 选择 "Use existing Android Keystore"
   # 上传之前的证书文件
   ```

3. **重新构建并上传**

---

## 📋 检查清单

解决签名密钥问题前，请确认：

- [ ] ✅ 已登录 Google Play Console
- [ ] ✅ 已进入"应用完整性"页面
- [ ] ✅ 已点击"App signing"卡片查看详情
- [ ] ✅ 已查找上传密钥证书信息
- [ ] ✅ 已检查是否有之前的构建版本
- [ ] ✅ 已确认这是首次上传还是后续上传
- [ ] ✅ 已选择对应的解决方案
- [ ] ✅ 已配置 EAS 使用正确的签名密钥
- [ ] ✅ 已重新构建应用
- [ ] ✅ 已上传新的 App Bundle

---

## ⚠️ 重要提示

### 1. 首次上传 vs 后续上传

- **首次上传**：Google Play 会接受任何签名密钥
- **后续上传**：必须使用相同的签名密钥

### 2. Google Play App Signing

- ✅ 已启用 "Signing by Google Play"
- ✅ Google Play 会自动管理应用签名密钥
- ✅ 您只需要确保上传密钥正确

### 3. 找不到上传密钥时

- 检查"App signing"详情页面
- 查看之前的构建历史
- 如果仍然找不到，联系 Google Play 支持

---

## 📞 需要帮助？

如果仍然找不到上传密钥信息：

1. **联系 Google Play 支持**
   - 访问：https://support.google.com/googleplay/android-developer
   - 说明情况：无法找到上传密钥证书

2. **查看 EAS 文档**
   - https://docs.expo.dev/build/signing/
   - 了解如何配置签名密钥

3. **检查应用签名详情**
   - 在 Google Play Console 中深入查看"App signing"详情
   - 可能上传密钥信息在更深层的页面中

---

**文档创建时间**: 2025-01-16  
**状态**: ⚠️ 需要深入查看 Google Play Console 的应用签名详情页面

