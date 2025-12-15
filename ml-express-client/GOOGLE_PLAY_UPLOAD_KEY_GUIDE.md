# 🔑 Google Play Console 上传密钥注册指南

## ⚠️ 重要提示

**不要点击 "Request upload key reset" 对话框！**

这个对话框是用于重置丢失的密钥，不是我们需要的。请关闭它。

## ✅ 正确步骤

### 步骤 1: 关闭重置对话框

- 点击对话框右下角的 **"Discard"** 按钮
- 或者点击对话框外的区域关闭它

### 步骤 2: 进入应用完整性设置

1. 在 Google Play Console 左侧菜单中
2. 点击 **"发布"** → **"设置"** → **"应用完整性"**
3. 或者直接访问：**"Test and release"** → **"Setup"** → **"App integrity"**

### 步骤 3: 找到上传密钥证书部分

在 "应用完整性" 页面中，找到 **"上传密钥证书"** (Upload key certificate) 部分。

### 步骤 4: 注册新的上传密钥

有两种方式：

#### 方式 A: 直接输入 SHA1 指纹（最简单）

1. 在 "上传密钥证书" 部分，找到 **"注册新的上传密钥"** 或 **"Register new upload key"** 按钮
2. 点击该按钮
3. 输入 EAS Build 生成的 AAB 文件的 SHA1 指纹：
   ```
   EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A
   ```
4. 点击 **"保存"** 或 **"Register"**

#### 方式 B: 上传 PEM 证书文件

如果您想上传证书文件：

1. **从 EAS 下载签名密钥**（如果可能）
   ```bash
   cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
   export EXPO_TOKEN="your-token-here"
   eas credentials --platform android
   # 选择 "Download credentials"
   ```

2. **导出 PEM 证书**
   ```bash
   keytool -export -rfc -keystore <keystore-file> -alias <alias-name> -file upload_certificate.pem
   ```

3. **上传 PEM 文件**
   - 在 Google Play Console 中点击 **"Upload the .PEM file"**
   - 选择生成的 `upload_certificate.pem` 文件

### 步骤 5: 重新上传 AAB 文件

注册完成后：

1. 返回 **"Test and release"** → **"Testing"** → **"Closed testing"**
2. 点击 **"Create new release"** 或 **"创建新版本"**
3. 上传之前下载的 AAB 文件
4. 现在应该不会再出现签名密钥错误了

## 📋 快速检查清单

- [ ] 关闭了 "Request upload key reset" 对话框
- [ ] 进入了 "应用完整性" (App integrity) 页面
- [ ] 找到了 "上传密钥证书" (Upload key certificate) 部分
- [ ] 注册了新的上传密钥（SHA1: `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`）
- [ ] 重新上传了 AAB 文件

## 🆘 如果找不到 "注册新的上传密钥" 选项

如果 Google Play Console 中没有显示 "注册新的上传密钥" 选项，可能是因为：

1. **Google Play App Signing 已启用**
   - 这种情况下，Google 会自动管理应用签名密钥
   - 您只需要确保上传的 AAB 使用正确的上传密钥签名
   - EAS Build 应该已经使用了正确的密钥

2. **需要先上传一次**
   - 有些情况下，需要先尝试上传一次（即使会失败）
   - 然后 Google Play Console 会显示注册选项

3. **联系 Google Play 支持**
   - 如果以上方法都不行，可能需要联系 Google Play Console 支持

## 📝 注意事项

- ✅ 注册上传密钥后，所有后续的 AAB/APK 文件都必须使用相同的密钥签名
- ✅ EAS Build 会自动使用相同的密钥，所以后续构建应该没问题
- ✅ 如果将来需要更改上传密钥，需要再次在 Google Play Console 中注册

