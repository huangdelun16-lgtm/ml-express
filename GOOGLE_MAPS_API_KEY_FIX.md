# Google Maps API Key 配置指南

## 问题描述
当前Google Maps API Key `YOUR_GOOGLE_MAPS_API_KEY` 可能无效或配置不正确，导致地图加载失败。

## 解决方案

### 1. 创建新的Google Maps API Key

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择或创建项目
3. 启用以下API：
   - Maps JavaScript API
   - Maps Embed API
   - Geocoding API
   - Places API (可选)

### 2. 配置API Key限制

#### A. Application restrictions (应用程序限制)
选择 "HTTP referrers (web sites)"

#### B. Website restrictions (网站限制)
添加以下域名：

**本地开发环境：**
```
http://localhost:3000/*
http://localhost/*
localhost:3000/*
localhost/*
```

**生产环境：**
```
https://market-link-express.com/*
https://*.market-link-express.com/*
https://*.netlify.app/*
https://68e13da28dcb2e0008664abb--market-link-express.netlify.app/*
```

### 3. 更新代码中的API Key

将新的API Key替换代码中的 `YOUR_GOOGLE_MAPS_API_KEY`

**需要更新的文件：**
- `src/pages/HomePage.tsx`
- `src/pages/DeliveryStoreManagement.tsx`
- `src/pages/TrackingPage.tsx`

### 4. 环境变量配置

创建 `.env.local` 文件：
```
REACT_APP_GOOGLE_MAPS_API_KEY=你的新API_KEY
```

### 5. Netlify环境变量

在Netlify控制台中添加环境变量：
- Key: `REACT_APP_GOOGLE_MAPS_API_KEY`
- Value: 你的新API_KEY

### 6. 验证步骤

1. 保存API Key配置
2. 等待2-5分钟让更改生效
3. 刷新网页测试Google Maps功能
4. 检查浏览器控制台是否还有错误

## 备用方案

如果上述方法不起作用，可以：
1. 创建新的API密钥（无限制，仅用于测试）
2. 检查计费账户是否正常
3. 确认项目配额是否充足

## 常见错误

- `RefererNotAllowedMapError`: HTTP referrers限制配置不正确
- `InvalidKeyMapError`: API Key无效或未启用相关服务
- `QuotaExceededError`: 超出API配额限制
