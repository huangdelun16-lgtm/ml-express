# 🔐 Google Play 上传密钥重置完整指南

## 📋 当前情况

您正在 Google Play Console 中请求重置上传密钥，需要：
1. ✅ 选择原因（已选择 "I lost my upload key"）
2. ⏳ 生成新的上传密钥
3. ⏳ 导出上传密钥证书为 PEM 文件
4. ⏳ 上传 PEM 文件到 Google Play

---

## ✅ 完整操作步骤

### 步骤 1：确认选择原因

在 Google Play Console 的对话框中：
- ✅ 已选择 "I lost my upload key"
- ✅ 点击 **"Request"** 按钮（如果已启用）

---

### 步骤 2：使用 EAS 生成新的上传密钥

由于您使用 EAS Build，需要通过 EAS 生成新密钥：

#### 2.1 配置 EAS 生成新密钥

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
   - 使用方向键选择 `Set up a new Android Keystore`
   - 按 Enter

3. **EAS 会自动生成新密钥**
   - EAS 会显示生成的密钥信息
   - **重要**：记录显示的 SHA-1 和 SHA-256 指纹

---

### 步骤 3：从 EAS 导出证书为 PEM 文件

#### 3.1 下载 EAS 凭据

EAS 会自动保存凭据，但您需要导出证书：

```bash
cd ml-express-mobile-app

# 查看凭据信息
eas credentials --platform android

# 选择 production
# 查找导出选项（如果有）
```

#### 3.2 如果 EAS 没有直接导出选项

您需要从 EAS 服务器下载 keystore 文件，然后导出证书：

**方法 A：通过 EAS Web 界面**

1. **访问 EAS 网站**
   - https://expo.dev/accounts/[your-account]/projects/ml-express-mobile-app/credentials
   - 登录您的 Expo 账号

2. **下载 Android Keystore**
   - 找到 `production` 配置的 Android Keystore
   - 点击下载，保存为 `.jks` 文件

3. **导出证书为 PEM 文件**

   使用 `keytool` 命令导出证书：

   ```bash
   # 替换以下参数：
   # - upload-keystore.jks: 下载的 keystore 文件路径
   # - upload: key alias（从 EAS 凭据信息中获取）
   # - upload_certificate.pem: 输出的 PEM 文件路径
   
   keytool -export -rfc -keystore upload-keystore.jks -alias upload -file upload_certificate.pem
   ```

   **实际命令示例**：

   ```bash
   # 假设 keystore 文件名为 production.jks，alias 为 9979a2f2181ccb85e79943bca31e44c8
   keytool -export -rfc \
     -keystore production.jks \
     -alias 9979a2f2181ccb85e79943bca31e44c8 \
     -file upload_certificate.pem
   ```

   系统会要求输入 keystore 密码（从 EAS 凭据信息中获取）。

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

## 🔧 详细操作示例

### 示例：完整的重置流程

#### 1. 配置 EAS 生成新密钥

```bash
cd ml-express-mobile-app
eas credentials --platform android

# 选择 production
# 选择 Set up a new Android Keystore
# EAS 会生成新密钥并显示信息
```

**记录的信息**：
```
SHA-1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
SHA-256: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
Key Alias: xxxxxx
Keystore Password: [自动生成]
Key Password: [自动生成]
```

#### 2. 从 EAS 下载 Keystore

1. 访问 EAS Web 界面
2. 下载 `production` 配置的 Android Keystore
3. 保存为 `production.jks`

#### 3. 导出证书为 PEM 文件

```bash
# 使用 keytool 导出证书
keytool -export -rfc \
  -keystore production.jks \
  -alias xxxxxx \
  -file upload_certificate.pem

# 输入 keystore 密码（从 EAS 凭据信息中获取）
```

#### 4. 上传 PEM 文件到 Google Play

1. 在 Google Play Console 对话框中
2. 点击上传链接
3. 选择 `upload_certificate.pem` 文件
4. 点击 "Request" 提交

---

## ⚠️ 重要提示

### 1. Keystore 密码和 Key Alias

- ✅ Keystore 密码：EAS 自动生成，在凭据信息中显示
- ✅ Key Alias：EAS 自动生成，在凭据信息中显示（例如：`9979a2f2181ccb85e79943bca31e44c8`）
- ✅ Key Password：通常与 Keystore 密码相同

### 2. 如果无法从 EAS 下载 Keystore

**替代方案**：

1. **联系 EAS 支持**
   - 访问：https://expo.dev/support
   - 请求导出 keystore 文件

2. **使用 EAS CLI 导出**
   ```bash
   # 查看是否有导出选项
   eas credentials --platform android --help
   ```

### 3. 如果 keytool 命令不可用

**安装 Java JDK**：

```bash
# macOS
brew install openjdk

# 或下载安装 Oracle JDK
# https://www.oracle.com/java/technologies/downloads/
```

---

## 🚀 快速操作流程

### 简化步骤

1. **在 Google Play Console 中**
   - ✅ 已选择 "I lost my upload key"
   - ⏳ 暂时不要点击 "Request"，先完成以下步骤

2. **配置 EAS 生成新密钥**
   ```bash
   cd ml-express-mobile-app
   eas credentials --platform android
   # 选择 production → Set up a new Android Keystore
   ```

3. **从 EAS 下载 Keystore**
   - 访问 EAS Web 界面
   - 下载 production 的 Android Keystore

4. **导出证书为 PEM**
   ```bash
   keytool -export -rfc \
     -keystore production.jks \
     -alias [从EAS获取的alias] \
     -file upload_certificate.pem
   ```

5. **上传 PEM 文件到 Google Play**
   - 在对话框中上传 `upload_certificate.pem`
   - 点击 "Request"

---

## 📋 检查清单

完成重置前，请确认：

- [ ] ✅ 已在 Google Play Console 中选择重置原因
- [ ] ✅ 已配置 EAS 生成新密钥
- [ ] ✅ 已记录 SHA-1、SHA-256、Key Alias、密码等信息
- [ ] ✅ 已从 EAS 下载 Keystore 文件
- [ ] ✅ 已导出证书为 PEM 文件
- [ ] ✅ 已在 Google Play Console 中上传 PEM 文件
- [ ] ✅ 已点击 "Request" 提交请求
- [ ] ✅ 已等待 Google Play 审核

---

## 🆘 如果遇到问题

### 问题 1：无法从 EAS 下载 Keystore

**解决方案**：
- 联系 EAS 支持：https://expo.dev/support
- 或查看 EAS 文档：https://docs.expo.dev/build/signing/

### 问题 2：keytool 命令不可用

**解决方案**：
- 安装 Java JDK
- macOS: `brew install openjdk`
- Windows: 下载 Oracle JDK

### 问题 3：不知道 Key Alias 或密码

**解决方案**：
- 查看 EAS 凭据信息
- 运行 `eas credentials --platform android`
- 选择 production，查看详细信息

---

**文档创建时间**: 2025-01-16  
**状态**: ✅ 操作指南已准备

