# Google Maps API 配置修复指南

## 问题描述
当前遇到 `Google Maps JavaScript API error: RefererNotAllowedMapError` 错误，这是由于API密钥的HTTP引用者限制配置不正确导致的。

## 解决方案

### 1. 访问Google Cloud Console
1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择你的项目（ML-EXPRESS 或相关项目）
3. 导航到 "APIs & Services" > "Credentials"

### 2. 配置API密钥限制
找到你的Google Maps API密钥，点击编辑：

#### A. Application restrictions (应用程序限制)
选择 "HTTP referrers (web sites)"

#### B. Website restrictions (网站限制)
在 "HTTP referrers" 部分添加以下域名：

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
https://68df6e1e1ee1b676d44eb565--market-link-express.netlify.app/*
https://*.netlify.app/*
```

### 3. API restrictions (API限制)
确保启用以下API：
- Maps JavaScript API
- Maps Embed API
- Geocoding API
- Places API (如果需要)

### 4. 重要注意事项
- HTTP referrers 区分大小写
- 通配符 (*) 只能在域名末尾或子域名中使用
- 确保项目已启用计费账户
- 保存更改后可能需要几分钟生效

### 5. 验证步骤
1. 保存API密钥配置
2. 等待2-5分钟让更改生效
3. 刷新网页测试Google Maps功能
4. 检查浏览器控制台是否还有错误

## 备用方案
如果上述方法不起作用，可以：
1. 创建新的API密钥（无限制，仅用于测试）
2. 检查计费账户是否正常
3. 确认项目配额是否充足