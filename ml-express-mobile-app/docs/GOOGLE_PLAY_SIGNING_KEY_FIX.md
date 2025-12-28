# 🔐 Google Play 应用签名密钥不匹配解决方案

## ❌ 错误信息

```
Your Android App Bundle is signed with the wrong key. 
Ensure that your App Bundle is signed with the correct signing key and try again.

Your App Bundle is expected to be signed with the certificate with fingerprint: 
SHA1: 8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8

but the certificate used to sign the App Bundle you uploaded has fingerprint: 
SHA1: 8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0
```

## 🔍 问题原因

这个错误通常发生在以下情况：

1. **之前已经上传过应用**：Google Play 已经为该应用分配了签名密钥
2. **使用了不同的签名密钥**：新构建的 App Bundle 使用了不同的签名密钥
3. **包名更改**：如果更改了包名，可能需要创建新应用或重置签名密钥

---

## ✅ 解决方案

### 方案 1：使用 Google Play App Signing（推荐）

Google Play App Signing 会自动管理签名密钥，这是最简单的方法。

#### 步骤 1：检查 Google Play Console 中的应用签名设置

1. **登录 Google Play Console**
   - 访问：https://play.google.com/console
   - 选择您的应用

2. **查看应用签名设置**
   - 进入 **"发布"** → **"应用完整性"**
   - 查看 **"应用签名"** 部分

3. **检查是否启用了 Google Play App Signing**
   - 如果已启用，Google Play 会使用自己的签名密钥
   - 您需要使用 Google Play 提供的上传密钥

#### 步骤 2：获取 Google Play 的上传密钥证书

1. **在 Google Play Console 中**
   - 进入 **"发布"** → **"应用完整性"**
   - 查看 **"应用签名密钥证书"** 的 SHA-1 指纹
   - 这就是 Google Play 期望的签名密钥：`8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`

#### 步骤 3：配置 EAS Build 使用正确的签名密钥

**选项 A：让 EAS 自动管理（推荐）**

EAS Build 会自动管理签名密钥，但需要确保使用正确的凭据：

```bash
cd ml-express-mobile-app

# 查看当前的凭据配置
eas credentials

# 如果签名密钥不匹配，重置凭据
eas credentials --platform android
```

选择：
- **"Set up a new Android Keystore"** 或
- **"Use existing Android Keystore"**（如果有）

**选项 B：手动配置签名密钥**

如果您有之前使用的签名密钥文件：

1. **导出 EAS 凭据**
   ```bash
   eas credentials --platform android
   ```
   选择导出凭据，保存 keystore 文件

2. **使用相同的签名密钥重新构建**
   ```bash
   eas build --platform android --profile production
   ```

---

### 方案 2：重置 Google Play 的上传密钥（如果方案1不行）

如果 Google Play App Signing 已启用，但签名密钥不匹配，可以重置上传密钥：

#### 步骤 1：联系 Google Play 支持重置上传密钥

1. **在 Google Play Console 中**
   - 进入 **"发布"** → **"应用完整性"**
   - 找到 **"上传密钥"** 部分
   - 点击 **"请求上传密钥重置"**

2. **按照提示操作**
   - Google Play 会要求您提供一些信息
   - 可能需要等待审核

#### 步骤 2：使用新的上传密钥重新构建

重置后，使用新的上传密钥重新构建应用。

---

### 方案 3：创建新应用（如果这是新包名）

如果您更改了包名（从 `com.marketlinkexpress.staff` 到 `com.mlexpress.courier`），这相当于一个新应用：

#### 步骤 1：确认是新应用

- ✅ 包名已更改：`com.mlexpress.courier`
- ✅ 这是第一次上传这个包名的应用

#### 步骤 2：创建新应用

1. **在 Google Play Console 中**
   - 点击 **"创建应用"**
   - 填写应用信息
   - 包名使用：`com.mlexpress.courier`

2. **上传 App Bundle**
   - 进入 **"发布"** → **"内部测试"**
   - 上传新构建的 `.aab` 文件

#### 步骤 3：启用 Google Play App Signing

首次上传时，Google Play 会询问是否启用 Google Play App Signing：
- ✅ **推荐选择 "是"**：让 Google Play 管理签名密钥
- 这样以后更新应用时不会遇到签名密钥问题

---

## 🔧 详细操作步骤（推荐流程）

### 步骤 1：检查当前 EAS 凭据

```bash
cd ml-express-mobile-app

# 查看当前的 Android 凭据
eas credentials --platform android
```

### 步骤 2：确认 Google Play 期望的签名密钥

1. 登录 Google Play Console
2. 进入应用 → **"发布"** → **"应用完整性"**
3. 查看 **"应用签名密钥证书"** 的 SHA-1 指纹
4. 记录这个 SHA-1：`8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`

### 步骤 3：检查 EAS 使用的签名密钥

```bash
# 查看 EAS 凭据中的 SHA-1
eas credentials --platform android
```

查看输出的 SHA-1 指纹，应该与 Google Play 期望的匹配。

### 步骤 4：如果不匹配，重置 EAS 凭据

```bash
# 重置 Android 凭据
eas credentials --platform android

# 选择：
# - "Set up a new Android Keystore"（如果这是新应用）
# - 或 "Use existing Android Keystore"（如果有之前的 keystore）
```

### 步骤 5：重新构建应用

```bash
# 使用正确的签名密钥重新构建
eas build --platform android --profile production
```

### 步骤 6：上传新的 App Bundle

1. 等待构建完成
2. 下载新的 `.aab` 文件
3. 在 Google Play Console 中上传

---

## ⚠️ 重要注意事项

### 1. 签名密钥是永久的

- ⚠️ **一旦应用在 Google Play 发布，签名密钥无法更改**
- ✅ 如果使用 Google Play App Signing，Google Play 会自动管理
- ✅ 您只需要确保上传密钥正确

### 2. Google Play App Signing

**推荐启用 Google Play App Signing**：
- ✅ Google Play 自动管理签名密钥
- ✅ 即使丢失上传密钥，也可以重置
- ✅ 更安全，更可靠

### 3. 包名更改

如果更改了包名（`com.marketlinkexpress.staff` → `com.mlexpress.courier`）：
- ✅ 这是新应用，可以使用新的签名密钥
- ✅ 不需要匹配旧应用的签名密钥

---

## 📋 检查清单

解决签名密钥问题前，请确认：

- [ ] ✅ 确认这是新应用还是已有应用
- [ ] ✅ 如果已有应用，查看 Google Play Console 中的应用签名设置
- [ ] ✅ 获取 Google Play 期望的签名密钥 SHA-1
- [ ] ✅ 检查 EAS 使用的签名密钥 SHA-1
- [ ] ✅ 如果 SHA-1 不匹配，重置 EAS 凭据或使用正确的签名密钥
- [ ] ✅ 重新构建应用
- [ ] ✅ 上传新的 App Bundle

---

## 🚀 快速解决方案

### 如果是新应用（新包名）

1. **确认是新应用**
   - 包名：`com.mlexpress.courier`
   - 第一次上传

2. **创建新应用**
   - 在 Google Play Console 中创建新应用
   - 包名使用：`com.mlexpress.courier`

3. **上传 App Bundle**
   - 使用 EAS Build 构建的 `.aab` 文件
   - 首次上传时启用 Google Play App Signing

### 如果是已有应用

1. **检查签名密钥**
   - 查看 Google Play Console 中的应用签名设置
   - 获取期望的 SHA-1 指纹

2. **配置 EAS 使用正确的签名密钥**
   ```bash
   eas credentials --platform android
   ```

3. **重新构建并上传**

---

## 📞 需要帮助？

如果仍然遇到问题：

1. **检查 EAS Build 日志**
   - 查看构建日志中的签名信息
   - 确认使用的签名密钥

2. **联系 Google Play 支持**
   - 如果无法重置上传密钥
   - 访问：https://support.google.com/googleplay/android-developer

3. **查看 EAS 文档**
   - https://docs.expo.dev/build/signing/

---

**修复时间**: 2025-01-16  
**状态**: ⚠️ 需要根据实际情况选择解决方案

