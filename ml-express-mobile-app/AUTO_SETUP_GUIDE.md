# 🚀 自动配置 Google Play 上传密钥指南

## ✅ 已使用您的 Expo Token 登录

**账号**: amt349  
**Token**: 已配置

---

## 📋 完整操作步骤

### 步骤 1：配置 EAS 生成新的签名密钥

我已经为您创建了自动化脚本，运行：

```bash
cd ml-express-mobile-app
./setup-upload-key.sh
```

或者直接运行：

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
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
   - 使用方向键选择 `Set up a new Android Keystore`
   - 按 Enter

3. **EAS 会自动生成新密钥**
   - EAS 会显示生成的密钥信息
   - **重要**：记录以下信息：
     - SHA-1 指纹
     - SHA-256 指纹
     - Key Alias（例如：`9979a2f2181ccb85e79943bca31e44c8`）
     - Keystore 密码
     - Key 密码

---

### 步骤 2：从 EAS Web 界面下载 Keystore

1. **访问 EAS Web 界面**
   - https://expo.dev/accounts/amt349/projects/ml-express-mobile-app/credentials
   - 使用您的 Expo 账号登录（如果需要）

2. **下载 Android Keystore**
   - 找到 `production` 配置的 Android Keystore
   - 点击下载，保存为 `production.jks` 文件
   - 保存到 `ml-express-mobile-app` 目录

---

### 步骤 3：导出证书为 PEM 文件

在终端中运行（替换实际的值）：

```bash
cd ml-express-mobile-app

# 替换以下参数：
# - production.jks: 下载的 keystore 文件路径
# - [KEY_ALIAS]: 从步骤1中记录的 Key Alias
# - upload_certificate.pem: 输出的 PEM 文件路径

keytool -export -rfc \
  -keystore production.jks \
  -alias [KEY_ALIAS] \
  -file upload_certificate.pem
```

**示例**（假设 Key Alias 是 `9979a2f2181ccb85e79943bca31e44c8`）：

```bash
keytool -export -rfc \
  -keystore production.jks \
  -alias 9979a2f2181ccb85e79943bca31e44c8 \
  -file upload_certificate.pem
```

系统会要求输入 keystore 密码（从步骤1中记录的密码）。

---

### 步骤 4：上传 PEM 文件到 Google Play

1. **在 Google Play Console 对话框中**
   - 点击 **"Upload the .PEM file generated from your upload key certificate"** 链接
   - 选择刚才生成的 `upload_certificate.pem` 文件
   - 上传

2. **点击 "Request" 按钮**
   - 确认所有信息正确
   - 点击 **"Request"** 提交请求

3. **等待 Google Play 审核**
   - 通常需要几个工作日
   - Google Play 会通过邮件通知您

---

## 🔧 如果 keytool 命令不可用

### 安装 Java JDK

**macOS**:
```bash
brew install openjdk
```

**验证安装**:
```bash
keytool -version
```

---

## 📋 操作检查清单

- [ ] ✅ 已运行 `eas credentials --platform android`
- [ ] ✅ 已选择 `production` 配置文件
- [ ] ✅ 已选择 `Set up a new Android Keystore`
- [ ] ✅ 已记录 SHA-1、SHA-256、Key Alias、密码等信息
- [ ] ✅ 已从 EAS Web 界面下载 Keystore 文件
- [ ] ✅ 已导出证书为 PEM 文件
- [ ] ✅ 已在 Google Play Console 中上传 PEM 文件
- [ ] ✅ 已点击 "Request" 提交请求

---

## 🆘 如果遇到问题

### 问题 1：无法从 EAS Web 界面下载 Keystore

**解决方案**：
- 确认已登录正确的 Expo 账号
- 访问：https://expo.dev/accounts/amt349/projects/ml-express-mobile-app/credentials
- 如果仍然无法下载，联系 EAS 支持：https://expo.dev/support

### 问题 2：keytool 命令不可用

**解决方案**：
- 安装 Java JDK：`brew install openjdk`
- 验证安装：`keytool -version`

### 问题 3：不知道 Key Alias 或密码

**解决方案**：
- 查看 EAS 凭据信息
- 运行 `eas credentials --platform android`
- 选择 production，查看详细信息

---

**文档创建时间**: 2025-01-16  
**状态**: ✅ 操作指南已准备

