# 📱 iOS App Store 部署指南

## 🎯 目标
将 MARKET LINK EXPRESS 客户端App发布到 iOS App Store

---

## 📋 准备工作

### 1. Apple Developer 账号
```bash
✅ 注册 Apple Developer Program ($99/年)
✅ 完成身份验证
✅ 准备公司/个人信息
```

### 2. 开发环境
```bash
✅ macOS 系统 (必需)
✅ Xcode (最新版本)
✅ iOS 设备 (用于测试)
```

---

## 🛠️ 技术配置

### 1. 应用配置 (app.json)
```json
{
  "expo": {
    "name": "MARKET LINK EXPRESS",
    "slug": "ml-express-client", 
    "version": "1.0.0",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.mlexpress.client",
      "buildNumber": "1",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "MARKET LINK EXPRESS needs access to your location to provide accurate delivery services and track packages.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "MARKET LINK EXPRESS needs access to your location to provide accurate delivery services and track packages.",
        "NSCameraUsageDescription": "MARKET LINK EXPRESS needs access to your camera to scan QR codes and take photos for package verification.",
        "NSPhotoLibraryUsageDescription": "MARKET LINK EXPRESS needs access to your photo library to save QR codes and package images."
      },
      "config": {
        "usesNonExemptEncryption": false
      }
    }
  }
}
```

### 2. 权限说明 (已配置)
```bash
✅ 位置权限 - 用于地图和地址选择
✅ 相机权限 - 用于扫描QR码
✅ 相册权限 - 用于保存QR码图片
✅ 加密声明 - 声明不使用加密
```

---

## 🚀 部署步骤

### 第1步：安装 EAS CLI
```bash
# 全局安装 EAS CLI
npm install -g @expo/eas-cli

# 登录 Expo 账号
eas login
```

### 第2步：配置 EAS Build
```bash
# 在 ml-express-client 目录
cd ml-express-client

# 初始化 EAS 配置
eas build:configure

# 选择 iOS 平台
# 选择 production profile
```

### 第3步：配置 Apple Developer
```bash
# 在 Apple Developer Console 创建 App ID
# Bundle ID: com.mlexpress.client
# 启用所需功能：
# - Location Services
# - Camera
# - Photo Library
```

### 第4步：生成证书和配置文件
```bash
# EAS 会自动处理证书生成
eas credentials

# 选择 iOS
# 选择 "Set up new credentials"
# 选择 "Production" 证书
```

### 第5步：构建 iOS App
```bash
# 构建生产版本
eas build --platform ios --profile production

# 构建完成后会得到 .ipa 文件
```

### 第6步：上传到 App Store
```bash
# 使用 EAS Submit 上传
eas submit --platform ios

# 或者手动上传到 App Store Connect
```

---

## 📱 App Store Connect 配置

### 1. 创建应用
```bash
1. 登录 App Store Connect
2. 点击 "我的App" → "+"
3. 选择 "新建App"
4. 填写信息：
   - 平台: iOS
   - 名称: MARKET LINK EXPRESS
   - 主要语言: 中文 (简体)
   - Bundle ID: com.mlexpress.client
   - SKU: ml-express-client-ios
```

### 2. 应用信息
```bash
✅ 应用名称: MARKET LINK EXPRESS
✅ 副标题: 缅甸专业快递服务
✅ 关键词: 快递,配送,缅甸,同城,物流
✅ 类别: 商务
✅ 内容分级: 4+ (适合所有年龄)
```

### 3. 应用描述
```markdown
MARKET LINK EXPRESS 是缅甸领先的同城快递服务平台，为客户提供快速、安全、可靠的快递服务。

主要功能：
📦 快速下单 - 简单几步完成包裹寄送
📍 实时追踪 - 随时查看包裹状态
🗺️ 智能地图 - 精准定位收寄地址
📱 QR码扫描 - 快速取件和验证
💰 透明计费 - 实时价格计算
🌍 多语言支持 - 中文、英文、缅文

服务特色：
✅ 专业快递团队
✅ 24小时客服支持
✅ 保险保障
✅ 实时通知

立即下载，体验缅甸最专业的快递服务！
```

### 4. 截图要求
```bash
需要准备以下尺寸的截图：
✅ iPhone 6.7" (1290 x 2796) - 5张
✅ iPhone 6.5" (1242 x 2688) - 5张  
✅ iPhone 5.5" (1242 x 2208) - 5张
✅ iPad Pro 12.9" (2048 x 2732) - 5张
✅ iPad Pro 11" (1668 x 2388) - 5张
```

---

## 🎨 应用图标和素材

### 1. 图标尺寸要求
```bash
✅ App Store 图标: 1024 x 1024 px
✅ iPhone 图标: 180 x 180 px
✅ iPad 图标: 167 x 167 px
✅ 所有图标必须是 PNG 格式
✅ 不能包含透明度
```

### 2. 启动屏幕
```bash
✅ 启动图片: 1242 x 2688 px
✅ 背景色: #2E86AB (品牌蓝色)
✅ 包含应用Logo
```

---

## 🔐 隐私和合规

### 1. 隐私政策
```bash
✅ 必须提供隐私政策URL
✅ 说明数据收集和使用方式
✅ 符合 GDPR 和 App Store 要求
```

### 2. 权限说明
```bash
✅ 位置权限 - 用于地址选择和地图服务
✅ 相机权限 - 用于QR码扫描
✅ 相册权限 - 用于保存QR码图片
✅ 网络权限 - 用于API调用
```

---

## 📊 审核准备

### 1. 测试清单
```bash
✅ 所有功能正常工作
✅ 无崩溃或错误
✅ 权限请求有明确说明
✅ 支持不同屏幕尺寸
✅ 网络异常处理
✅ 多语言切换正常
```

### 2. 审核要点
```bash
✅ 应用功能完整
✅ 用户界面友好
✅ 性能稳定
✅ 符合App Store审核指南
✅ 无违规内容
```

---

## 💰 成本预算

### 一次性费用
```bash
Apple Developer Program: $99/年
EAS Build (免费额度): 免费
```

### 持续费用
```bash
Apple Developer Program: $99/年
EAS Build (超出免费额度): $29/月
App Store 分成: 30% (Apple收取)
```

---

## ⏱️ 时间计划

### 第1周：准备和配置
```bash
Day 1-2: 注册Apple Developer账号
Day 3-4: 配置EAS和证书
Day 5-7: 准备应用素材和描述
```

### 第2周：构建和测试
```bash
Day 1-3: 构建iOS版本
Day 4-5: 真机测试
Day 6-7: 修复问题和优化
```

### 第3周：提交和审核
```bash
Day 1-2: 上传到App Store Connect
Day 3-7: 等待Apple审核 (通常1-7天)
```

---

## 🎯 立即行动

### 今天就可以做：
```bash
1. 注册 Apple Developer Program
2. 安装 EAS CLI
3. 准备应用图标和截图
```

### 明天开始：
```bash
1. 配置 EAS Build
2. 生成证书
3. 构建第一个版本
```

---

## 🚀 成功上线后

### 优势：
```bash
✅ 专业形象 - 在App Store展示
✅ 用户信任 - Apple审核通过
✅ 全球分发 - 支持多国家
✅ 自动更新 - 通过App Store
✅ 用户评价 - 获得用户反馈
```

### 后续优化：
```bash
✅ 根据用户反馈优化功能
✅ 定期更新版本
✅ 监控崩溃和性能
✅ 分析用户行为数据
```

---

## 📞 技术支持

如果在部署过程中遇到问题：

1. **EAS Build 问题** - 查看 Expo 文档
2. **证书问题** - 检查 Apple Developer Console
3. **审核被拒** - 根据反馈修改后重新提交
4. **技术问题** - 联系开发团队

---

**预计2-3周内，你的iOS App就会在App Store上线！** 🎉📱✨
