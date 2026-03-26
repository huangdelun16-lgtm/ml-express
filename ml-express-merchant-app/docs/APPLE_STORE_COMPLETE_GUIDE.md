# 🍎 Apple App Store 上架完整指南 - 客户端 App

## 📋 概述

本指南将帮助您一步步将 **MARKET LINK EXPRESS** 客户端 App 上架到 Apple App Store。

**应用信息**：
- **应用名称**: MARKET LINK EXPRESS
- **Bundle ID**: com.mlexpress.client
- **当前版本**: 1.1.0
- **构建版本**: 2

---

## ✅ 第一步：准备工作

### 1.1 Apple Developer 账号

**必需条件**：
- ✅ 注册 Apple Developer Program（$99/年）
- ✅ 完成身份验证
- ✅ 支付年费

**注册步骤**：
1. 访问：https://developer.apple.com/programs/
2. 点击 "Enroll"
3. 使用 Apple ID 登录
4. 填写公司/个人信息
5. 完成身份验证
6. 支付 $99 年费

**预计时间**: 1-3 个工作日（审核时间）

### 1.2 开发环境检查

**必需**：
- ✅ macOS 系统（用于构建和上传）
- ✅ Xcode（最新版本，可选，EAS Build 可以云端构建）
- ✅ EAS CLI 已安装

**检查 EAS CLI**：
```bash
eas --version
```

如果没有安装：
```bash
npm install -g eas-cli
```

---

## ✅ 第二步：配置 EAS Build

### 2.1 登录 EAS

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas login
```

### 2.2 检查 EAS 配置

确认 `eas.json` 中的 iOS 配置：

```json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "simulator": false
      }
    },
    "testflight": {
      "extends": "production",
      "distribution": "store",
      "ios": {
        "simulator": false
      }
    }
  }
}
```

### 2.3 配置 Apple Developer 凭据

**首次配置**：

```bash
eas credentials --platform ios
```

**操作步骤**：
1. 选择 `production` 或 `testflight` profile
2. 选择 `Set up new credentials`
3. EAS 会引导您：
   - 登录 Apple Developer 账号
   - 创建 App ID（如果还没有）
   - 生成证书和配置文件
   - 配置推送通知证书（如果需要）

**重要提示**：
- EAS 会自动管理证书和配置文件
- 您只需要提供 Apple Developer 账号信息
- 确保 Bundle ID `com.mlexpress.client` 在 Apple Developer 中已注册

---

## ✅ 第三步：检查应用配置

### 3.1 验证 app.json 配置

**当前配置检查**：

```json
{
  "expo": {
    "name": "MARKET LINK EXPRESS",
    "version": "1.1.0",
    "ios": {
      "bundleIdentifier": "com.mlexpress.client",
      "buildNumber": "2",
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "MARKET LINK EXPRESS需要访问您的位置信息以提供准确的配送服务和包裹追踪功能。",
        "NSCameraUsageDescription": "MARKET LINK EXPRESS需要访问您的相机以扫描二维码和拍摄包裹验证照片。",
        "NSPhotoLibraryUsageDescription": "MARKET LINK EXPRESS需要访问您的相册以保存二维码和包裹图片。"
      },
      "config": {
        "usesNonExemptEncryption": false
      }
    }
  }
}
```

**✅ 配置已正确**：
- Bundle ID: `com.mlexpress.client`
- 版本号: `1.1.0`
- 构建版本: `2`
- 权限说明: 已配置
- 加密声明: 已设置

### 3.2 检查应用图标

**要求**：
- 尺寸: 1024x1024 像素
- 格式: PNG
- 无透明度
- 无圆角
- 无文字

**位置**: `./assets/icon.png`

**验证**：
```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
file assets/icon.png
# 或使用图片查看工具检查尺寸
```

---

## ✅ 第四步：构建 iOS App

### 4.1 构建生产版本

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas build --platform ios --profile production
```

**构建选项说明**：
- `--platform ios`: 构建 iOS 版本
- `--profile production`: 使用生产环境配置
- 会自动生成 `.ipa` 文件（iOS App Archive）

**预计时间**: 20-40 分钟

**构建过程**：
1. 上传代码到 EAS 服务器
2. 在云端构建应用（使用 macOS 构建服务器）
3. 自动签名（使用配置的证书）
4. 生成 `.ipa` 文件

### 4.2 查看构建状态

构建过程中，您可以：
- 在终端查看进度
- 或访问：https://expo.dev/accounts/amt349/projects/ml-express-client/builds

### 4.3 下载构建文件

构建完成后，您会看到：
```
✅ Build finished
📦 Build artifact: https://expo.dev/artifacts/...
```

**下载方式**：
1. 点击链接直接下载
2. 或使用命令：
   ```bash
   eas build:download --platform ios --latest
   ```

---

## ✅ 第五步：App Store Connect 配置

### 5.1 登录 App Store Connect

1. 访问：https://appstoreconnect.apple.com
2. 使用 Apple Developer 账号登录
3. 进入 "我的 App"

### 5.2 创建应用记录

**如果是首次创建**：

1. 点击 **"+"** → **"新建 App"**
2. 填写信息：
   - **平台**: iOS
   - **名称**: MARKET LINK EXPRESS
   - **主要语言**: 中文（简体）
   - **Bundle ID**: com.mlexpress.client
   - **SKU**: ml-express-client-ios-001
   - **用户访问权限**: 完整访问权限

3. 点击 **"创建"**

**如果应用已存在**：
- 直接选择应用进入

### 5.3 填写应用信息

#### 5.3.1 应用名称和副标题

**应用名称**（最多 30 个字符）：
```
MARKET LINK EXPRESS
```

**副标题**（最多 30 个字符）：
```
缅甸专业快递服务
```

#### 5.3.2 应用描述

**简短描述**（最多 170 个字符）：
```
MARKET LINK EXPRESS - 专业的快递配送服务平台，提供快速、安全、可靠的包裹配送服务。支持实时追踪、多语言界面和智能路线规划。
```

**完整描述**（最多 4000 个字符）：

**中文版本**：
```
MARKET LINK EXPRESS - 专业的快递配送服务平台

MARKET LINK EXPRESS 是缅甸领先的同城快递服务平台，为客户提供快速、安全、可靠的快递服务。

✨ 主要功能：

📦 快速下单
- 简单几步完成包裹寄送
- 自动价格计算
- 地图选择地址
- 多种配送速度选择

📍 实时追踪
- 随时查看包裹状态
- 实时查看骑手位置
- 配送进度通知
- 二维码扫描追踪

🗺️ 智能地图
- 精准定位收寄地址
- 地图选择地址
- 路线规划
- 导航集成

📱 订单管理
- 查看所有订单
- 订单状态筛选
- 订单详情查看
- 取消未配送订单

💰 透明计费
- 实时价格计算
- 清晰的价格明细
- 多种支付方式

🌍 多语言支持
- 中文界面
- 英文界面
- 缅文界面

🎯 服务特色：
✅ 专业快递团队
✅ 24小时客服支持
✅ 实时通知
✅ 安全可靠

立即下载，体验缅甸最专业的快递服务！
```

**英文版本**（如果需要）：
```
MARKET LINK EXPRESS - Professional Express Delivery Service Platform

MARKET LINK EXPRESS is Myanmar's leading same-city express delivery service platform, providing fast, secure, and reliable courier services to customers.

✨ Key Features:

📦 Quick Ordering
- Complete package shipping in just a few steps
- Automatic price calculation
- Map-based address selection
- Multiple delivery speed options

📍 Real-time Tracking
- Check package status anytime
- View courier location in real-time
- Delivery progress notifications
- QR code scanning for tracking

🗺️ Smart Maps
- Precise address location
- Map-based address selection
- Route planning
- Navigation integration

📱 Order Management
- View all orders
- Filter orders by status
- View order details
- Cancel undelivered orders

💰 Transparent Pricing
- Real-time price calculation
- Clear price breakdown
- Multiple payment methods

🌍 Multi-language Support
- Chinese interface
- English interface
- Myanmar language interface

🎯 Service Features:
✅ Professional courier team
✅ 24/7 customer support
✅ Real-time notifications
✅ Secure and reliable

Download now and experience Myanmar's most professional express delivery service!
```

#### 5.3.3 关键词

**中文关键词**（最多 100 个字符）：
```
快递,配送,包裹,追踪,物流,运输,寄件,收件,实时,智能,路线,通知,安全,快速,可靠,缅甸,同城
```

**英文关键词**（如果需要）：
```
delivery,express,shipping,tracking,logistics,transport,package,parcel,real-time,smart,route,notification,secure,fast,reliable,myanmar
```

#### 5.3.4 支持信息

- **支持网站**: https://mlexpress.com/support
- **营销网站**: https://mlexpress.com
- **隐私政策 URL**: https://market-link-express.com/privacy-policy
- **用户协议 URL**: https://market-link-express.com/terms

### 5.4 应用分类和内容分级

#### 5.4.1 应用分类

- **主要分类**: 商务 (Business)
- **次要分类**: 生活 (Lifestyle) 或 工具 (Utilities)

#### 5.4.2 内容分级

1. 点击 **"年龄分级"** 或 **"Content Rights"**
2. 完成分级问卷：
   - 选择 **"4+"**（适合所有年龄）
   - 或根据实际内容选择合适的分级
3. 保存结果

### 5.5 应用资源

#### 5.5.1 应用图标

**要求**：
- 尺寸: 1024x1024 像素
- 格式: PNG
- 无透明度
- 无圆角
- 无文字

**上传位置**: App Store Connect → 应用信息 → 应用图标

#### 5.5.2 应用截图

**必需尺寸**（至少需要一种）：

**iPhone 6.7" (iPhone 14 Pro Max)**：
- 尺寸: 1290 x 2796 像素
- 数量: 至少 3 张，最多 10 张

**iPhone 6.5" (iPhone 11 Pro Max)**：
- 尺寸: 1242 x 2688 像素
- 数量: 至少 3 张，最多 10 张

**iPad Pro 12.9"**：
- 尺寸: 2048 x 2732 像素
- 数量: 至少 3 张，最多 10 张（如果支持 iPad）

**截图建议**：
1. 登录/首页界面
2. 下单界面
3. 订单列表
4. 地图追踪界面
5. 订单详情
6. 个人中心

**截图工具**：
- 使用 iOS 模拟器（Xcode）
- 或使用真实设备截图

#### 5.5.3 应用预览视频（可选）

- 格式: MP4 或 MOV
- 时长: 15-30 秒
- 分辨率: 与截图相同

---

## ✅ 第六步：上传构建版本

### 6.1 使用 EAS Submit（推荐）

**自动上传**：

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas submit --platform ios
```

**操作步骤**：
1. EAS 会提示选择构建版本（选择最新的 production 构建）
2. 输入 Apple ID（用于 App Store Connect）
3. 选择应用（MARKET LINK EXPRESS）
4. EAS 会自动上传到 App Store Connect

### 6.2 手动上传（备选方案）

如果 EAS Submit 不可用：

1. **下载 .ipa 文件**
   ```bash
   eas build:download --platform ios --latest
   ```

2. **使用 Transporter 上传**
   - 下载 Transporter: https://apps.apple.com/app/transporter/id1450874784
   - 打开 Transporter
   - 拖拽 .ipa 文件到 Transporter
   - 点击 "交付"
   - 输入 Apple ID 密码

3. **或使用 Xcode**
   - 打开 Xcode
   - Window → Organizer
   - 选择 .ipa 文件
   - 点击 "Distribute App"
   - 选择 "App Store Connect"
   - 按照向导完成上传

### 6.3 验证上传

上传完成后：
1. 登录 App Store Connect
2. 进入应用 → **"TestFlight"** 或 **"App Store"** → **"版本"**
3. 等待处理完成（通常 10-30 分钟）
4. 看到构建版本后，选择该版本

---

## ✅ 第七步：配置版本信息

### 7.1 选择构建版本

1. 在 App Store Connect 中，进入 **"App Store"** → **"版本"**
2. 点击 **"+"** 创建新版本
3. 或编辑现有版本
4. 在 **"构建版本"** 部分，选择上传的构建

### 7.2 填写版本信息

**版本号**: `1.1.0`

**此版本的更新内容**（最多 4000 个字符）：

**中文版本**：
```
版本 1.1.0

🎉 MARKET LINK EXPRESS 首次发布！

✨ 新功能：
- 全新的用户界面设计
- 快速下单功能
- 实时包裹追踪
- 智能地图导航
- 二维码扫描
- 多语言支持（中文、英文、缅文）
- 订单管理
- 价格计算器

🔧 技术特性：
- 实时数据同步
- 离线数据缓存
- 流畅的用户体验
- 安全的数据传输

立即下载，体验专业的快递服务！
```

**英文版本**（如果需要）：
```
Version 1.1.0

🎉 MARKET LINK EXPRESS Initial Release!

✨ New Features:
- Brand new user interface design
- Quick ordering
- Real-time package tracking
- Smart map navigation
- QR code scanning
- Multi-language support (Chinese, English, Myanmar)
- Order management
- Price calculator

🔧 Technical Features:
- Real-time data synchronization
- Offline data caching
- Smooth user experience
- Secure data transmission

Download now and experience professional courier services!
```

### 7.3 配置应用内购买（如果有）

如果应用有应用内购买：
1. 在 App Store Connect 中配置
2. 添加产品信息
3. 设置价格

**注意**: 当前应用是免费应用，可能不需要此步骤。

---

## ✅ 第八步：隐私和合规

### 8.1 隐私政策

**必需**：
- ✅ 隐私政策 URL: `https://market-link-express.com/privacy-policy`
- ✅ 确保 URL 可公开访问
- ✅ 隐私政策内容完整

**在 App Store Connect 中**：
1. 进入 **"App 隐私"** 或 **"App Privacy"**
2. 填写数据收集声明：
   - **位置信息**: 用于配送服务和地图导航
   - **相机**: 用于扫描二维码
   - **照片**: 用于保存二维码和包裹图片
   - **用户内容**: 订单信息、地址信息
   - **标识符**: 设备标识符（用于推送通知）

### 8.2 出口合规

**加密声明**：
- ✅ 已在 `app.json` 中设置 `usesNonExemptEncryption: false`
- ✅ 应用只使用标准加密（HTTPS），无需出口许可

**在 App Store Connect 中**：
1. 进入 **"出口合规"** 或 **"Export Compliance"**
2. 选择 **"否"**（应用不使用加密，或只使用标准加密）
3. 保存

---

## ✅ 第九步：定价和可用性

### 9.1 定价

1. 进入 **"定价和销售范围"** 或 **"Pricing and Availability"**
2. 选择 **"免费"**
3. 保存

### 9.2 可用性

1. 选择可用地区：
   - 建议选择 **"所有国家或地区"**
   - 或选择特定国家/地区
2. 保存

---

## ✅ 第十步：提交审核

### 10.1 最终检查

在提交前，确认：

**应用信息**：
- [ ] 应用名称已填写
- [ ] 应用描述已填写
- [ ] 关键词已填写
- [ ] 支持信息已填写
- [ ] 应用分类已选择
- [ ] 内容分级已完成

**应用资源**：
- [ ] 应用图标已上传（1024x1024）
- [ ] 应用截图已上传（至少 3 张）
- [ ] 截图尺寸正确

**版本信息**：
- [ ] 构建版本已选择
- [ ] 版本号已填写
- [ ] 版本说明已填写

**隐私和合规**：
- [ ] 隐私政策 URL 已添加
- [ ] 数据收集声明已填写
- [ ] 出口合规已确认

**定价**：
- [ ] 价格已设置（免费）
- [ ] 可用地区已选择

### 10.2 提交审核

1. 在版本页面，滚动到底部
2. 点击 **"提交以供审核"** 或 **"Submit for Review"**
3. 确认提交

**提交后**：
- 应用状态会变为 **"等待审核"** 或 **"Waiting for Review"**
- 审核时间通常为 **1-3 个工作日**
- 您会收到邮件通知审核结果

---

## 📊 审核状态说明

### 审核流程

1. **等待审核** (Waiting for Review)
   - 应用已提交，等待 Apple 审核

2. **审核中** (In Review)
   - Apple 正在审核您的应用
   - 通常需要 1-3 个工作日

3. **待开发者发布** (Pending Developer Release)
   - 审核通过，等待您手动发布
   - 或自动发布（如果设置了自动发布）

4. **准备提交** (Prepare for Submission)
   - 需要修改某些内容
   - 查看拒绝原因并修改

5. **已发布** (Ready for Sale)
   - 应用已成功上架！

---

## 🆘 常见问题和解决方案

### 问题 1: 构建失败

**可能原因**：
- 证书配置错误
- Bundle ID 不匹配
- 代码错误

**解决方案**：
1. 检查构建日志
2. 验证证书配置：`eas credentials --platform ios`
3. 检查代码错误

### 问题 2: 上传失败

**可能原因**：
- 网络问题
- Apple ID 权限问题
- 文件格式错误

**解决方案**：
1. 检查网络连接
2. 确认 Apple ID 有上传权限
3. 使用 Transporter 手动上传

### 问题 3: 审核被拒

**常见原因**：
- 隐私政策不完整
- 应用功能不符合描述
- 截图不符合要求
- 数据收集声明不准确

**解决方案**：
1. 查看拒绝原因（邮件或 App Store Connect）
2. 根据反馈修改
3. 重新提交审核

### 问题 4: 证书过期

**解决方案**：
```bash
eas credentials --platform ios
# 选择 "Update credentials"
# EAS 会自动更新证书
```

---

## 📝 检查清单

### 构建前
- [ ] Apple Developer 账号已注册并激活
- [ ] EAS CLI 已安装
- [ ] 已登录 EAS
- [ ] app.json 配置正确
- [ ] 应用图标已准备（1024x1024）

### 构建中
- [ ] 构建命令已执行
- [ ] 构建成功完成
- [ ] .ipa 文件已下载

### App Store Connect 配置
- [ ] 应用记录已创建
- [ ] 应用信息已填写
- [ ] 应用截图已上传
- [ ] 内容分级已完成
- [ ] 隐私政策已添加
- [ ] 数据收集声明已填写

### 提交前
- [ ] 构建版本已上传
- [ ] 版本信息已填写
- [ ] 所有必填项已完成
- [ ] 最终检查通过

---

## 🎯 快速操作步骤总结

1. **准备 Apple Developer 账号**（如果还没有）
2. **配置 EAS 凭据**：`eas credentials --platform ios`
3. **构建 iOS App**：`eas build --platform ios --profile production`
4. **创建 App Store Connect 应用记录**
5. **填写应用信息**（名称、描述、截图等）
6. **上传构建版本**：`eas submit --platform ios`
7. **配置版本信息**
8. **提交审核**

---

## 📞 需要帮助？

如果遇到问题：
1. 查看构建日志：https://expo.dev/accounts/amt349/projects/ml-express-client/builds
2. 查看 EAS 文档：https://docs.expo.dev/build/introduction/
3. 查看 Apple 文档：https://developer.apple.com/app-store/

---

**预计总时间**：
- 准备工作：1-3 天（Apple Developer 审核）
- 构建和配置：2-4 小时
- App Store 审核：1-3 个工作日
- **总计：约 3-7 天**

**祝您上架顺利！** 🚀

