# Google Maps API Key 权限问题诊断和修复指南

## 🔍 问题诊断

根据您提供的错误信息，Google Maps 显示 "InvalidKeyMapError"，这通常是由以下原因造成的：

### 1. 域名限制问题
Google Cloud Console 中的 API Key 限制了允许的域名，当前访问的域名不在允许列表中。

### 2. API Key 配置问题
- API Key 可能无效或已过期
- 未启用必要的 Google Maps API
- 计费账户问题

## 🛠️ 修复步骤

### 步骤 1: 检查 Google Cloud Console 设置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目
3. 导航到 "APIs & Services" → "Credentials"
4. 找到您的 API Key，点击编辑

### 步骤 2: 配置域名限制

在 "Application restrictions" 部分，选择 "HTTP referrers (websites)"，添加以下域名：

```
https://market-link-express.com/*
https://www.market-link-express.com/*
https://market-link-express.netlify.app/*
https://localhost/*
https://127.0.0.1/*
```

### 步骤 3: 启用必要的 API

确保启用了以下 API：
- Maps JavaScript API
- Places API (如果需要)
- Geocoding API (如果需要)

### 步骤 4: 检查计费账户

确保您的 Google Cloud 项目有有效的计费账户。

## 🧪 测试工具

我创建了两个测试工具来帮助您诊断问题：

1. **简单测试页面**: `test-google-maps.html`
   - 直接在浏览器中打开
   - 输入您的 API Key 进行测试
   - 实时显示错误信息

2. **完整诊断工具**: `google-maps-diagnostic.html`
   - 全面的环境检查
   - 网络请求诊断
   - 控制台错误检查

## 📝 环境变量配置

### 本地开发环境
在项目根目录创建 `.env` 文件：
```
REACT_APP_GOOGLE_MAPS_API_KEY=您的API密钥
```

### Netlify 部署环境
在 Netlify 控制台设置环境变量：
- 变量名: `REACT_APP_GOOGLE_MAPS_API_KEY`
- 变量值: 您的 Google Maps API Key

## 🔧 代码修复

如果问题仍然存在，可能需要修改代码中的 API Key 获取方式：

```typescript
// 当前代码
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

// 建议的修复
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 
                           import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
                           "";
```

## 🚨 常见错误和解决方案

### 错误: "InvalidKeyMapError"
**原因**: 域名不在允许列表中
**解决**: 在 Google Cloud Console 中添加当前域名

### 错误: "RefererNotAllowedMapError"
**原因**: HTTP Referer 不匹配
**解决**: 检查域名限制设置，确保包含所有可能的子域名

### 错误: "QuotaExceededError"
**原因**: API 使用量超出限制
**解决**: 检查计费设置或增加配额

### 错误: "RequestDeniedMapError"
**原因**: API 未启用或权限不足
**解决**: 启用 Maps JavaScript API

## 📞 下一步行动

1. 使用测试工具验证 API Key
2. 检查 Google Cloud Console 设置
3. 更新域名限制
4. 重新部署应用
5. 测试地图功能

如果按照以上步骤操作后问题仍然存在，请提供：
- 测试工具的输出结果
- Google Cloud Console 的 API Key 设置截图
- 浏览器控制台的完整错误信息
