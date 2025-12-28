# 🔑 解决 Google Play Store 签名密钥不匹配问题

## 📋 问题说明

上传 AAB 文件到 Google Play Store 时出现错误：
```
Your Android App Bundle is signed with the wrong key.
```

**错误详情**：
- **期望的签名密钥 SHA1**: `91:4B:4F:BC:D4:1D:CA:F1:E0:44:63:A9:FC:CE:63:77:B7:69:74:46`
- **实际上传的签名密钥 SHA1**: `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`

## 🎯 解决方案

### 方案 1: 使用 Google Play App Signing（推荐）

如果这是**第一次**上传到 Closed Testing，Google Play 会自动管理签名密钥。

**步骤**：

1. **在 Google Play Console 中注册上传密钥**
   - 进入 Google Play Console
   - 选择您的应用：**MARKET LINK EXPRESS**
   - 进入：**发布** → **设置** → **应用完整性**
   - 找到 **"应用签名"** 部分
   - 如果显示 "Google 管理您的应用签名密钥"，说明已启用 Google Play App Signing

2. **上传上传密钥证书**
   - 在 "应用签名" 页面，找到 **"上传密钥证书"** 部分
   - 下载当前 EAS Build 使用的签名密钥证书
   - 或者上传新的上传密钥证书

3. **从 EAS 获取签名密钥信息**
   ```bash
   cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
   export EXPO_TOKEN="your-token-here"
   
   # 查看构建的签名信息
   eas build:list --platform android --limit 1
   ```

4. **提取签名证书 SHA1**
   ```bash
   # 下载 AAB 文件
   eas build:download --platform android --limit 1
   
   # 提取签名信息（需要 Java keytool）
   keytool -printcert -jarfile your-downloaded.aab
   ```

### 方案 2: 配置 EAS 使用 Google Play 期望的签名密钥

如果 Google Play Console 已经有注册的签名密钥，需要配置 EAS 使用相同的密钥。

**步骤**：

1. **从 Google Play Console 下载签名密钥**
   - 进入：**发布** → **设置** → **应用完整性**
   - 找到 **"应用签名密钥"** 部分
   - 下载签名密钥（.jks 或 .keystore 文件）
   - **注意**：如果启用了 Google Play App Signing，您可能无法直接下载应用签名密钥，只能下载上传密钥

2. **上传签名密钥到 EAS**
   ```bash
   cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
   export EXPO_TOKEN="your-token-here"
   
   # 配置 EAS 凭据
   eas credentials
   
   # 选择：
   # - Platform: Android
   # - Build profile: production
   # - Action: Update credentials
   # - 选择 "Upload existing keystore"
   # - 上传从 Google Play Console 下载的 keystore 文件
   ```

3. **重新构建 AAB**
   ```bash
   eas build --platform android --profile production
   ```

### 方案 3: 注册新的上传密钥到 Google Play Console

如果这是第一次上传，或者您想使用新的签名密钥：

**步骤**：

1. **获取当前 EAS Build 的签名证书 SHA1**
   ```bash
   # 下载最新的 AAB
   eas build:download --platform android --limit 1
   
   # 提取证书信息
   unzip -p your-downloaded.aab META-INF/*.RSA | keytool -printcert
   # 或
   unzip -p your-downloaded.aab META-INF/*.DSA | keytool -printcert
   ```

2. **在 Google Play Console 注册上传密钥**
   - 进入：**发布** → **设置** → **应用完整性**
   - 找到 **"上传密钥证书"** 部分
   - 点击 **"注册新的上传密钥"**
   - 输入从 AAB 提取的 SHA1 指纹：`EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`
   - 或者上传证书文件

3. **重新上传 AAB**
   - 使用相同的 AAB 文件重新上传
   - 或者重新构建后上传

## 🔍 检查当前签名密钥

### 方法 1: 从已构建的 AAB 文件检查

```bash
# 下载最新的 AAB
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
eas build:download --platform android --limit 1

# 提取签名证书
unzip -p build-*.aab META-INF/*.RSA | keytool -printcert | grep SHA1
# 或
unzip -p build-*.aab META-INF/*.DSA | keytool -printcert | grep SHA1
```

### 方法 2: 从 EAS 凭据检查

```bash
# 查看 EAS 凭据信息
eas credentials --platform android
```

## 📝 重要提示

1. **Google Play App Signing**
   - 如果启用了 Google Play App Signing，Google 会管理您的应用签名密钥
   - 您只需要管理上传密钥
   - 上传密钥用于签名您上传的 AAB/APK

2. **签名密钥一致性**
   - 所有上传到同一应用的版本必须使用相同的上传密钥签名
   - 如果更改上传密钥，需要先在 Google Play Console 注册新密钥

3. **首次上传**
   - 如果是第一次上传到 Closed Testing，Google Play 会自动接受您的签名密钥
   - 后续上传必须使用相同的密钥

## 🚀 快速解决步骤（推荐）

1. **检查 Google Play Console 设置**
   - 确认是否启用了 Google Play App Signing
   - 查看已注册的上传密钥证书 SHA1

2. **如果 SHA1 不匹配**
   - 在 Google Play Console 注册新的上传密钥（使用 EAS Build 的 SHA1）
   - 或配置 EAS 使用 Google Play 期望的签名密钥

3. **重新构建并上传**
   ```bash
   eas build --platform android --profile production
   ```

4. **上传新的 AAB**
   - 下载构建完成的 AAB
   - 上传到 Google Play Console

## 📞 需要帮助？

如果问题仍然存在，请提供：
1. Google Play Console 中显示的期望 SHA1
2. EAS Build 生成的 AAB 的 SHA1
3. 是否启用了 Google Play App Signing

