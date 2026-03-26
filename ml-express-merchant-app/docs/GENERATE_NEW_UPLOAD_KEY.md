# 🔑 生成新的上传密钥证书（解决 Google Play Console 证书重复问题）

## ⚠️ 问题说明

Google Play Console 显示错误：
```
The upload certificate is the same as one of the past upload certificates. 
For security reasons you need to use a new upload certificate.
```

这意味着当前使用的证书与之前使用过的证书相同，Google Play 要求使用**全新的**证书。

---

## ✅ 解决方案：生成全新的 Keystore 和证书

### 步骤 1: 确认删除旧的 Keystore

**重要**：必须确保旧的 Keystore 已完全删除，否则会继续使用旧的证书。

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"

# 启动 EAS credentials 管理
eas credentials
```

**操作步骤**：
1. 选择 `Android`
2. 选择 `production`
3. 选择 `Keystore: ...`
4. 选择 `Delete keystore`（删除 Keystore）
5. 确认删除

**验证删除**：
- 删除后，再次运行 `eas credentials`，应该提示需要创建新的 Keystore

---

### 步骤 2: 构建新的 AAB（使用新的 Keystore）

删除旧的 Keystore 后，重新构建会自动生成新的 Keystore：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"

# 构建新的 AAB
eas build --platform android --profile production
```

**构建过程中**：
- 当提示是否生成新的 Keystore 时，选择 `Yes` 或 `Generate new keystore`
- 这会创建一个**全新的** Keystore，证书指纹会与之前的不同

---

### 步骤 3: 验证新证书的指纹

构建完成后，检查新证书的 SHA1 指纹：

```bash
# 下载新的 AAB 文件
eas build:download --platform android --limit 1

# 检查证书指纹（应该与旧的不同）
keytool -printcert -jarfile latest-build.aab | grep "SHA1:"
```

**预期结果**：
- 新的 SHA1 指纹应该**不同于** `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`
- 如果指纹相同，说明仍在使用旧的 Keystore，需要重新执行步骤 1

---

### 步骤 4: 从新的 Keystore 提取 PEM 证书

**方法 A: 使用脚本（推荐）**

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
./extract-new-certificate.sh
```

脚本会：
1. 引导您从 EAS 下载新的 Keystore
2. 自动提取 PEM 证书
3. 保存为 `upload_certificate_new.pem`

**方法 B: 手动提取**

1. **从 EAS 下载新的 Keystore**：
   ```bash
   eas credentials --platform android
   # 选择：Android → production → Download credentials
   ```

2. **导出 PEM 证书**：
   ```bash
   # 替换 <keystore-file> 为下载的文件名
   # 替换 <alias> 为 key alias（通常是 'upload' 或 'release'）
   # 替换 <password> 为 Keystore 密码（EAS 生成的可能是空密码）
   
   keytool -export -rfc \
     -keystore <keystore-file> \
     -alias <alias> \
     -file upload_certificate_new.pem \
     -storepass <password>
   ```

   **如果密码为空**：
   ```bash
   keytool -export -rfc \
     -keystore <keystore-file> \
     -alias upload \
     -file upload_certificate_new.pem \
     -storepass ""
   ```

---

### 步骤 5: 上传新证书到 Google Play Console

1. **打开 Google Play Console**
   - 访问：https://play.google.com/console
   - 选择应用：**MARKET LINK EXPRESS**

2. **进入上传密钥重置页面**
   - 如果之前打开了 "Request upload key reset" 对话框，继续使用它
   - 或者：**发布** → **设置** → **应用完整性** → **上传密钥证书** → **请求重置**

3. **上传新的 PEM 证书**
   - 选择原因：`Other`（其他）
   - 上传文件：`upload_certificate_new.pem`
   - 点击 **"Request"** 按钮

4. **验证**
   - 如果上传成功，Google Play 会接受新的证书
   - 如果仍然显示 "证书相同" 错误，说明证书指纹仍然与旧的相同，需要重新执行步骤 1-3

---

## 🔍 故障排除

### 问题 1: 删除 Keystore 后构建失败

**原因**：EAS 可能缓存了旧的 Keystore 信息

**解决**：
```bash
# 清除 EAS 缓存
eas build:cancel --all
eas build:list --platform android --limit 5

# 重新构建
eas build --platform android --profile production
```

### 问题 2: 新证书的指纹仍然相同

**原因**：可能没有真正删除旧的 Keystore，或者构建时使用了缓存的 Keystore

**解决**：
1. 再次确认已删除旧的 Keystore（步骤 1）
2. 检查构建日志，确认是否生成了新的 Keystore
3. 如果问题持续，联系 Expo 支持：https://expo.dev/support

### 问题 3: 无法从 EAS 下载 Keystore

**原因**：EAS 可能不允许直接下载 Keystore（安全原因）

**解决**：
- 使用脚本 `extract-new-certificate.sh` 自动处理
- 或者联系 Expo 支持获取帮助

---

## 📋 检查清单

在提交到 Google Play Console 前，确认：

- [ ] 旧的 Keystore 已删除（通过 `eas credentials` 确认）
- [ ] 新的 AAB 已构建完成
- [ ] 新证书的 SHA1 指纹**不同于**旧的指纹
- [ ] PEM 证书已成功提取
- [ ] 新证书已上传到 Google Play Console
- [ ] Google Play Console 接受了新证书（没有 "证书相同" 错误）

---

## 🎯 预期结果

完成后：
- ✅ Google Play Console 接受新的上传证书
- ✅ 可以成功上传新的 AAB 文件
- ✅ 应用可以正常发布到 Google Play Store

---

**如果按照以上步骤操作后仍然遇到问题，请提供具体的错误信息，我会进一步协助您解决。**


