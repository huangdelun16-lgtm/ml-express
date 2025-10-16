# Google Maps API 临时配置

## 问题诊断
地图无法加载的可能原因：
1. Google Maps API密钥未正确配置
2. API密钥权限不足
3. 域名限制问题
4. API配额超限

## 临时解决方案

### 1. 检查环境变量
在浏览器控制台查看：
```javascript
console.log('API Key:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
```

### 2. 临时硬编码测试
如果环境变量有问题，可以临时硬编码测试：
```typescript
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";
```

### 3. 检查API密钥权限
确保API密钥启用了以下服务：
- Maps JavaScript API
- Places API
- Geocoding API

### 4. 检查域名限制
在Google Cloud Console中检查：
- HTTP referrers (web sites)
- 添加: *.netlify.app/*
- 添加: market-link-express.com/*

## 调试步骤
1. 打开浏览器开发者工具
2. 查看Console标签页的错误信息
3. 查看Network标签页的API请求
4. 检查是否有CORS或权限错误
