# 🚀 TestFlight 使用指南

## 📱 什么是 TestFlight？

TestFlight 是 Apple 官方提供的 iOS 应用测试平台，无需上架 App Store 即可让最多 10,000 位测试人员使用您的应用。

---

## ✅ 必要条件

### 1. Apple Developer 账号
- 费用: $99/年
- 注册地址: https://developer.apple.com
- 需要提供:
  - 个人/公司信息
  - 信用卡或支付宝
  - 身份验证

### 2. 准备 App Store Connect
- 访问: https://appstoreconnect.apple.com
- 使用您的 Apple ID 登录
- 创建 App 记录

---

## 🎯 完整流程

### 步骤 1: 准备 Apple Developer 账号

1. 访问 https://developer.apple.com
2. 注册成为 Apple Developer
3. 等待审核 (通常 1-2 天)
4. 付款 $99/年

### 步骤 2: 安装 EAS CLI

```bash
# 全局安装 EAS CLI
npm install -g @expo/eas-cli

# 登录 Expo 账号
eas login

# 验证登录
eas whoami
```

### 步骤 3: 配置 Apple 凭证

```bash
cd ml-express-client

# 自动配置凭证
eas credentials
```

EAS 会引导您完成:
- Apple ID 登录
- 证书生成
- 配置文件创建

### 步骤 4: 在 App Store Connect 创建 App

1. 访问 https://appstoreconnect.apple.com
2. 点击 **"我的 App"**
3. 点击 **"+"** 创建新 App
4. 填写信息:
   - **名称**: MARKET LINK EXPRESS
   - **主要语言**: 简体中文
   - **Bundle ID**: com.mlexpress.client (已在 app.json 配置)
   - **SKU**: 唯一标识符 (如: ml-express-client)
   - **用户访问权限**: 完整访问

### 步骤 5: 构建 iOS 应用

```bash
cd ml-express-client

# 构建生产版本
eas build --platform ios --profile production
```

构建时间: 15-30 分钟

### 步骤 6: 上传到 App Store Connect

构建完成后，EAS 会自动上传，或者手动上传:

```bash
# 自动提交 (推荐)
eas submit --platform ios

# 或者下载 IPA 手动上传
```

### 步骤 7: 设置 TestFlight

#### 7.1 在 App Store Connect 添加版本

1. 登录 https://appstoreconnect.apple.com
2. 选择您的 App
3. 点击 **"TestFlight"** 标签
4. 选择构建版本
5. 填写测试信息:
   - 版本号
   - 测试说明

#### 7.2 添加测试人员

有两种方式：

##### 方式一: 内部测试 (推荐)

1. 添加内部测试人员:
   - 点击 **"内部测试"**
   - 添加测试人员电子邮件
   - 发送邀请

2. 限制:
   - 最多 100 人
   - 需要是 Apple Developer 团队成员
   - 立即可用
   - 无需审核

##### 方式二: 外部测试

1. 添加外部测试人员:
   - 点击 **"外部测试"**
   - 创建测试组
   - 添加测试人员电子邮件
   - 提交审核

2. 限制:
   - 最多 10,000 人
   - 可以是任何人
   - 需要 Apple 审核 (通常几小时)
   - 需要填写测试说明

### 步骤 8: 分享 TestFlight 链接

TestFlight 会自动生成分享链接，例如:
```
https://testflight.apple.com/join/ABC123XYZ
```

---

## 📱 测试人员使用指南

### 1. 安装 TestFlight
从 App Store 搜索 "TestFlight" 并安装

### 2. 接受邀请
- 通过电子邮件收到邀请
- 或点击分享链接

### 3. 安装应用
- 在 TestFlight 中点击 **"安装"**
- 安装完成后，点击 **"打开"**

### 4. 使用应用
- 正常使用应用
- 遇到问题可以反馈
- 版本更新时会收到通知

---

## 🔧 配置说明

您的 `app.json` 已经配置好了：

```json
{
  "expo": {
    "name": "MARKET LINK EXPRESS",
    "ios": {
      "bundleIdentifier": "com.mlexpress.client",
      "buildNumber": "1"
    }
  }
}
```

---

## 📝 快速命令参考

### 查看构建状态
```bash
eas build:list
```

### 查看构建详情
```bash
eas build:view [BUILD_ID]
```

### 重新构建
```bash
eas build --platform ios --profile production
```

### 提交新版本
```bash
eas submit --platform ios
```

---

## ⚠️ 常见问题

### Q: 需要等待审核吗？
**内部测试**: 不需要，立即可用  
**外部测试**: 需要，通常几小时

### Q: 可以添加多少人？
**内部测试**: 100 人  
**外部测试**: 10,000 人

### Q: 每次更新都需要上传吗？
是的，每次更新都需要:
1. 构建新版本
2. 提交到 TestFlight
3. 测试人员收到更新通知

### Q: 如何更新版本号？
编辑 `app.json`:
```json
{
  "expo": {
    "ios": {
      "buildNumber": "2",  // 递增版本号
      "version": "1.0.1"   // 更新版本
    }
  }
}
```

---

## 🎯 推荐流程

### 第一次设置 (30-60分钟)

```bash
# 1. 安装 EAS CLI
npm install -g @expo/eas-cli

# 2. 登录
eas login

# 3. 配置凭证
cd ml-express-client
eas credentials

# 4. 构建应用
eas build --platform ios --profile production
```

### 日常更新 (15-20分钟)

```bash
# 1. 更新版本号 (app.json)
# 2. 重新构建
eas build --platform ios --profile production

# 3. 提交新版本
eas submit --platform ios

# 4. 在 App Store Connect 选择新构建
```

---

## 💡 最佳实践

### 1. 版本管理
- 使用语义化版本号: `1.0.0`, `1.0.1`, `1.1.0`
- 每次更新递增 `buildNumber`

### 2. 测试说明
为每次版本添加清晰的测试说明:
- 新功能
- 修复的问题
- 注意事项

### 3. 测试反馈
- 收集测试反馈
- 及时修复问题
- 定期更新

---

## 🚀 开始使用

### 第一步: 检查当前状态

```bash
# 检查 EAS 登录状态
eas whoami

# 查看构建历史
eas build:list
```

### 第二步: 构建应用

```bash
cd ml-express-client

# 构建 iOS 应用
eas build --platform ios --profile production
```

### 第三步: 等待构建完成

构建完成后会显示:
- 下载链接
- 安装说明
- 构建 ID

---

## 🎉 完成！

构建完成后:
1. 访问 https://expo.dev 查看构建
2. 或直接提交到 App Store Connect
3. 在 TestFlight 中添加测试人员
4. 分享 TestFlight 链接

测试人员可以立即使用您的应用！

---

## 📞 需要帮助？

- EAS 文档: https://docs.expo.dev/build/introduction/
- TestFlight 文档: https://developer.apple.com/testflight/
- App Store Connect 文档: https://developer.apple.com/app-store-connect/

---

## 🎁 特别提示

您的应用已经配置完整:
- ✅ Bundle ID: com.mlexpress.client
- ✅ 版本号: 1.0.0
- ✅ 图标和启动画面
- ✅ 所有权限说明
- ✅ EAS Build 配置

直接开始构建即可！

