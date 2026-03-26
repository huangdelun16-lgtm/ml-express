# 🍎 Apple App Store 上架 - 快速开始

## 🎯 第一步：检查 Apple Developer 账号

### 必需条件
- ✅ Apple Developer Program 账号（$99/年）
- ✅ 账号已激活并支付年费

### 如果没有账号
1. 访问：https://developer.apple.com/programs/
2. 点击 "Enroll"
3. 使用 Apple ID 登录
4. 完成注册流程（1-3 个工作日审核）

---

## 🚀 第二步：立即开始构建

### 2.1 配置 EAS 凭据

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-client
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas credentials --platform ios
```

**操作步骤**：
1. 选择 `production` profile
2. 选择 `Set up new credentials`
3. 按照提示登录 Apple Developer 账号
4. EAS 会自动创建证书和配置文件

### 2.2 构建 iOS App

```bash
eas build --platform ios --profile production
```

**预计时间**: 20-40 分钟

**构建完成后**：
- 下载 .ipa 文件
- 或使用 `eas submit` 自动上传

---

## 📱 第三步：App Store Connect 配置

### 3.1 创建应用记录

1. 访问：https://appstoreconnect.apple.com
2. 登录 Apple Developer 账号
3. 点击 **"我的 App"** → **"+"** → **"新建 App"**
4. 填写：
   - 平台: **iOS**
   - 名称: **MARKET LINK EXPRESS**
   - 主要语言: **中文（简体）**
   - Bundle ID: **com.mlexpress.client**
   - SKU: **ml-express-client-ios-001**

### 3.2 填写应用信息

**应用名称**: MARKET LINK EXPRESS  
**副标题**: 缅甸专业快递服务

**简短描述**（复制到 App Store Connect）：
```
MARKET LINK EXPRESS - 专业的快递配送服务平台，提供快速、安全、可靠的包裹配送服务。支持实时追踪、多语言界面和智能路线规划。
```

**完整描述**：参考 `APPLE_STORE_COMPLETE_GUIDE.md` 中的完整描述

**关键词**：
```
快递,配送,包裹,追踪,物流,运输,寄件,收件,实时,智能,路线,通知,安全,快速,可靠,缅甸,同城
```

### 3.3 上传应用资源

**应用图标**：
- 尺寸: 1024x1024 像素
- 位置: `./assets/icon.png`
- 上传到 App Store Connect

**应用截图**（至少 3 张）：
- iPhone 6.7": 1290 x 2796 像素
- 建议截图：登录页、下单页、订单列表、地图追踪

### 3.4 配置隐私和合规

**隐私政策 URL**: `https://market-link-express.com/privacy-policy`

**数据收集声明**：
- 位置信息：用于配送服务和地图导航
- 相机：用于扫描二维码
- 照片：用于保存二维码和包裹图片

**出口合规**：选择 "否"（只使用标准加密）

---

## ✅ 第四步：上传和提交

### 4.1 上传构建版本

**方法 1：使用 EAS Submit（推荐）**
```bash
eas submit --platform ios
```

**方法 2：手动上传**
1. 下载 .ipa 文件
2. 使用 Transporter 上传
3. 或使用 Xcode Organizer

### 4.2 选择构建版本

1. 在 App Store Connect 中，进入应用
2. 进入 **"App Store"** → **"版本"**
3. 创建新版本或编辑现有版本
4. 选择上传的构建版本

### 4.3 填写版本信息

**版本号**: 1.1.0

**此版本的更新内容**：
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

立即下载，体验专业的快递服务！
```

### 4.4 提交审核

1. 检查所有必填项是否完成
2. 点击 **"提交以供审核"**
3. 等待审核（1-3 个工作日）

---

## 📋 快速检查清单

### 构建前
- [ ] Apple Developer 账号已激活
- [ ] EAS CLI 已安装
- [ ] 已登录 EAS
- [ ] app.json 配置正确

### App Store Connect
- [ ] 应用记录已创建
- [ ] 应用信息已填写
- [ ] 应用截图已上传（至少 3 张）
- [ ] 应用图标已上传（1024x1024）
- [ ] 隐私政策 URL 已添加
- [ ] 内容分级已完成
- [ ] 数据收集声明已填写

### 提交前
- [ ] 构建版本已上传
- [ ] 版本信息已填写
- [ ] 所有必填项已完成

---

## ⏱️ 预计时间

- **准备工作**: 1-3 天（Apple Developer 审核）
- **构建和配置**: 2-4 小时
- **App Store 审核**: 1-3 个工作日
- **总计**: 约 3-7 天

---

## 📚 详细指南

完整的详细步骤请参考：`APPLE_STORE_COMPLETE_GUIDE.md`

---

**现在就开始第一步：检查您的 Apple Developer 账号！** 🚀

