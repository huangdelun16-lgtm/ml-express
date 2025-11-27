# 📱 Google Play Store 上架完整指南 - 客户端 App

## 🎯 目标
将 MARKET LINK EXPRESS 客户端 App 上架到 Google Play Store

---

## ✅ 当前状态检查

### 已完成的配置 ✅
- ✅ **应用配置**: `app.json` 已配置基本信息和权限
- ✅ **构建配置**: `eas.json` 已配置 `app-bundle` 构建类型
- ✅ **隐私政策链接**: 应用内已添加隐私政策和用户协议链接
- ✅ **版本号**: 当前版本 `1.1.0`，构建号 `2`
- ✅ **包名**: `com.mlexpress.client`
- ✅ **应用图标**: 已配置 `assets/icon.png` 和 `assets/adaptive-icon.png`

### 需要处理的事项 ⚠️
- ⚠️ **隐私政策 URL**: 需要确保 `https://mlexpress.com/privacy` 可访问
- ⚠️ **用户协议 URL**: 需要确保 `https://mlexpress.com/terms` 可访问
- ⚠️ **Google Play 服务账号**: 需要配置用于自动提交
- ⚠️ **应用截图**: 需要准备至少 2 张截图
- ⚠️ **应用描述**: 需要准备多语言描述

---

## 📋 完整上架流程

### 步骤 1: 注册 Google Play 开发者账号

1. **访问 Google Play Console**
   - 网址: https://play.google.com/console
   - 使用您的 Google 账号登录

2. **完成注册**
   - 填写开发者信息（个人或公司）
   - 支付 **$25 一次性注册费**（永久有效）
   - 完成账户验证（邮箱和手机）

3. **验证信息**
   - 确认邮箱地址
   - 验证手机号码
   - 完成身份验证

**预计时间**: 30 分钟 - 1 小时

---

### 步骤 2: 准备应用材料

#### 2.1 应用图标（必需）✅
- ✅ 已配置: `assets/icon.png`
- ✅ 已配置: `assets/adaptive-icon.png`（Android 自适应图标）
- **规格要求**:
  - 512x512 像素 PNG 格式
  - 无透明背景
  - 符合 Google Play 设计规范

**验证步骤**:
```bash
# 检查图标尺寸（需要手动验证）
# 确保 assets/icon.png 是 512x512 像素
```

#### 2.2 应用截图（必需）⚠️
需要准备以下截图：
- **手机截图**: 至少 2 张，最多 8 张
  - 分辨率: 至少 320px，最大 3840px（长边）
  - 格式: JPG 或 24 位 PNG
  - **建议截图场景**:
    1. 欢迎页面 / 登录页面
    2. 首页（服务展示）
    3. 下单页面（地址选择）
    4. 订单追踪页面
    5. 我的订单列表
    6. 个人中心页面

**截图工具**:
- Android Studio 模拟器
- 真实设备截图
- Expo Go 预览截图

#### 2.3 应用描述（必需）⚠️

##### 简短描述（80 字符）
```
专业的快递配送服务平台，提供快速、安全、可靠的包裹配送服务
```

##### 完整描述（4000 字符）

**中文版本**:
```
MARKET LINK EXPRESS - 专业的快递配送服务平台

【核心功能】
✓ 快速下单 - 简单几步即可完成包裹寄送
✓ 实时追踪 - 随时查看包裹配送状态和位置
✓ 智能路线 - 优化配送路线，提高配送效率
✓ 多语言支持 - 中文、英文、缅语界面，满足不同用户需求
✓ 便捷操作 - 直观的用户界面设计，操作简单
✓ 实时通知 - 及时接收配送状态更新和重要通知
✓ 透明计费 - 清晰的价格计算系统，费用透明

【主要特性】
• 简洁直观的用户界面
• 实时同步数据
• 安全可靠的认证系统
• 支持多种支付方式
• 完善的客户服务支持

【适用场景】
• 个人包裹寄送
• 商务文件配送
• 电商订单发货
• 紧急物品配送

立即下载，体验专业的快递配送服务！
```

**English Version**:
```
MARKET LINK EXPRESS - Professional Express Delivery Service Platform

【Core Features】
✓ Quick Ordering - Complete package shipping in just a few steps
✓ Real-time Tracking - Monitor package delivery status and location anytime
✓ Smart Routing - Optimized delivery routes for efficiency
✓ Multi-language Support - Chinese, English, and Myanmar interfaces
✓ User-friendly Design - Intuitive interface, easy to use
✓ Real-time Notifications - Instant delivery status updates
✓ Transparent Pricing - Clear pricing calculation system

【Key Features】
• Simple and intuitive user interface
• Real-time data synchronization
• Secure and reliable authentication system
• Multiple payment methods support
• Comprehensive customer service support

【Use Cases】
• Personal package shipping
• Business document delivery
• E-commerce order fulfillment
• Urgent item delivery

Download now and experience professional express delivery services!
```

**Myanmar Version**:
```
MARKET LINK EXPRESS - ပရော်ဖက်ရှင်နယ် အမြန်ပို့ဆောင်ရေးဝန်ဆောင်မှုပလက်ဖောင်း

【အဓိကလုပ်ဆောင်ချက်များ】
✓ အမြန်မှာယူမှု - ရိုးရှင်းသောအဆင့်များဖြင့် ပါဆယ်ပို့ဆောင်မှုပြီးမြောက်စေသည်
✓ အချိန်နှင့်တပြေးညီ ခြေရာခံမှု - ပါဆယ်ပို့ဆောင်အခြေအနေကို မည်သည့်အချိန်တွင်မဆို ကြည့်ရှုနိုင်သည်
✓ ဉာဏ်ရည်တုလမ်းကြောင်း - ထိရောက်မှုအတွက် ပို့ဆောင်လမ်းကြောင်းများကို အကောင်းဆုံးဖြစ်အောင် ပြုလုပ်သည်
✓ ဘာသာစုံပံ့ပိုးမှု - တရုတ်၊ အင်္ဂလိပ်၊ မြန်မာ ဘာသာစကားများ
✓ အသုံးပြုရလွယ်ကူသော ဒီဇိုင်း - နားလည်ရလွယ်ကူသော အသုံးပြုသူအင်တာဖေ့စ်
✓ အချိန်နှင့်တပြေးညီ အသိပေးချက်များ - ပို့ဆောင်အခြေအနေ အပ်ဒိတ်များကို ချက်ချင်းရယူပါ
✓ ပွင့်လင်းသော စျေးနှုန်းသတ်မှတ်ခြင်း - ရှင်းလင်းသော စျေးနှုန်းတွက်ချက်မှုစနစ်

【အဓိကအင်္ဂါရပ်များ】
• ရိုးရှင်းပြီး နားလည်ရလွယ်ကူသော အသုံးပြုသူအင်တာဖေ့စ်
• အချိန်နှင့်တပြေးညီ ဒေတာထပ်တူပြုမှု
• လုံခြုံပြီး ယုံကြည်ရသော ခွင့်ပြုချက်စနစ်
• ငွေပေးချေမှုနည်းလမ်းများ ပံ့ပိုးမှု
• ပြီးပြည့်စုံသော ဖောက်သည်ဝန်ဆောင်မှု ပံ့ပိုးမှု

【အသုံးပြုနိုင်သော အခြေအနေများ】
• ပုဂ္ဂလိကပါဆယ်ပို့ဆောင်မှု
• စီးပွားရေးစာရွက်စာတမ်းပို့ဆောင်မှု
• အီလက်ထရွန်နစ်စီးပွားရေးမှာယူမှု
• အရေးပေါ်ပစ္စည်းပို့ဆောင်မှု

ယခုပင် ဒေါင်းလုဒ်လုပ်ပြီး ပရော်ဖက်ရှင်နယ် အမြန်ပို့ဆောင်ရေးဝန်ဆောင်မှုကို စမ်းသပ်ကြည့်ပါ！
```

#### 2.4 隐私政策 URL（必需）⚠️
- **当前配置**: `https://mlexpress.com/privacy`
- **要求**: 必须可公开访问
- **内容**: 已准备 `Privacy_Terms.md` 文档

**需要操作**:
1. 将 `Privacy_Terms.md` 中的隐私政策部分部署到 `https://mlexpress.com/privacy`
2. 确保 URL 在审核时可访问
3. 建议同时部署到 Netlify（如果使用）

#### 2.5 应用分类
- **类别**: 商务 / 商业 (Business)
- **内容分级**: 需要完成内容分级问卷（通常为 "Everyone" 或 "3+"）

---

### 步骤 3: 验证应用配置

#### 3.1 检查 app.json 配置

**当前配置**:
```json
{
  "expo": {
    "name": "MARKET LINK EXPRESS",
    "slug": "ml-express-client",
    "version": "1.1.0",
    "android": {
      "package": "com.mlexpress.client",
      "versionCode": 2,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

**验证清单**:
- ✅ 应用名称已设置
- ✅ 版本号已设置 (1.1.0)
- ✅ 版本代码已设置 (2)
- ✅ 包名已设置 (com.mlexpress.client)
- ✅ 权限已声明

#### 3.2 检查 eas.json 配置

**当前配置**:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"  // ✅ 正确配置
      }
    }
  }
}
```

**验证**: ✅ 已正确配置为 `app-bundle`（Google Play Store 要求）

---

### 步骤 4: 构建生产版本

#### 4.1 安装 EAS CLI（如果还没有）
```bash
npm install -g eas-cli
```

#### 4.2 登录 Expo 账号
```bash
cd ml-express-client
eas login
```

#### 4.3 配置构建凭据（首次构建）
```bash
eas credentials
```

选择:
- **Android**
- **Set up Google Play signing key**（让 EAS 自动管理）

#### 4.4 构建 Android App Bundle
```bash
cd ml-express-client

# 构建生产版本（App Bundle）
eas build --platform android --profile production
```

**构建时间**: 20-40 分钟

**构建完成后**:
1. 访问 https://expo.dev
2. 查看构建历史
3. 下载 `.aab` 文件（Android App Bundle）

---

### 步骤 5: 在 Google Play Console 创建应用

#### 5.1 创建应用
1. 登录 https://play.google.com/console
2. 点击 **"创建应用"**
3. 填写信息:
   - **应用名称**: MARKET LINK EXPRESS
   - **默认语言**: 中文（简体）或 英语
   - **应用或游戏**: 选择 **应用**
   - **免费或付费**: 选择 **免费**
   - **声明**: 勾选所有适用的选项

#### 5.2 填写应用详细信息

进入应用 → **商店发布** → **主要商店信息**:

**应用名称**:
```
MARKET LINK EXPRESS
```

**简短描述**（80字符）:
```
专业的快递配送服务平台，提供快速、安全、可靠的包裹配送服务
```

**完整描述**: 使用步骤 2.3 中准备的多语言描述

**应用图标**: 上传 `assets/icon.png` (512x512)

**功能图标**（可选）: 1024x500 像素，展示应用主要功能

**应用截图**: 上传步骤 2.2 中准备的截图（至少 2 张）

**隐私政策**: 输入 `https://mlexpress.com/privacy`

---

### 步骤 6: 设置应用内容分级

1. 进入 **内容分级**
2. 填写分级问卷
3. 根据应用内容选择适当的等级
   - 通常选择 **"Everyone"** 或 **"3+"**
4. 保存分级结果

---

### 步骤 7: 配置应用签名

#### 7.1 使用 Google Play 应用签名（推荐）
1. 首次上传时，Google 会自动管理签名密钥
2. 后续更新时，使用 EAS 自动签名

#### 7.2 配置 EAS 签名（如果还没有）
```bash
cd ml-express-client
eas credentials
```

选择:
- **Android**
- **Set up Google Play signing key**

---

### 步骤 8: 上传应用（首次发布）

#### 8.1 创建发布版本
1. 进入应用 → **版本** → **生产版本**
2. 点击 **"创建新版本"**

#### 8.2 上传 App Bundle
1. 点击 **"上传"**
2. 选择下载的 `.aab` 文件
3. 等待上传完成

#### 8.3 填写版本信息
- **版本名称**: 1.1.0
- **版本说明**:
```
🎉 MARKET LINK EXPRESS 首次发布！

【新功能】
✨ 快速下单功能
📍 实时包裹追踪
🗺️ 智能路线规划
🌍 多语言支持（中文、英文、缅语）
🔔 实时通知推送
💰 透明价格计算
📱 响应式设计

立即下载，体验专业的快递配送服务！
```

---

### 步骤 9: 完成内容分级和定价

#### 9.1 内容分级
- 完成分级问卷
- 确认分级结果

#### 9.2 定价和分发
- **价格**: 免费
- **分发国家**: 选择要发布的国家（建议选择所有国家）
- **设备类别**: 手机和平板

---

### 步骤 10: 审查并发布

#### 10.1 预览
1. 预览应用商店页面
2. 检查所有信息是否正确
3. 验证所有链接可访问

#### 10.2 提交审核
1. 点击 **"提交以供审核"**
2. 确认所有必需信息已填写
3. 等待审核

#### 10.3 等待审核
- **审核时间**: 通常 1-3 个工作日
- **状态更新**: Google 会通过邮件通知
- **首次审核**: 可能需要更长时间（3-7 天）

---

## 🔧 技术配置检查清单

### ✅ 应用配置
- [x] 应用名称: MARKET LINK EXPRESS
- [x] 包名: com.mlexpress.client
- [x] 版本: 1.1.0
- [x] 版本代码: 2
- [x] 图标: 已配置
- [x] 启动画面: 已配置
- [x] 权限说明: 已配置

### ✅ 构建配置
- [x] `eas.json` 已配置 `app-bundle`
- [x] EAS 项目 ID 已配置

### ⚠️ Google Play 要求
- [ ] Google Play 开发者账号（$25）
- [ ] 应用图标（512x512）- 需要验证尺寸
- [ ] 应用截图（至少 2 张）- 需要准备
- [ ] 应用描述（简短 + 完整）- 已准备
- [ ] 隐私政策 URL - 需要确保可访问
- [ ] 内容分级 - 需要完成问卷
- [ ] App Bundle（.aab 文件）- 需要构建

---

## 📝 版本更新流程（后续）

### 更新版本号
```json
// app.json
{
  "expo": {
    "version": "1.1.1",  // 更新版本号
    "android": {
      "versionCode": 3   // 递增版本代码
    }
  }
}
```

### 构建新版本
```bash
cd ml-express-client
eas build --platform android --profile production
```

### 提交更新
```bash
# 自动提交到 Google Play（需要配置服务账号）
eas submit --platform android

# 或者手动上传
# 1. 下载 .aab 文件
# 2. 在 Google Play Console 上传
```

---

## 💰 费用说明

### 一次性费用
- **Google Play 开发者注册**: $25
- 只需支付一次，永久有效

### 无其他费用
- ✅ 应用上架免费
- ✅ 后续更新免费
- ✅ 无月费或年费
- ✅ 无交易费用（如果应用免费）

---

## ⚠️ 注意事项

### 1. App Bundle vs APK
- **Google Play Store**: 必须使用 **App Bundle (.aab)**
- **APK**: 仅用于直接安装，不能上架
- ✅ 已正确配置为 `app-bundle`

### 2. 版本代码
- `versionCode`: 必须是递增的整数（2, 3, 4...）
- 每次更新必须递增
- `version`: 用户可见的版本号（1.1.0, 1.1.1...）

### 3. 隐私政策
- **必须提供**: Google Play 强制要求
- **当前 URL**: `https://mlexpress.com/privacy`
- **需要确保**: URL 可访问且内容完整

### 4. 审核时间
- **首次发布**: 1-3 个工作日（有时可能需要 3-7 天）
- **更新**: 通常几小时内
- **拒绝原因**: Google 会说明，修复后重新提交

### 5. 权限说明
- 所有权限都需要在应用描述中说明用途
- 当前权限:
  - `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`: 用于地址选择和包裹追踪
  - `CAMERA`: 用于扫描二维码
  - `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`: 用于保存和读取二维码图片

---

## 🚀 快速开始命令

```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录
cd ml-express-client
eas login

# 3. 配置凭据（首次）
eas credentials

# 4. 构建生产版本
eas build --platform android --profile production

# 5. 等待构建完成（20-40分钟）

# 6. 下载 .aab 文件

# 7. 在 Google Play Console 上传
```

---

## 📞 需要帮助？

- **EAS 文档**: https://docs.expo.dev/build/introduction/
- **Google Play 文档**: https://developer.android.com/distribute
- **Google Play Console 帮助**: https://support.google.com/googleplay/android-developer

---

## ✅ 完成后

应用上架后:
- ✅ 用户可以从 Google Play Store 搜索并下载
- ✅ 自动更新功能可用
- ✅ 可以接收用户评价和反馈
- ✅ 可以查看下载统计和分析

---

## 🎉 开始上架！

按照上述步骤，您的客户端应用很快就能在 Google Play Store 上线了！

**预计总时间**: 2-5 个工作日（包括注册、构建、审核）

**下一步**: 按照步骤 1 开始注册 Google Play 开发者账号！

