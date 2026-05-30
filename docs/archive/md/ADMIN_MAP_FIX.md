# 🗺️ 后台管理Web实时跟踪管理页面地图修复指南

## ❌ 问题描述
后台管理Web中的"实时跟踪管理"页面的地图无法打开。

## 🔍 问题原因
1. Google Maps API Key 配置不一致
2. 环境变量可能未正确配置
3. API Key 可能无效或过期

## ✅ 已完成的修复

### 1. 统一 API Key 配置
- 更新了 `src/pages/RealTimeTracking.tsx` 中的默认 API Key
- 与 `vercel.json` 中的配置保持一致：`AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c`

### 2. 改进错误处理
- 添加了更详细的错误提示信息
- 添加了 API Key 验证和日志输出
- 修复了 CSS 错误（`#fffbe B` → `#fffbeB`）

### 3. 增强诊断功能
- 在控制台输出 API Key 加载状态
- 显示更友好的错误提示

## 🔧 如果问题仍然存在

### 检查 Vercel 环境变量配置

如果后台管理Web部署在 **Vercel** 上：

1. **访问 Vercel Dashboard**
   - 登录：https://vercel.com/dashboard
   - 找到项目：`market-link-express` 或您的项目名称

2. **检查环境变量**
   - 进入项目 → **Settings** → **Environment Variables**
   - 确认以下变量已配置：
     - `REACT_APP_GOOGLE_MAPS_API_KEY`
     - `REACT_APP_SUPABASE_URL`
     - `REACT_APP_SUPABASE_ANON_KEY`

3. **验证 API Key 值**
   - 确认 `REACT_APP_GOOGLE_MAPS_API_KEY` 的值是：`AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c`
   - 或者使用其他有效的 Google Maps API Key

4. **重新部署**
   - 在 Vercel Dashboard 中点击 **Deployments**
   - 找到最新部署，点击 **Redeploy**

### 检查 Netlify 环境变量配置

如果后台管理Web部署在 **Netlify** 上：

1. **访问 Netlify Dashboard**
   - 登录：https://app.netlify.com
   - 找到项目

2. **检查环境变量**
   - 进入项目 → **Site settings** → **Environment variables**
   - 确认已配置：`REACT_APP_GOOGLE_MAPS_API_KEY`

3. **重新部署**
   - 在 **Deploys** 标签页点击 **Trigger deploy** → **Deploy site**

## 🔍 诊断步骤

### 1. 检查浏览器控制台
打开浏览器开发者工具（F12），查看 Console 标签：
- 查找 Google Maps 相关的错误信息
- 查找 API Key 加载状态日志

### 2. 检查网络请求
在 Network 标签中：
- 查找 Google Maps API 的请求
- 检查请求是否返回错误

### 3. 验证 API Key 有效性
访问以下URL（替换 YOUR_API_KEY）：
```
https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places
```

如果返回错误，说明 API Key 无效或已过期。

## 📝 当前配置

### vercel.json 中的配置
```json
{
  "env": {
    "REACT_APP_GOOGLE_MAPS_API_KEY": "AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c"
  }
}
```

### 代码中的默认值
```typescript
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c";
```

## ⚠️ 注意事项

1. **API Key 限制**：确保 Google Maps API Key 已启用以下 API：
   - Maps JavaScript API
   - Places API
   - Geocoding API

2. **域名限制**：如果 API Key 设置了域名限制，确保部署域名已添加到允许列表

3. **配额限制**：检查 Google Cloud Console 中的 API 配额是否已用完

## 🆘 如果问题持续存在

1. **检查 Google Cloud Console**
   - 访问：https://console.cloud.google.com
   - 检查 API Key 状态
   - 检查 API 是否已启用
   - 检查配额和限制

2. **联系技术支持**
   - 电话：(+95) 09788848928 / (+95) 09259369349
   - 邮箱：marketlink982@gmail.com

3. **查看详细日志**
   - 浏览器控制台（F12）
   - Vercel/Netlify 构建日志
   - 部署日志中的错误信息

