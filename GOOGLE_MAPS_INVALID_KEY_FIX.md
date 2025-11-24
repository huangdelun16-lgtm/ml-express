# Google Maps InvalidKeyMapError 修复指南

## 🚨 问题
Google Maps显示"Oops! Something went wrong"错误
控制台显示：`InvalidKeyMapError`

## 🔍 问题原因
Google Maps API密钥无效或未正确配置

## ✅ 解决方案

### 1. 检查Netlify环境变量设置

#### 步骤1：登录Netlify控制台
- 访问 [Netlify Dashboard](https://app.netlify.com/)
- 选择您的项目

#### 步骤2：检查环境变量
- 进入 **Site settings**
- 点击 **Environment variables**
- 确认以下变量存在且正确：

```
REACT_APP_GOOGLE_MAPS_API_KEY = YOUR_GOOGLE_MAPS_API_KEY
SECRETS_SCAN_SMART_DETECTION_ENABLED = false
```

### 2. 验证API密钥权限

#### 在Google Cloud Console中检查：
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目
3. 进入 **APIs & Services** > **Credentials**
4. 找到您的API密钥
5. 确保启用了以下API：
   - ✅ Maps JavaScript API
   - ✅ Places API
   - ✅ Geocoding API

### 3. 检查API密钥限制

#### HTTP referrers (web sites) 限制：
确保添加了以下域名：
```
*.netlify.app/*
market-link-express.com/*
localhost:*
127.0.0.1:*
```

### 4. 临时测试方案

如果环境变量有问题，可以临时测试：

#### 在浏览器控制台测试：
```javascript
// 检查环境变量
console.log('API Key:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY);

// 测试API密钥
fetch(`https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`)
  .then(response => console.log('API Key test:', response.ok))
  .catch(error => console.error('API Key error:', error));
```

### 5. 重新部署

修改环境变量后：
1. 点击 **Deploys** > **Trigger deploy** > **Deploy site**
2. 等待部署完成
3. 刷新页面测试

## 🎯 预期结果
- ✅ Google Maps正常加载
- ✅ 地图显示正常
- ✅ 快递员位置标记显示
- ✅ 地图交互功能正常

## 📚 参考
- [Google Maps API Error Messages](https://developers.google.com/maps/documentation/javascript/error-messages#invalid-key-map-error)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
