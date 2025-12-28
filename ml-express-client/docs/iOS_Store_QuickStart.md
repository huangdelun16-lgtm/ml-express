# MARKET LINK EXPRESS - iOS Store 上架快速开始指南

## 🚀 快速开始

### 1. 准备工作
```bash
# 确保已安装必要工具
npm install -g @expo/eas-cli
eas login
```

### 2. 构建应用
```bash
# 开发环境构建
./build-and-deploy.sh development

# 预览环境构建
./build-and-deploy.sh preview

# 生产环境构建
./build-and-deploy.sh production
```

### 3. 提交到App Store
```bash
# 自动提交到App Store
eas submit --platform ios --profile production
```

## 📁 文件结构

```
ml-express-client/
├── app.json                          # 应用配置
├── eas.json                          # EAS Build配置
├── build-and-deploy.sh               # 构建部署脚本
├── AppStore_Metadata.md              # App Store元数据
├── Privacy_Terms.md                  # 隐私政策和用户协议
├── Screenshot_Guide.md               # 截图指南
├── AppStoreConnect_Guide.md          # App Store Connect配置指南
├── iOS_Store_Checklist.md            # 上架检查清单
└── assets/                           # 应用资源
    ├── icon.png                      # 应用图标
    ├── splash.png                    # 启动画面
    └── ...
```

## 📋 检查清单

### 必需文件
- [x] `app.json` - 应用配置
- [x] `eas.json` - EAS Build配置
- [x] `build-and-deploy.sh` - 构建脚本
- [x] 应用图标 (1024x1024)
- [x] 启动画面
- [x] 隐私政策
- [x] 用户协议

### App Store Connect 配置
- [ ] 创建应用记录
- [ ] 填写应用信息
- [ ] 上传应用截图
- [ ] 设置定价和可用性
- [ ] 提交审核

## 🔧 配置说明

### app.json 关键配置
```json
{
  "expo": {
    "name": "MARKET LINK EXPRESS",
    "slug": "ml-express-client",
    "version": "1.0.0",
    "bundleIdentifier": "com.mlexpress.client",
    "description": "专业的快递配送服务平台",
    "keywords": ["快递", "配送", "包裹", "追踪"],
    "privacy": "public"
  }
}
```

### eas.json 构建配置
```json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  }
}
```

## 📱 应用截图要求

### iPhone 截图
- 分辨率: 1290 x 2796 像素
- 格式: PNG 或 JPEG
- 数量: 最多10张
- 内容: 展示核心功能

### iPad 截图
- 分辨率: 2048 x 2732 像素
- 格式: PNG 或 JPEG
- 数量: 最多10张
- 内容: 展示iPad适配

## 🌍 多语言支持

### 支持的语言
- 中文 (简体)
- English
- Myanmar (Burmese)

### 本地化内容
- 应用描述
- 关键词
- 截图
- 隐私政策
- 用户协议

## 🔒 隐私合规

### 必需权限
- 位置信息 (NSLocationWhenInUseUsageDescription)
- 相机 (NSCameraUsageDescription)
- 相册 (NSPhotoLibraryUsageDescription)
- 麦克风 (NSMicrophoneUsageDescription)
- 通讯录 (NSContactsUsageDescription)

### 隐私政策要点
- 数据收集说明
- 数据使用说明
- 数据保护措施
- 用户权利说明
- 联系方式

## 🧪 测试流程

### 1. 内部测试
```bash
# 构建开发版本
eas build --platform ios --profile development
```

### 2. TestFlight 测试
```bash
# 构建预览版本
eas build --platform ios --profile preview
```

### 3. 生产测试
```bash
# 构建生产版本
eas build --platform ios --profile production
```

## 📊 监控和分析

### App Store Connect 分析
- 下载量统计
- 用户评分
- 崩溃报告
- 用户反馈

### 关键指标
- 应用启动时间
- 页面加载速度
- 崩溃率
- 用户留存率

## 🚨 常见问题

### 构建失败
1. 检查网络连接
2. 验证EAS配置
3. 检查代码语法错误
4. 查看构建日志

### 审核被拒
1. 检查应用功能完整性
2. 验证隐私政策
3. 确保无违规内容
4. 修复崩溃问题

### 性能问题
1. 优化图片资源
2. 减少内存使用
3. 优化网络请求
4. 使用性能分析工具

## 📞 支持联系

### 技术支持
- 邮箱: support@mlexpress.com
- 电话: +95-1-234-5678
- 网站: https://mlexpress.com/support

### 商务合作
- 邮箱: business@mlexpress.com
- 电话: +95-1-234-5679
- 网站: https://mlexpress.com/business

## 🎯 下一步行动

1. **完成测试** - 确保所有功能正常
2. **准备截图** - 按照指南制作应用截图
3. **配置App Store Connect** - 填写所有必要信息
4. **提交审核** - 使用构建脚本提交应用
5. **监控审核** - 跟踪审核状态和用户反馈

---

**重要提醒**: 
- 确保在真实设备上测试所有功能
- 检查所有权限请求的合理性
- 准备应对审核可能的问题
- 建立用户反馈处理机制

**预计时间**: 从开始到上架约需要 1-2 周时间

