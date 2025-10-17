# Google Maps API Key 使用限制错误诊断和修复

## 🚨 常见的使用限制错误类型

### 1. InvalidKeyMapError
**错误信息**: `Google Maps JavaScript API error: InvalidKeyMapError`
**原因**: API Key 无效、过期或未正确配置
**解决方案**:
- 检查 API Key 是否正确复制
- 确认 API Key 在 Google Cloud Console 中状态为"启用"
- 重新生成新的 API Key

### 2. RefererNotAllowedMapError
**错误信息**: `Google Maps JavaScript API error: RefererNotAllowedMapError`
**原因**: 当前域名不在 API Key 的允许列表中
**解决方案**:
- 在 Google Cloud Console 中添加当前域名到 HTTP referrers
- 添加以下域名:
  ```
  https://market-link-express.com/*
  https://www.market-link-express.com/*
  https://market-link-express.netlify.app/*
  https://localhost/*
  ```

### 3. QuotaExceededError
**错误信息**: `Google Maps JavaScript API error: QuotaExceededError`
**原因**: API 使用量超出配额限制
**解决方案**:
- 检查 Google Cloud Console 中的配额使用情况
- 增加配额限制或等待配额重置
- 检查是否有异常的 API 调用

### 4. RequestDeniedMapError
**错误信息**: `Google Maps JavaScript API error: RequestDeniedMapError`
**原因**: API 未启用或权限不足
**解决方案**:
- 启用 Maps JavaScript API
- 启用 Places API (如果需要)
- 启用 Geocoding API (如果需要)

### 5. BillingNotEnabledError
**错误信息**: `Google Maps JavaScript API error: BillingNotEnabledError`
**原因**: 计费账户未启用或无效
**解决方案**:
- 检查 Google Cloud Console 中的计费设置
- 确认计费账户状态正常
- 添加有效的付款方式

## 🔧 快速修复步骤

### 步骤 1: 使用诊断工具
1. 在浏览器中打开 `api-key-restrictions-checker.html`
2. 输入您的 API Key
3. 点击"检查 API Key 限制"
4. 查看详细的检查结果

### 步骤 2: 检查 Google Cloud Console
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目
3. 进入 "APIs & Services" → "Credentials"
4. 找到您的 API Key，点击编辑

### 步骤 3: 配置域名限制
在 "Application restrictions" 部分:
1. 选择 "HTTP referrers (websites)"
2. 添加以下域名:
   ```
   https://market-link-express.com/*
   https://www.market-link-express.com/*
   https://market-link-express.netlify.app/*
   https://localhost/*
   https://127.0.0.1/*
   ```

### 步骤 4: 启用必要的 API
进入 "APIs & Services" → "Library"，启用:
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API

### 步骤 5: 检查计费账户
1. 进入 "Billing" 页面
2. 确认计费账户状态正常
3. 检查是否有有效的付款方式

## 🧪 测试方法

### 方法 1: 浏览器控制台测试
```javascript
// 检查环境变量
console.log('API Key:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY);

// 测试 API Key
fetch('https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY')
  .then(response => console.log('API Key test:', response.ok))
  .catch(error => console.error('API Key error:', error));
```

### 方法 2: 使用测试页面
1. 打开 `test-google-maps.html`
2. 输入您的 API Key
3. 点击"测试 API Key"
4. 查看地图是否正常加载

## 📞 紧急解决方案

如果上述方法都不起作用，可以尝试:

### 临时解决方案 (仅用于测试)
1. 在 Google Cloud Console 中编辑 API Key
2. 将 "Application restrictions" 改为 "None"
3. 将 "API restrictions" 改为 "Don't restrict key"
4. 保存并等待 1-2 分钟生效
5. 刷新页面测试

⚠️ **注意**: 此方案仅用于测试，确认工作后应重新添加限制。

## 🎯 预期结果

修复完成后，您应该看到:
- ✅ Google Maps 正常加载
- ✅ 地图显示正常
- ✅ 快递员位置标记显示
- ✅ 地图交互功能正常
- ✅ 控制台无错误信息

## 📋 检查清单

- [ ] API Key 格式正确 (以 AIza 开头，35+ 字符)
- [ ] API Key 在 Google Cloud Console 中状态为"启用"
- [ ] 域名限制包含当前访问的域名
- [ ] Maps JavaScript API 已启用
- [ ] 计费账户状态正常
- [ ] API 配额充足
- [ ] Netlify 环境变量设置正确
