# 🔑 客户端 App 签名密钥问题 - 完整解决方案

## 📋 问题说明

上传 AAB 文件到 Google Play Store 时出现签名密钥不匹配错误：

- **期望的 SHA1**: `91:4B:4F:BC:D4:1D:CA:F1:E0:44:63:A9:FC:CE:63:77:B7:69:74:46`
- **当前 EAS Build 的 SHA1**: `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`

---

## ✅ 解决方案（两种方法）

### 方案 1: 在 Google Play Console 注册新的上传密钥（推荐，最简单）

**优点**：
- ✅ 不需要重新构建
- ✅ 不需要更改 EAS 配置
- ✅ 可以使用现有的 AAB 文件

**步骤**：

1. **登录 Google Play Console**
   ```
   https://play.google.com/console
   ```

2. **进入应用完整性设置**
   - 选择应用：**MARKET LINK EXPRESS**
   - 左侧菜单：**发布** → **设置** → **应用完整性**
   - 或：**Test and release** → **Setup** → **App integrity**

3. **注册新的上传密钥**
   - 找到 **"上传密钥证书"** (Upload key certificate) 部分
   - 点击 **"注册新的上传密钥"** 或 **"Register new upload key"**
   - 输入 SHA1 指纹：
     ```
     EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A
     ```
   - 点击 **"保存"** 或 **"Register"**

4. **重新上传 AAB 文件**
   - 使用之前构建的 AAB 文件
   - 文件：`application-2807aafb-95b5-400f-aeba-cb036db858f1.aab`
   - 下载链接：https://expo.dev/artifacts/eas/5WGu84ZRYvhdDWUhvqtLKK.aab
   - 重新上传到 Google Play Console

**完成！** 这样就不需要重新构建了。

---

### 方案 2: 重新构建 AAB 文件（如果需要新版本）

如果您需要重新构建（例如更新了代码或版本号）：

**步骤**：

1. **确认 EAS 凭据配置**
   ```bash
   cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
   export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
   eas credentials --platform android
   ```
   
   - 选择 `production`
   - 查看当前使用的签名密钥
   - EAS 会自动使用相同的密钥

2. **重新构建 AAB**
   ```bash
   eas build --platform android --profile production
   ```
   
   或使用构建脚本：
   ```bash
   ./build-aab.sh
   ```

3. **构建完成后**
   - 下载新的 AAB 文件
   - 上传到 Google Play Console
   - **注意**：如果 Google Play Console 仍然期望旧的 SHA1，需要先注册新的上传密钥（方案 1）

---

## 🎯 推荐操作流程

### 立即操作（推荐）

1. **在 Google Play Console 注册新的上传密钥**
   - SHA1: `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`
   - 使用现有的 AAB 文件重新上传

2. **如果注册成功**
   - ✅ 直接使用现有的 AAB 文件
   - ✅ 不需要重新构建
   - ✅ 立即可以上传

### 如果需要重新构建

1. **运行构建脚本**
   ```bash
   cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
   export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
   ./build-aab.sh
   ```

2. **等待构建完成**（15-25 分钟）

3. **下载新的 AAB 文件**

4. **上传到 Google Play Console**

---

## 📝 重要提示

### Google Play App Signing

- ✅ Google Play App Signing 已启用
- ✅ Google 管理应用签名密钥
- ✅ 您只需要管理上传密钥
- ✅ 上传密钥用于签名您上传的 AAB/APK

### 签名密钥一致性

- ⚠️ 所有上传到同一应用的版本必须使用相同的上传密钥签名
- ⚠️ 如果更改上传密钥，需要先在 Google Play Console 注册新密钥
- ✅ EAS Build 会自动使用相同的密钥（一旦配置）

### 首次上传 vs 后续上传

- **首次上传**：Google Play 会自动接受您的签名密钥
- **后续上传**：必须使用相同的签名密钥，或先注册新密钥

---

## 🔍 验证签名密钥

### 检查 AAB 文件的签名密钥

```bash
# 下载 AAB 文件后
unzip -p your-file.aab META-INF/*.RSA | keytool -printcert | grep SHA1
# 或
unzip -p your-file.aab META-INF/*.DSA | keytool -printcert | grep SHA1
```

### 检查 EAS 构建的签名密钥

构建日志中会显示签名信息，或使用：
```bash
eas build:list --platform android --limit 1
```

---

## 🚀 快速操作命令

### 如果选择方案 1（推荐）

1. 在 Google Play Console 注册上传密钥：`EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`
2. 重新上传现有的 AAB 文件

### 如果选择方案 2（重新构建）

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
./build-aab.sh
```

---

## ⚠️ 如果仍然失败

如果两种方案都不可用：

1. **检查 Google Play Console 设置**
   - 确认是否启用了 Google Play App Signing
   - 查看是否有其他限制

2. **联系 Google Play 支持**
   - 如果无法注册新的上传密钥
   - 可能需要重置上传密钥

3. **检查 EAS 凭据**
   - 确认 EAS 使用的签名密钥
   - 可能需要手动配置

---

**推荐：先尝试方案 1（在 Google Play Console 注册新密钥），这是最简单的方法！** 🚀

