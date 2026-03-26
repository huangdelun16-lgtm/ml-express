# 🔧 iOS 凭据配置网络错误修复指南

## 📋 问题说明

在配置 iOS 凭据时遇到网络错误：
```
Failed to set up credentials.
[Network] request to https://api.expo.dev/graphql failed, reason: SSL routines:ssl3_read_bytes:ssl/tls alert bad record mac
```

**好消息**：证书和配置文件已经成功创建！
- ✅ Apple Distribution Certificate 已创建
- ✅ Apple Provisioning Profile 已创建

**问题**：保存到 EAS 服务器时网络连接失败。

---

## ✅ 解决方案

### 方案 1: 重新运行凭据配置（推荐）

证书已经创建，只需要重新运行命令让 EAS 保存凭据：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas credentials --platform ios
```

**操作步骤**：
1. 选择 `production` profile
2. 选择 `Build Credentials`
3. EAS 应该会检测到已存在的证书
4. 选择 `Use existing credentials` 或让 EAS 自动检测
5. 重新保存

### 方案 2: 检查网络连接

**网络问题排查**：

1. **检查网络连接**
   ```bash
   ping api.expo.dev
   ```

2. **关闭 VPN/代理**（如果有）
   - VPN 可能导致 SSL/TLS 握手失败
   - 临时关闭 VPN 后重试

3. **切换网络**
   - 尝试使用手机热点
   - 或更换网络环境

4. **清理 EAS 缓存**
   ```bash
   eas logout
   eas login
   ```

### 方案 3: 使用非交互模式重试

如果交互式命令有问题，可以尝试：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"

# 先检查当前凭据状态
eas credentials --platform ios

# 如果需要，可以尝试直接构建（EAS 会自动处理凭据）
eas build --platform ios --profile production
```

---

## 🔍 验证凭据是否已配置

### 方法 1: 通过 EAS CLI 检查

```bash
eas credentials --platform ios
```

如果看到证书和配置文件信息，说明已配置成功。

### 方法 2: 通过 EAS Web 界面检查

1. 访问：https://expo.dev/accounts/amt349/projects/ml-express-client/credentials
2. 查看 iOS 凭据部分
3. 确认证书和配置文件已存在

### 方法 3: 尝试构建

如果凭据已配置，构建应该可以成功：

```bash
eas build --platform ios --profile production
```

如果构建成功，说明凭据已正确配置。

---

## 🚀 推荐操作步骤

### 步骤 1: 检查网络

```bash
# 检查网络连接
ping api.expo.dev

# 如果 ping 失败，检查网络设置
```

### 步骤 2: 重新运行凭据配置

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas credentials --platform ios
```

**操作**：
1. 选择 `production`
2. 选择 `Build Credentials`
3. 如果看到已存在的证书，选择使用现有凭据
4. 如果提示重新创建，可以选择 `yes`（证书已创建，不会重复创建）

### 步骤 3: 如果仍然失败，尝试直接构建

有时即使凭据配置显示失败，实际上已经保存成功。可以尝试直接构建：

```bash
eas build --platform ios --profile production
```

如果构建开始，说明凭据已正确配置。

---

## ⚠️ 重要提示

1. **证书已创建**
   - Apple Distribution Certificate 已成功创建
   - Apple Provisioning Profile 已成功创建
   - 问题只是保存到 EAS 服务器时的网络错误

2. **不会重复创建**
   - 即使重新运行命令，EAS 会检测到已存在的证书
   - 不会创建重复的证书

3. **网络问题**
   - 这是临时的网络连接问题
   - 重试通常可以解决

---

## 🆘 如果问题持续

### 选项 1: 等待后重试

网络问题可能是临时的，等待几分钟后重试。

### 选项 2: 使用不同的网络

- 切换到手机热点
- 或使用不同的 Wi-Fi 网络

### 选项 3: 联系支持

如果问题持续存在：
1. 查看 EAS 状态：https://status.expo.dev
2. 联系 EAS 支持

---

## ✅ 验证成功

如果看到以下信息，说明配置成功：
- ✅ Certificate: Apple Distribution Certificate
- ✅ Provisioning Profile: Apple Provisioning Profile
- ✅ 没有错误信息

然后可以继续构建：
```bash
eas build --platform ios --profile production
```

