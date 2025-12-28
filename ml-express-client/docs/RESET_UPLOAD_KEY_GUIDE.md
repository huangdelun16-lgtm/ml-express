# 🔑 重置上传密钥 - 完整指南

## 📋 当前情况

从您的截图可以看到：

- ✅ Google Play 已经注册了上传密钥
- ✅ 上传密钥 SHA-1: `91:4B:4F:BC:D4:1D:CA:F1:E0:44:63:A9:FC:CE:63:77:B7:69:74:46`
- ❌ EAS Build 当前使用的 SHA-1: `EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A`
- ❌ 两个密钥不匹配，导致无法上传

---

## ✅ 解决方案：重置上传密钥

### 步骤 1: 请求上传密钥重置

1. **在 "App signing" 页面中**
   - 找到 **"Request upload key reset"**（请求上传密钥重置）部分
   - 点击 **"Request upload key reset"** 链接

2. **填写重置请求**
   - Google Play 会要求您提供一些信息
   - 可能需要说明重置原因（例如：丢失密钥、使用新的构建系统等）

3. **提交请求**
   - 提交重置请求
   - **注意**：重置请求可能需要 Google Play 审核，通常需要几个工作日

### 步骤 2: 等待审核通过

- Google Play 会审核您的重置请求
- 审核通过后，您会收到通知
- 通常需要 1-3 个工作日

### 步骤 3: 使用新的上传密钥

审核通过后：

1. **重新构建 AAB 文件**
   ```bash
   cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
   export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
   eas build --platform android --profile production
   ```

2. **上传新的 AAB 文件**
   - 新的 AAB 文件会使用 EAS Build 的签名密钥
   - Google Play 会接受新的上传密钥

---

## 🚀 替代方案：直接上传（如果可能）

### 尝试直接上传 AAB 文件

有时候，即使密钥不匹配，Google Play 也可能提供其他选项：

1. **进入测试发布页面**
   - **"发布"** → **"测试"** → **"内部测试"**
   - 创建新版本

2. **上传 AAB 文件**
   - 上传链接：https://expo.dev/artifacts/eas/7YmNzrUUbPZTu7L1RvG7Lc.aab

3. **查看错误信息**
   - 如果上传失败，错误信息可能会提供：
     - 直接注册新密钥的选项
     - 或重置密钥的快捷方式

---

## ⚠️ 重要提示

### 关于重置上传密钥

1. **需要审核**
   - 重置请求需要 Google Play 审核
   - 可能需要 1-3 个工作日

2. **可能需要提供证明**
   - Google Play 可能会要求提供：
     - 应用所有权的证明
     - 重置原因说明
     - 其他相关信息

3. **重置后的影响**
   - 重置后，之前的上传密钥将失效
   - 必须使用新的上传密钥签名所有后续版本

---

## 🎯 推荐操作流程

### 立即操作

1. ✅ **点击 "Request upload key reset"**
   - 在 "App signing" 页面中找到并点击

2. ✅ **填写重置请求**
   - 说明原因：使用 EAS Build 系统，需要重置上传密钥

3. ✅ **提交并等待审核**

### 等待期间

1. ✅ **准备新的 AAB 文件**
   - 确保 EAS Build 配置正确
   - 准备好重新构建

2. ✅ **准备其他必需信息**
   - 应用商店信息
   - 隐私政策链接
   - 其他审核必需项

### 审核通过后

1. ✅ **重新构建 AAB**
   ```bash
   eas build --platform android --profile production
   ```

2. ✅ **上传新的 AAB**
   - 上传到 Google Play Console

3. ✅ **完成发布流程**

---

## 📝 重置请求示例说明

在填写重置请求时，可以使用以下说明：

```
原因：我们正在使用 Expo Application Services (EAS) Build 来构建应用。
EAS Build 使用新的签名密钥，与之前注册的上传密钥不匹配。
我们需要重置上传密钥以匹配 EAS Build 的签名密钥。

新的上传密钥 SHA-1: EF:87:EA:D3:35:56:9B:A2:15:F8:E9:A2:A7:8E:2B:AE:40:DB:E1:3A
```

---

## 🔍 如果重置请求被拒绝

如果重置请求被拒绝：

1. **联系 Google Play 支持**
   - 在 Google Play Console 中查找"帮助"或"支持"
   - 说明情况并请求帮助

2. **提供更多信息**
   - 应用所有权证明
   - 构建系统说明
   - 其他相关文档

---

**总结**：点击 "Request upload key reset" 是解决签名密钥不匹配问题的正确方法。虽然需要等待审核，但这是最可靠的解决方案。

