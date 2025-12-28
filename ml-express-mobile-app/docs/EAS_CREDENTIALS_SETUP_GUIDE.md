# 🔐 EAS 凭据配置指南 - 使用 Google Play 签名密钥

## 📋 当前情况

您正在运行 `eas credentials` 命令，需要配置 EAS 使用 Google Play 期望的签名密钥。

---

## ✅ 配置步骤

### 步骤 1：选择构建配置文件

在终端中，您会看到三个选项：
- `development` - 开发环境
- `preview` - 预览版本
- `production` - 生产版本（**选择这个**）

**操作**：
1. 使用方向键选择 **`production`**
2. 按 **Enter** 确认

---

### 步骤 2：选择操作类型

选择 `production` 后，EAS 会询问您要做什么：

**选项**：
- `Set up a new Android Keystore` - 设置新的 Android Keystore（生成新密钥）
- `Use existing Android Keystore` - 使用现有的 Android Keystore（**如果 Google Play 提供了证书，选择这个**）
- `Remove credentials` - 删除凭据
- `Go back` - 返回

**操作**：

#### 情况 A：如果 Google Play 提供了证书文件

1. 选择 **`Use existing Android Keystore`**
2. EAS 会要求您提供：
   - Keystore 文件路径（`.jks` 或 `.keystore` 文件）
   - Keystore 密码
   - Key alias
   - Key password

#### 情况 B：如果没有证书文件（推荐用于首次上传）

1. 选择 **`Set up a new Android Keystore`**
2. EAS 会自动生成新的签名密钥
3. 记录生成的 SHA-1 和 SHA-256 指纹
4. 后续需要在 Google Play Console 中更新上传密钥

---

### 步骤 3：配置签名密钥

#### 如果选择了 "Set up a new Android Keystore"

EAS 会自动生成新的密钥，您会看到：

```
✓ Generated new Android Keystore
✓ Keystore password: [自动生成]
✓ Key alias: [自动生成]
✓ Key password: [自动生成]

SHA-1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
SHA-256: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

**重要**：
- ✅ 记录这些 SHA-1 和 SHA-256 指纹
- ✅ 保存这些信息，后续可能需要

#### 如果选择了 "Use existing Android Keystore"

EAS 会要求您提供：

1. **Keystore 文件路径**
   ```
   ? Path to the Keystore file: 
   ```
   - 输入 Google Play 提供的证书文件路径
   - 或拖拽文件到终端

2. **Keystore 密码**
   ```
   ? Keystore password: 
   ```
   - 输入 keystore 的密码

3. **Key alias**
   ```
   ? Key alias: 
   ```
   - 输入密钥别名

4. **Key password**
   ```
   ? Key password: 
   ```
   - 输入密钥密码

---

## 🚀 推荐操作流程

### 方案 1：首次上传（推荐）

如果这是首次上传应用，推荐让 EAS 生成新密钥：

1. **选择 `production` 配置文件**
2. **选择 `Set up a new Android Keystore`**
3. **记录生成的 SHA-1 和 SHA-256**
4. **重新构建应用**
   ```bash
   eas build --platform android --profile production
   ```
5. **上传到 Google Play**
   - 首次上传时，Google Play 会接受任何签名密钥
   - 后续上传需要使用相同的密钥

### 方案 2：已有证书文件

如果您有 Google Play 提供的证书文件：

1. **选择 `production` 配置文件**
2. **选择 `Use existing Android Keystore`**
3. **提供证书文件信息**
   - Keystore 文件路径
   - 密码信息
4. **重新构建应用**
   ```bash
   eas build --platform android --profile production
   ```
5. **上传到 Google Play**

---

## 📝 详细操作示例

### 示例 1：设置新的 Android Keystore

```bash
# 1. 运行命令
cd ml-express-mobile-app
eas credentials --platform android

# 2. 选择构建配置文件
? Which build profile do you want to configure? › production
   # 使用方向键选择 production，按 Enter

# 3. 选择操作
? What do you want to do? › Set up a new Android Keystore
   # 使用方向键选择，按 Enter

# 4. EAS 会自动生成密钥
✓ Generated new Android Keystore
✓ Keystore password: [自动生成]
✓ Key alias: [自动生成]
✓ Key password: [自动生成]

SHA-1: 8B:37:44:0A:07:3A:AA:EA:B1:F2:75:53:72:A3:BB:0D:3A:18:7D:E0
SHA-256: F0:11:D3:9A:AF:40:19:70:C8:9A:27:59:55:D3:AA:B7:A3:D4:C7:56:09:A3:7A:2B:43:AB:54:97:98:20:B1:33

# 5. 记录这些信息
```

### 示例 2：使用现有的 Android Keystore

```bash
# 1. 运行命令
cd ml-express-mobile-app
eas credentials --platform android

# 2. 选择构建配置文件
? Which build profile do you want to configure? › production
   # 使用方向键选择 production，按 Enter

# 3. 选择操作
? What do you want to do? › Use existing Android Keystore
   # 使用方向键选择，按 Enter

# 4. 提供证书文件路径
? Path to the Keystore file: /path/to/your/keystore.jks
   # 输入证书文件的完整路径

# 5. 提供密码信息
? Keystore password: [输入密码]
? Key alias: [输入别名]
? Key password: [输入密钥密码]

# 6. EAS 会验证并保存
✓ Keystore configured successfully
```

---

## 🔍 验证配置

配置完成后，可以验证：

```bash
# 查看当前的凭据配置
eas credentials --platform android

# 选择 production 配置文件
# 查看显示的 SHA-1 和 SHA-256 指纹
```

确认 SHA-1 指纹是否与 Google Play 期望的匹配。

---

## ⚠️ 重要提示

### 1. 首次上传 vs 后续上传

- **首次上传**：Google Play 会接受任何签名密钥
- **后续上传**：必须使用相同的签名密钥

### 2. 保存凭据信息

- ✅ 记录 SHA-1 和 SHA-256 指纹
- ✅ 保存密码信息（如果手动配置）
- ✅ EAS 会自动保存凭据，但建议备份

### 3. Google Play App Signing

- ✅ 已启用 "Signing by Google Play"
- ✅ Google Play 会自动管理应用签名密钥
- ✅ 您只需要确保上传密钥正确

---

## 📋 操作检查清单

配置 EAS 凭据时，请确认：

- [ ] ✅ 已选择 `production` 配置文件
- [ ] ✅ 已选择正确的操作（新密钥或现有密钥）
- [ ] ✅ 已记录 SHA-1 和 SHA-256 指纹
- [ ] ✅ 已保存密码信息（如果手动配置）
- [ ] ✅ 已验证配置是否正确
- [ ] ✅ 已准备重新构建应用

---

## 🚀 下一步操作

配置完成后：

1. **重新构建应用**
   ```bash
   eas build --platform android --profile production
   ```

2. **等待构建完成**
   - 通常需要 10-20 分钟
   - EAS 会发送通知

3. **下载 App Bundle**
   - 从 EAS Build 页面下载 `.aab` 文件

4. **上传到 Google Play**
   - 在 Google Play Console 中上传
   - 验证签名密钥是否匹配

---

**文档创建时间**: 2025-01-16  
**状态**: ✅ 操作指南已准备

