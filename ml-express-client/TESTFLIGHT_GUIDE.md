# ✈️ TestFlight 测试指南

## 🚀 快速开始

### 1. 自动化构建与提交

在终端运行以下命令，将应用构建并上传到 TestFlight：

```bash
cd ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"

# 构建并自动提交到 App Store Connect
eas build --platform ios --profile production --auto-submit
```

### 2. App Store Connect 配置

构建和上传完成后（通常需 20-40 分钟）：

1. 登录 [App Store Connect](https://appstoreconnect.apple.com/)
2. 选择 **"我的 App"** -> **"MARKET LINK EXPRESS"**
3. 点击顶部 **"TestFlight"** 标签
4. 等待构建版本状态变为 **"准备提交"** 或 **"正在测试"**

### 3. 添加测试员

#### A. 内部测试（推荐，无需审核）
适合开发团队和您自己。

1. 在 TestFlight 页面左侧，点击 **"App Store Connect 用户"**
2. 点击 **(+)** 添加测试员
3. 选择您的账号（或添加新用户）
4.以此方式添加的用户会**立即**收到邀请邮件

#### B. 外部测试（需 Beta 审核）
适合给客户或外部人员测试。

1. 点击左侧 **"外部测试"**
2. 点击 **(+)** 创建群组（如 "Public Beta"）
3. 添加测试员邮箱
4. 需要将构建版本添加到该群组，并提交给 Apple 进行 Beta 审核（通常 24 小时内）

### 4. 在手机上安装

1. 在 iPhone 上下载 **TestFlight** App (App Store)
2. 打开邮箱，找到来自 Apple 的邀请邮件
3. 点击 **"View in TestFlight"**
4. 在 TestFlight 中点击 **"安装"** 或 **"更新"**

---

## 📋 常见问题

### Q: 构建成功但 TestFlight 没看到？
A: 上传后 Apple 需要几分钟处理文件。如果是首次上传，可能需要检查邮箱是否有合规性问题通知。

### Q: 缺少导出合规性信息？
A: 在 App Store Connect 的 TestFlight 页面，点击构建版本旁的黄色警告图标，选择 **"否"** (即不包含非标准加密)，然后“开始内部测试”。
*为了自动处理此步骤，建议在 `app.json` 中配置 `ios.config.usesNonExemptEncryption: false` (已配置)*

### Q: 外部测试员收不到邮件？
A: 外部测试需要 Apple 审核通过后才能发送邀请。确保您已经点击了“提交审核”。


