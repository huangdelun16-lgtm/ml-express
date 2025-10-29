# 📱 Google Play Store 上架指南

## 🎯 目标
将 MARKET LINK EXPRESS 骑手 App 上架到 Google Play Store

---

## ✅ 准备工作

### 1. Google Play 开发者账号
- **费用**: $25（一次性注册费）
- **注册地址**: https://play.google.com/console
- **需要提供**:
  - Google 账号
  - 付款方式（信用卡或借记卡）
  - 开发者信息（个人或公司）
  - 完成账户验证

### 2. 开发环境
```bash
✅ Node.js 已安装
✅ Expo CLI 已安装
✅ EAS CLI 已安装
✅ Android 设备或模拟器（用于测试）
```

---

## 📋 完整上架流程

### 步骤 1: 注册 Google Play 开发者账号

1. **访问 Google Play Console**
   - 网址: https://play.google.com/console
   - 使用您的 Google 账号登录

2. **完成注册**
   - 填写开发者信息
   - 支付 $25 一次性注册费
   - 完成账户验证

3. **验证邮箱和手机**
   - 确认邮箱地址
   - 验证手机号码

---

### 步骤 2: 准备应用材料

#### 2.1 应用图标（必需）
- ✅ 已在 `assets/icon.png` 中配置
- ✅ 已在 `assets/adaptive-icon.png` 中配置（Android）
- **规格**: 
  - 512x512 像素 PNG 格式
  - 无透明背景
  - 符合 Google Play 设计规范

#### 2.2 应用截图（必需）
需要准备以下截图：
- **手机截图**: 至少 2 张，最多 8 张
  - 分辨率: 至少 320px，最大 3840px（长边）
  - 格式: JPG 或 24 位 PNG
  - 截图应展示应用的主要功能

#### 2.3 应用描述（必需）
- **简短描述**: 最多 80 个字符
- **完整描述**: 最多 4000 个字符
- **建议内容**:
  - 应用功能
  - 主要特性
  - 使用方法

#### 2.4 隐私政策 URL（必需）
- Google Play 要求所有应用必须有隐私政策
- 可以托管在您的网站上
- 必须可公开访问

#### 2.5 应用分类
- **类别**: 商业 / 效率 / 工具
- **内容分级**: 需要完成内容分级问卷

---

### 步骤 3: 配置 EAS Build（生产版本）

#### 3.1 更新 eas.json
您的 `eas.json` 需要修改为生成 **App Bundle**（不是 APK）：

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"  // 从 "apk" 改为 "app-bundle"
      }
    }
  }
}
```

#### 3.2 安装 EAS CLI（如果还没有）
```bash
npm install -g @expo/eas-cli
```

#### 3.3 登录 Expo 账号
```bash
eas login
```

---

### 步骤 4: 构建生产版本

#### 4.1 更新应用版本号
编辑 `app.json`:
```json
{
  "expo": {
    "version": "1.0.0",  // 更新版本号
    "android": {
      "versionCode": 1  // 添加版本代码（必须为整数）
    }
  }
}
```

#### 4.2 构建 Android App Bundle
```bash
cd ml-express-mobile-app

# 构建生产版本（App Bundle）
eas build --platform android --profile production
```

构建时间: **20-40 分钟**

#### 4.3 下载构建文件
构建完成后:
1. 访问 https://expo.dev
2. 查看构建历史
3. 下载 `.aab` 文件（Android App Bundle）

---

### 步骤 5: 在 Google Play Console 创建应用

#### 5.1 创建应用
1. 登录 https://play.google.com/console
2. 点击 **"创建应用"**
3. 填写信息:
   - **应用名称**: ML Express Staff / MARKET LINK EXPRESS 骑手
   - **默认语言**: 英语（可以后续添加其他语言）
   - **应用或游戏**: 选择 **应用**
   - **免费或付费**: 选择 **免费**
   - **声明**: 勾选所有适用的选项

#### 5.2 填写应用详细信息
进入应用 → **商店发布** → **主要商店信息**:

**简短描述**（80字符）:
```
专业的快递配送管理应用，帮助骑手高效完成包裹配送任务
```

**完整描述**（4000字符）:
```
MARKET LINK EXPRESS 骑手应用 - 专业的快递配送管理工具

【核心功能】
✓ 实时任务管理 - 查看和接受配送任务
✓ 智能路线导航 - 优化配送路线，节省时间
✓ 包裹扫描 - 快速扫描二维码，完成取件和配送
✓ 实时定位 - GPS定位，实时追踪配送状态
✓ 财务管理 - 查看收入统计和配送记录
✓ 绩效分析 - 了解自己的配送表现

【主要特性】
• 简洁直观的用户界面
• 多语言支持（中文、英文、缅甸语）
• 实时同步数据
• 离线功能支持
• 安全可靠的认证系统

【适用人群】
快递配送员、外卖骑手、物流工作人员

立即下载，开始高效的配送之旅！
```

---

### 步骤 6: 设置应用内容分级

1. 进入 **内容分级**
2. 填写分级问卷
3. 根据应用内容选择适当的等级
4. 保存分级结果

**常见分级**:
- PEGI 3（适合所有人）
- PEGI 7（适合 7 岁以上）
- 具体取决于应用内容

---

### 步骤 7: 配置应用签名

#### 7.1 使用 Google Play 应用签名（推荐）
1. 首次上传时，Google 会自动管理签名密钥
2. 后续更新时，使用 EAS 自动签名

#### 7.2 配置 EAS 签名
```bash
cd ml-express-mobile-app

# 配置签名密钥
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
- **版本名称**: 1.0.0
- **版本说明**: 首次发布

---

### 步骤 9: 上传应用资源

#### 9.1 应用图标
- 上传 512x512 像素图标
- 使用 `assets/icon.png`

#### 9.2 功能图标（可选）
- 上传 1024x500 像素功能图标
- 展示应用主要功能

#### 9.3 应用截图
上传至少 2 张手机截图：
- **建议截图场景**:
  1. 登录/主界面
  2. 任务列表
  3. 地图导航
  4. 包裹扫描
  5. 财务统计

#### 9.4 隐私政策
- 输入隐私政策 URL
- 或上传隐私政策文档

---

### 步骤 10: 完成内容分级和定价

#### 10.1 内容分级
- 完成分级问卷
- 确认分级结果

#### 10.2 定价和分发
- **价格**: 免费
- **分发国家**: 选择要发布的国家
- **设备类别**: 手机和平板

---

### 步骤 11: 审查并发布

#### 11.1 预览
1. 预览应用商店页面
2. 检查所有信息是否正确

#### 11.2 提交审核
1. 点击 **"提交以供审核"**
2. 确认所有必需信息已填写

#### 11.3 等待审核
- **审核时间**: 通常 1-3 个工作日
- **状态更新**: Google 会通过邮件通知

---

## 🔧 技术配置检查清单

### ✅ 应用配置

- [x] 应用名称: ML Express Staff
- [x] 包名: com.marketlinkexpress.staff
- [x] 版本: 1.0.0
- [x] 图标: 已配置
- [x] 启动画面: 已配置
- [x] 权限说明: 已配置

### ✅ 构建配置

需要修改 `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"  // 必须改为 app-bundle
      }
    }
  }
}
```

### ✅ Google Play 要求

- [ ] Google Play 开发者账号（$25）
- [ ] 应用图标（512x512）
- [ ] 应用截图（至少 2 张）
- [ ] 应用描述（简短 + 完整）
- [ ] 隐私政策 URL
- [ ] 内容分级
- [ ] App Bundle（.aab 文件）

---

## 📝 版本更新流程（后续）

### 更新版本号
```json
// app.json
{
  "expo": {
    "version": "1.0.1",  // 更新版本号
    "android": {
      "versionCode": 2   // 递增版本代码
    }
  }
}
```

### 构建新版本
```bash
eas build --platform android --profile production
```

### 提交更新
```bash
# 自动提交到 Google Play
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

### 2. 版本代码
- `versionCode`: 必须是递增的整数（1, 2, 3...）
- 每次更新必须递增
- `versionName`: 用户可见的版本号（1.0.0, 1.0.1...）

### 3. 隐私政策
- **必须提供**: Google Play 强制要求
- **建议**: 托管在您的网站上
- **内容**: 说明收集哪些数据、如何使用等

### 4. 审核时间
- **首次发布**: 1-3 个工作日
- **更新**: 通常几小时内
- **拒绝原因**: Google 会说明，修复后重新提交

---

## 🚀 快速开始命令

```bash
# 1. 安装 EAS CLI
npm install -g @expo/eas-cli

# 2. 登录
eas login

# 3. 进入项目目录
cd ml-express-mobile-app

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

按照上述步骤，您的骑手应用很快就能在 Google Play Store 上线了！

**预计总时间**: 2-5 个工作日（包括注册、构建、审核）

