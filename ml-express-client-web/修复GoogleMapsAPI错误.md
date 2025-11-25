# 修复 Google Maps API 错误指南

## 🔴 问题描述

客户端 web 在下单时出现以下错误：
- **错误信息**：`地图服务配置错误,使用默认距离:5km`
- **控制台错误**：`Distance Matrix Service: This API key is not authorized to use this service or API`
- **状态**：`REQUEST_DENIED`

## 🔍 问题原因

Google Maps API Key 没有启用 **Distance Matrix API**，导致无法计算两个地址之间的距离。

## ✅ 解决方案

### 步骤 1：登录 Google Cloud Console

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择你的项目（或创建新项目）

### 步骤 2：启用 Distance Matrix API

1. 在左侧菜单中，点击 **"API 和服务"** → **"库"**（或直接访问：https://console.cloud.google.com/apis/library）
2. 在搜索框中输入 **"Distance Matrix API"**
3. 点击 **"Distance Matrix API"**
4. 点击 **"启用"** 按钮

### 步骤 3：检查 API Key 限制（重要）

1. 在左侧菜单中，点击 **"API 和服务"** → **"凭据"**（或直接访问：https://console.cloud.google.com/apis/credentials）
2. 找到你的 API Key：`AIzaSyBQXxGLGseV9D0tXs01IaZlim6yksYG3mM`
3. 点击 API Key 名称进入编辑页面
4. 在 **"API 限制"** 部分：
   - 如果选择了 **"限制密钥"**，确保已勾选以下 API：
     - ✅ **Distance Matrix API**
     - ✅ **Maps JavaScript API**（用于显示地图）
     - ✅ **Places API**（用于地址自动完成）
   - 如果选择了 **"不限制密钥"**，则所有 API 都已启用

### 步骤 4：检查计费设置

1. 在左侧菜单中，点击 **"结算"**（或直接访问：https://console.cloud.google.com/billing）
2. 确保已关联有效的结算账户
3. Google Maps API 需要启用计费才能使用（有免费额度）

### 步骤 5：验证修复

1. 等待 1-2 分钟让 API 设置生效
2. 刷新客户端 web 页面（按 `Ctrl+F5` 强制刷新）
3. 尝试下单，检查是否还有错误

## 📋 需要启用的 API 列表

确保以下 API 都已启用：

1. ✅ **Maps JavaScript API** - 用于显示地图
2. ✅ **Places API** - 用于地址自动完成
3. ✅ **Distance Matrix API** - 用于计算距离（**这是当前缺失的**）
4. ✅ **Geocoding API** - 用于地址解析（可选，但推荐）

## 🔧 快速检查清单

- [ ] Distance Matrix API 已启用
- [ ] API Key 限制中包含了 Distance Matrix API
- [ ] 结算账户已关联并启用
- [ ] 已等待 1-2 分钟让设置生效
- [ ] 已刷新浏览器页面

## ⚠️ 注意事项

1. **API 限制**：如果设置了 API Key 限制，必须明确添加 Distance Matrix API 到允许列表中
2. **计费**：Distance Matrix API 需要启用计费，但有免费额度（每月前 40,000 次请求免费）
3. **生效时间**：API 设置更改后可能需要几分钟才能生效
4. **浏览器缓存**：如果问题仍然存在，尝试清除浏览器缓存或使用无痕模式

## 🐛 如果问题仍然存在

### 检查 1：验证 API Key 是否正确

在浏览器控制台中运行：
```javascript
console.log('API Key:', 'AIzaSyBQXxGLGseV9D0tXs01IaZlim6yksYG3mM');
```

### 检查 2：测试 API Key 是否有效

访问以下 URL（替换 YOUR_API_KEY）：
```
https://maps.googleapis.com/maps/api/distancematrix/json?origins=Washington,DC&destinations=New+York+City,NY&key=YOUR_API_KEY
```

如果返回 `REQUEST_DENIED`，说明 API Key 配置有问题。

### 检查 3：查看 Google Cloud Console 中的 API 使用情况

1. 在 Google Cloud Console 中，点击 **"API 和服务"** → **"仪表板"**
2. 查看 Distance Matrix API 的使用情况
3. 如果有错误，会显示具体的错误信息

## 📞 需要帮助？

如果按照以上步骤操作后问题仍然存在，请检查：
1. API Key 是否属于正确的项目
2. 项目是否启用了计费
3. API 配额是否已用完
4. 是否有其他限制（如 IP 限制、HTTP 引用限制等）

