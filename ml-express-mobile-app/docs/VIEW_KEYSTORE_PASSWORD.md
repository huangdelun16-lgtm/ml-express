# 🔐 查看 Keystore 密码指南

## 📋 说明

Keystore 密码由 EAS 自动生成并安全存储在 EAS 服务器上。EAS 不会直接显示密码，但可以通过以下方式查看：

## ✅ 方法 1: 通过 EAS Web 界面查看（推荐）

1. **访问 EAS Web 界面**
   ```
   https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/credentials
   ```

2. **查看凭据信息**
   - 登录后，找到 **"Android"** → **"production"** 配置
   - 点击 **"Keystore"** 部分
   - 您会看到：
     - Keystore 密码（显示为明文或掩码）
     - Key Alias
     - Key Password
     - SHA-1 和 SHA-256 指纹

3. **下载 Keystore 文件**（如果需要）
   - 在凭据页面，可以下载 keystore 文件
   - 下载时会显示密码信息

## ✅ 方法 2: 通过 EAS CLI 查看

运行以下命令（需要交互式操作）：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas credentials --platform android
```

**操作步骤**：
1. 选择 **`production`**
2. 选择 **`Keystore`**
3. EAS 会显示当前的 keystore 信息，包括密码

## ✅ 方法 3: 查看构建日志

在最近的构建日志中，EAS 可能会显示 keystore 信息：

1. 访问构建日志：
   ```
   https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/builds
   ```

2. 打开最新的构建
3. 查看构建日志中是否有 keystore 相关信息

## 🔍 快速查看命令

如果您需要快速查看凭据配置（不显示密码，但显示其他信息）：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas credentials --platform android
```

然后选择 `production` → `Keystore`，EAS 会显示凭据信息。

## ⚠️ 重要提示

1. **密码安全**
   - Keystore 密码是敏感信息，请妥善保管
   - 不要将密码分享给他人
   - 不要将密码提交到代码仓库

2. **EAS 自动管理**
   - EAS 会自动使用 keystore 密码进行构建
   - 您通常不需要手动输入密码
   - 只有在下载 keystore 文件时才需要密码

3. **如果忘记密码**
   - 如果无法查看密码，可以重新生成新的 keystore
   - 但这会导致签名密钥改变，需要更新 Google Play Console

## 📝 记录信息

建议记录以下信息（如果查看到了）：
- ✅ Keystore Password
- ✅ Key Alias
- ✅ Key Password
- ✅ SHA-1 指纹
- ✅ SHA-256 指纹

这些信息在需要手动签名或导出证书时会用到。

