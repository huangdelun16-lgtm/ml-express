# Netlify 环境变量设置指南

## 🎯 API密钥已确认
您的API密钥：`AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY`
Google Cloud Console域名限制已正确配置 ✅

## 🔧 下一步：设置Netlify环境变量

### 步骤1：登录Netlify控制台
1. 访问 [Netlify Dashboard](https://app.netlify.com/)
2. 选择您的项目

### 步骤2：添加环境变量
1. 进入 **Site settings**
2. 点击 **Environment variables**
3. 点击 **Add variable**

### 步骤3：添加以下环境变量

#### 必需的环境变量：
```
REACT_APP_GOOGLE_MAPS_API_KEY = AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY
SECRETS_SCAN_SMART_DETECTION_ENABLED = false
```

#### 可选的环境变量（如果有的话）：
```
REACT_APP_SUPABASE_URL = your_supabase_url
REACT_APP_SUPABASE_ANON_KEY = your_supabase_anon_key
```

### 步骤4：重新部署
1. 点击 **Deploys** 标签
2. 点击 **Trigger deploy** > **Deploy site**
3. 等待部署完成

## 🧪 测试步骤

### 1. 检查环境变量是否正确设置
部署完成后，在浏览器控制台运行：
```javascript
console.log('API Key:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
```

### 2. 使用测试页面
访问：`https://market-link-express.com/test-google-maps-api.html`
- 点击"测试API密钥"按钮
- 点击"加载地图"按钮

### 3. 检查地图页面
访问：`https://market-link-express.com/admin/tracking`
- 查看地图是否正常加载
- 检查控制台是否有错误

## 🎯 预期结果
- ✅ 环境变量正确设置
- ✅ API密钥测试通过
- ✅ 地图正常加载
- ✅ 快递员位置标记显示

## 🚨 如果仍然有问题

### 检查API密钥权限
在Google Cloud Console中确认启用了：
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API

### 检查API配额
- 确认API配额未超限
- 检查是否有计费问题

### 检查域名匹配
确保访问的域名在限制列表中：
- `market-link-express.com` ✅
- `*.netlify.app` ✅
