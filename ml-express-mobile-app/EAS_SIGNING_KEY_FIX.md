# 🔐 EAS Build 签名密钥修复指南

## ❌ 当前问题

Google Play Console 显示签名密钥不匹配：

```
期望的 SHA1: 8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8
实际上传的 SHA1: 8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0
```

## 🔍 问题分析

### Google Play App Signing 机制

当启用 **Google Play App Signing** 时，有两个签名密钥：

1. **应用签名密钥（App Signing Key）**: `8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`
   - Google Play 使用这个密钥重新签名应用
   - 这是最终用户设备上安装的应用使用的签名

2. **上传密钥（Upload Key）**: `8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0`
   - EAS Build 当前使用的密钥
   - 用于签名上传到 Google Play 的 App Bundle

### 问题原因

Google Play 期望的上传密钥与 EAS Build 当前使用的密钥不匹配。

---

## ✅ 解决方案

### 方案 1：配置 EAS 使用 Google Play 期望的上传密钥（推荐）

#### 步骤 1：获取 Google Play 的上传密钥证书

1. **登录 Google Play Console**
   - 访问：https://play.google.com/console
   - 选择您的应用

2. **查看上传密钥证书**
   - 进入 **"发布"** → **"应用完整性"**
   - 查看 **"上传密钥证书"** 部分
   - 下载或查看上传密钥证书的 SHA-1 指纹

3. **确认期望的上传密钥 SHA-1**
   - 应该是：`8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`
   - 但实际上，Google Play 可能期望的是另一个上传密钥

#### 步骤 2：重置 EAS 凭据以匹配 Google Play 的上传密钥

**选项 A：如果 Google Play 提供了上传密钥证书文件**

1. **下载上传密钥证书**
   - 从 Google Play Console 下载 `.pem` 或 `.der` 证书文件

2. **配置 EAS 使用这个证书**
   ```bash
   cd ml-express-mobile-app
   eas credentials --platform android
   ```
   - 选择 **"Use existing Android Keystore"**
   - 上传 Google Play 提供的证书文件

**选项 B：重置 Google Play 的上传密钥（如果无法获取证书）**

1. **在 Google Play Console 中重置上传密钥**
   - 进入 **"发布"** → **"应用完整性"**
   - 找到 **"上传密钥"** 部分
   - 点击 **"请求上传密钥重置"**
   - 按照提示操作（可能需要联系 Google Play 支持）

2. **等待 Google Play 审核**
   - 通常需要几个工作日
   - Google Play 会提供新的上传密钥证书

3. **使用新的上传密钥配置 EAS**
   ```bash
   cd ml-express-mobile-app
   eas credentials --platform android
   ```

---

### 方案 2：让 EAS 生成新密钥，然后更新 Google Play（如果这是新应用）

如果这是新应用（包名：`com.mlexpress.courier`），可以：

1. **让 EAS 生成新的上传密钥**
   ```bash
   cd ml-express-mobile-app
   eas credentials --platform android
   ```
   - 选择 **"Set up a new Android Keystore"**
   - EAS 会生成新的密钥

2. **获取 EAS 生成的 SHA-1**
   ```bash
   eas credentials --platform android
   ```
   - 查看输出的 SHA-1 指纹

3. **在 Google Play Console 中更新上传密钥**
   - 进入 **"发布"** → **"应用完整性"**
   - 上传 EAS 生成的证书文件

---

### 方案 3：使用 Google Play 提供的上传密钥证书（最可靠）

#### 步骤 1：从 Google Play Console 下载上传密钥证书

1. **登录 Google Play Console**
   - 访问：https://play.google.com/console
   - 选择您的应用

2. **下载上传密钥证书**
   - 进入 **"发布"** → **"应用完整性"**
   - 在 **"上传密钥"** 部分
   - 点击 **"下载"** 或 **"导出"** 上传密钥证书
   - 保存为 `.pem` 或 `.der` 文件

#### 步骤 2：配置 EAS 使用这个证书

```bash
cd ml-express-mobile-app

# 配置 Android 凭据
eas credentials --platform android

# 选择：
# - "Use existing Android Keystore"
# - 上传 Google Play 提供的证书文件
```

#### 步骤 3：重新构建应用

```bash
# 使用正确的签名密钥重新构建
eas build --platform android --profile production
```

#### 步骤 4：上传新的 App Bundle

1. 等待构建完成
2. 下载新的 `.aab` 文件
3. 在 Google Play Console 中上传
4. 这次应该不会再有签名密钥错误

---

## 🔧 快速操作步骤（推荐）

### 步骤 1：检查当前 EAS 凭据

```bash
cd ml-express-mobile-app

# 查看当前的 Android 凭据
eas credentials --platform android
```

查看输出的 SHA-1 指纹，确认当前使用的密钥。

### 步骤 2：检查 Google Play Console 的上传密钥

1. 登录 Google Play Console
2. 进入应用 → **"发布"** → **"应用完整性"**
3. 查看 **"上传密钥证书"** 的 SHA-1 指纹
4. 记录这个 SHA-1

### 步骤 3：比较 SHA-1

- **EAS 当前使用的 SHA-1**: `8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0`
- **Google Play 期望的 SHA-1**: `8E:05:84:E7:07:02:08:17:E5:F8:FE:3B:8F:19:3C:5A:76:CD:FE:B8`

如果不同，需要配置 EAS 使用 Google Play 期望的密钥。

### 步骤 4：配置 EAS 使用正确的密钥

**如果 Google Play 提供了证书文件**：

```bash
eas credentials --platform android
# 选择 "Use existing Android Keystore"
# 上传 Google Play 提供的证书文件
```

**如果 Google Play 没有提供证书文件**：

1. 在 Google Play Console 中请求上传密钥重置
2. 等待 Google Play 提供新的证书
3. 使用新证书配置 EAS

### 步骤 5：重新构建应用

```bash
# 使用正确的签名密钥重新构建
eas build --platform android --profile production
```

### 步骤 6：上传新的 App Bundle

1. 等待构建完成
2. 下载新的 `.aab` 文件
3. 在 Google Play Console 中上传
4. 验证签名密钥是否匹配

---

## ⚠️ 重要注意事项

### 1. 签名密钥是永久的

- ⚠️ **一旦应用在 Google Play 发布，签名密钥无法更改**
- ✅ 如果使用 Google Play App Signing，Google Play 会自动管理应用签名密钥
- ✅ 您只需要确保上传密钥正确

### 2. Google Play App Signing

**推荐启用 Google Play App Signing**：
- ✅ Google Play 自动管理应用签名密钥
- ✅ 即使丢失上传密钥，也可以重置
- ✅ 更安全，更可靠

### 3. 上传密钥 vs 应用签名密钥

- **上传密钥**: 用于签名上传到 Google Play 的 App Bundle
- **应用签名密钥**: Google Play 使用这个密钥重新签名应用（最终用户设备上的签名）

---

## 📋 检查清单

解决签名密钥问题前，请确认：

- [ ] ✅ 已登录 Google Play Console
- [ ] ✅ 已查看应用签名设置
- [ ] ✅ 已获取 Google Play 期望的上传密钥 SHA-1
- [ ] ✅ 已检查 EAS 当前使用的签名密钥 SHA-1
- [ ] ✅ 已比较两个 SHA-1 是否匹配
- [ ] ✅ 如果不匹配，已配置 EAS 使用正确的密钥
- [ ] ✅ 已重新构建应用
- [ ] ✅ 已上传新的 App Bundle
- [ ] ✅ 已验证签名密钥是否匹配

---

## 🚀 立即操作

### 1. 检查 Google Play Console

1. 登录：https://play.google.com/console
2. 选择应用
3. 进入 **"发布"** → **"应用完整性"**
4. 查看 **"上传密钥证书"** 的 SHA-1 指纹

### 2. 检查 EAS 凭据

```bash
cd ml-express-mobile-app
eas credentials --platform android
```

### 3. 根据情况选择方案

- **如果 Google Play 提供了证书文件**：使用方案 3
- **如果 Google Play 没有提供证书文件**：使用方案 2（重置上传密钥）
- **如果是新应用**：使用方案 2（让 EAS 生成新密钥）

---

**文档创建时间**: 2025-01-16  
**状态**: ⚠️ 需要根据 Google Play Console 的实际情况选择解决方案

