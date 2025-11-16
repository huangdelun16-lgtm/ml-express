# 🔧 Google Maps API Key 域名限制修复指南

## ❌ 错误信息
```
Google Maps JavaScript API error: RefererNotAllowedMapError
Your site URL to be authorized: https://admin-market-link-express.com
```

## 🔍 问题原因
后台管理Web的域名 `https://admin-market-link-express.com` 没有被添加到 Google Maps API Key 的允许引用者列表中。

**注意**：客户端Web和骑手App可以正常使用，说明它们使用的域名已经在允许列表中，但后台管理Web的域名还没有添加。

## ✅ 解决步骤

### 1. 登录 Google Cloud Console
访问：https://console.cloud.google.com

### 2. 选择项目
- 在顶部选择正确的项目（通常是包含 "ml-express" 或 "market-link-express" 的项目）

### 3. 进入 API 和服务 → 凭据
1. 在左侧菜单中找到 **"API 和服务"** (APIs & Services)
2. 点击 **"凭据"** (Credentials)

### 4. 找到使用的 API Key
根据代码配置，后台管理Web使用的 API Key 是：
- **API Key**: `AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c`

在凭据列表中找到这个 API Key，点击名称进入编辑页面。

### 5. 添加域名限制
1. 在 **"应用限制"** (Application restrictions) 部分：
   - 选择 **"HTTP 引荐来源网址（网站）"** (HTTP referrers (web sites))

2. 在 **"网站限制"** (Website restrictions) 部分：
   - 点击 **"添加项目"** (Add item)
   - 添加以下域名：

#### 需要添加的域名：
```
https://admin-market-link-express.com/*
https://admin-market-link-express.com
http://admin-market-link-express.com/*
http://admin-market-link-express.com
```

**或者使用通配符（推荐）**：
```
https://admin-market-link-express.com/*
```

### 6. 保存更改
- 点击页面底部的 **"保存"** (Save) 按钮
- 等待几秒钟让更改生效（通常立即生效，最多可能需要几分钟）

### 7. 验证修复
1. 清除浏览器缓存（Ctrl+Shift+Delete 或 Cmd+Shift+Delete）
2. 刷新后台管理Web页面
3. 打开"实时跟踪管理"页面
4. 检查地图是否正常加载

## 📋 完整的域名列表（建议全部添加）

为了确保所有相关域名都能正常工作，建议添加以下所有域名：

### 后台管理Web
```
https://admin-market-link-express.com/*
https://admin-market-link-express.com
```

### 客户端Web（如果使用不同的API Key）
```
https://market-link-express.com/*
https://market-link-express.com
```

### 开发环境（可选）
```
http://localhost:3000/*
http://localhost:3001/*
http://127.0.0.1:3000/*
http://127.0.0.1:3001/*
```

## 🔍 如何确认当前使用的 API Key

### 方法1：查看代码
- 后台管理Web：`src/pages/RealTimeTracking.tsx` 第11行
- 或查看 `vercel.json` 中的环境变量配置

### 方法2：查看浏览器控制台
1. 打开后台管理Web页面
2. 按 F12 打开开发者工具
3. 查看 Console 标签中的错误信息
4. 错误信息会显示需要授权的域名

### 方法3：查看网络请求
1. 打开开发者工具 → Network 标签
2. 刷新页面
3. 查找 Google Maps API 的请求
4. 查看请求URL中的 `key` 参数

## ⚠️ 重要注意事项

### 1. API Key 限制类型
确保选择的是 **"HTTP 引荐来源网址（网站）"** (HTTP referrers)，而不是：
- ❌ IP 地址
- ❌ Android 应用
- ❌ iOS 应用

### 2. 域名格式
- ✅ 正确：`https://admin-market-link-express.com/*`
- ✅ 正确：`https://admin-market-link-express.com`
- ❌ 错误：`admin-market-link-express.com`（缺少协议）
- ❌ 错误：`https://admin-market-link-express.com/`（末尾斜杠）

### 3. 通配符使用
- `https://admin-market-link-express.com/*` - 匹配所有路径
- `https://admin-market-link-express.com` - 只匹配根路径

### 4. 多个 API Key
如果客户端Web和后台管理Web使用不同的 API Key：
- 需要分别为每个 API Key 添加对应的域名限制
- 确保每个 API Key 都有正确的域名限制

## 🔄 如果问题仍然存在

### 1. 检查 API Key 是否正确
- 确认后台管理Web使用的 API Key 是 `AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c`
- 如果使用了不同的 API Key，需要找到正确的 API Key 并添加域名限制

### 2. 清除缓存
- 清除浏览器缓存
- 清除 Vercel/Netlify 的构建缓存
- 重新部署网站

### 3. 检查 API 是否启用
在 Google Cloud Console 中确认以下 API 已启用：
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API

### 4. 检查配额
- 确认 API 配额未用完
- 检查是否有配额限制

## 📞 需要帮助？

如果问题持续存在，请联系：
- 电话：(+95) 09788848928 / (+95) 09259369349
- 邮箱：marketlink982@gmail.com

## 🎯 快速检查清单

- [ ] 已登录 Google Cloud Console
- [ ] 已选择正确的项目
- [ ] 已找到 API Key：`AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c`
- [ ] 已选择"HTTP 引荐来源网址（网站）"限制类型
- [ ] 已添加域名：`https://admin-market-link-express.com/*`
- [ ] 已保存更改
- [ ] 已清除浏览器缓存
- [ ] 已刷新页面
- [ ] 地图已正常加载

