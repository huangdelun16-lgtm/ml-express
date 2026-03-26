# 🔑 修复客户端 App 签名密钥问题

## 📋 问题说明

客户端 App 上传到 Google Play Store 时出现签名密钥不匹配错误：

**期望的 SHA1**: `91:4B:4F:BC:D4:1D:CA:F1:E0:44:63:A9:FC:CE:63:77:B7:69:74:46`  
**当前 EAS Build 的 SHA1**: `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`

## ✅ 解决方案

### 方案 1: 在 Google Play Console 注册新的上传密钥（推荐）

这是最简单的方法，不需要更改 EAS 配置。

**步骤**：

1. **登录 Google Play Console**
   - 访问：https://play.google.com/console
   - 选择应用：**MARKET LINK EXPRESS**

2. **进入应用完整性设置**
   - 左侧菜单：**发布** → **设置** → **应用完整性**
   - 或：**Test and release** → **Setup** → **App integrity**

3. **注册新的上传密钥**
   - 找到 **"上传密钥证书"** (Upload key certificate) 部分
   - 点击 **"注册新的上传密钥"** 或 **"Register new upload key"**
   - 输入 SHA1 指纹：`EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`
   - 保存

4. **重新上传 AAB 文件**
   - 使用之前构建的 AAB 文件（`application-2807aafb-95b5-400f-aeba-cb036db858f1.aab`）
   - 重新上传到 Google Play Console

### 方案 2: 配置 EAS 使用 Google Play 期望的签名密钥

如果您有 Google Play Console 期望的签名密钥文件：

1. **从 Google Play Console 下载签名密钥**（如果可用）
   - 进入应用完整性页面
   - 查找是否有下载上传密钥的选项

2. **配置 EAS 使用该密钥**
   ```bash
   cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
   export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
   eas credentials --platform android
   ```
   
   操作：
   - 选择 `production`
   - 选择 `Use existing Android Keystore`
   - 上传从 Google Play Console 下载的 keystore 文件
   - 输入密码信息

3. **重新构建 AAB**
   ```bash
   eas build --platform android --profile production
   ```

---

## 🚀 推荐操作（最简单）

**直接在 Google Play Console 注册新的上传密钥**：

1. 访问 Google Play Console → 应用完整性
2. 注册新的上传密钥：`EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`
3. 重新上传现有的 AAB 文件

这样就不需要重新构建了！

---

## 📝 如果需要重新构建

如果方案 1 不可用，需要重新构建：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas build --platform android --profile production
```

构建完成后，新的 AAB 文件会使用相同的签名密钥（SHA1: `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`）

---

## ⚠️ 重要提示

1. **Google Play App Signing**
   - 如果启用了 Google Play App Signing，Google 会管理应用签名密钥
   - 您只需要管理上传密钥
   - 上传密钥用于签名您上传的 AAB

2. **签名密钥一致性**
   - 所有后续上传必须使用相同的上传密钥
   - EAS Build 会自动使用相同的密钥

3. **首次上传**
   - 如果是首次上传到 Closed Testing，Google Play 会自动接受签名密钥
   - 后续上传必须使用相同的密钥

