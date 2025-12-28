# 🔑 解决 Google Play Console 证书重复问题

## ⚠️ 问题说明

Google Play Console 显示错误：
```
The upload certificate is the same as one of the past upload certificates. 
For security reasons you need to use a new upload certificate.
```

**当前情况**：
- EAS 显示 "None assigned yet"（没有 Keystore）
- 但构建时仍在使用旧的证书（SHA1: `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`）
- 无法删除 Keystore（因为显示不存在）

---

## ✅ 解决方案：创建全新的 Keystore

**关键点**：不需要删除旧的，而是创建一个**全新的** Keystore 来替换。

---

## 🚀 操作步骤

### 步骤 1: 创建全新的 Keystore 和证书

运行脚本自动创建：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
./create-new-keystore.sh
```

脚本会：
1. ✅ 创建一个全新的 Keystore 文件（`.jks`）
2. ✅ 自动生成密码（保存在 `keystore-info_*.txt`）
3. ✅ 导出 PEM 证书文件（`upload_certificate_new_*.pem`）
4. ✅ 显示 SHA1 指纹（**肯定与旧的不同**）

**或者手动创建**：

```bash
# 创建新的 Keystore

  -storetype PKCS12 \
  -keystore upload-keystore.jks \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "your-password" \
  -keypass "your-password" \
  -dname "CN=ML Express, OU=Development, O=ML Express, L=City, ST=State, C=US"

# 导出 PEM 证书
keytool -export -rfc \
  -keystore upload-keystore.jks \
  -alias upload \
  -file upload_certificate_new.pem \
  -storepass "your-password"
```

---

### 步骤 2: 上传新的 Keystore 到 EAS

```bash
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas credentials --platform android
```

**操作步骤**：
1. 选择 `Android`
2. 选择 `production`
3. **重要**：选择 `Set up a new keystore`（设置新的 Keystore）
   - **不要选择** `Upload credentials from credentials.json`（这个选项需要 credentials.json 文件）
   - 如果看到 `Update credentials`，选择它，然后选择 `Upload existing keystore`
4. 选择构建凭据：`Build Credentials WHnP9TM1KD (Default)`
5. 输入 Keystore 文件路径（脚本生成的 `.jks` 文件完整路径）
6. 输入密码（查看 `keystore-info_*.txt` 文件）
7. 输入 alias：`upload`
8. 输入 key password（通常与 Keystore 密码相同）

**详细指南**：请查看 `EAS_UPLOAD_KEYSTORE_GUIDE.md`

---

### 步骤 3: 上传新的 PEM 证书到 Google Play Console

1. **打开 Google Play Console**
   - 访问：https://play.google.com/console
   - 选择应用：**MARKET LINK EXPRESS**

2. **进入上传密钥重置页面**
   - 如果之前打开了 "Request upload key reset" 对话框，继续使用它
   - 或者：**发布** → **设置** → **应用完整性** → **上传密钥证书** → **请求重置**

3. **上传新的 PEM 证书**
   - 选择原因：`Other`（其他）
   - 上传文件：`upload_certificate_new_*.pem`（脚本生成的文件）
   - 点击 **"Request"** 按钮

4. **验证**
   - 如果上传成功，Google Play 会接受新的证书
   - 新的 SHA1 指纹应该**不同于**旧的 `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`

---

### 步骤 4: 重新构建 AAB（使用新的 Keystore）

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas build --platform android --profile production
```

**构建完成后**：
- 新的 AAB 文件会使用新的 Keystore 签名
- 证书指纹会与旧的不同
- 可以成功上传到 Google Play Console

---

## 🔍 验证新证书

构建完成后，验证新证书：
keytool -genkeypair -v \
```bash
# 下载新的 AAB
eas build:download --platform android --limit 1

# 检查新的 SHA1（应该与旧的不同）
keytool -printcert -jarfile latest-build.aab | grep "SHA1:"
```

**预期结果**：
- ✅ 新的 SHA1 指纹**不同于** `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`
- ✅ Google Play Console 接受新的证书

---

## 📋 文件说明

创建后会生成以下文件：

1. **`upload-keystore_*.jks`** - 新的 Keystore 文件（需要上传到 EAS）
2. **`upload_certificate_new_*.pem`** - PEM 证书文件（需要上传到 Google Play Console）
3. **`keystore-info_*.txt`** - Keystore 信息（包含密码，请妥善保管）

---

## ⚠️ 重要提示

1. **Keystore 密码**：脚本会自动生成密码并保存在 `keystore-info_*.txt` 文件中，请妥善保管
2. **备份**：建议备份新创建的 Keystore 文件，以防丢失
3. **一致性**：上传到 EAS 后，所有后续构建都会使用这个新的 Keystore
4. **Google Play**：上传新的 PEM 证书后，Google Play 会接受新的上传密钥

---

## 🎯 快速操作（推荐）

**一键完成**：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client

# 1. 创建新的 Keystore 和证书
./create-new-keystore.sh

# 2. 上传 Keystore 到 EAS（交互式）
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas credentials --platform android

# 3. 上传 PEM 证书到 Google Play Console（手动操作）

# 4. 重新构建
eas build --platform android --profile production
```

---

**完成这些步骤后，问题应该就能解决了！**

