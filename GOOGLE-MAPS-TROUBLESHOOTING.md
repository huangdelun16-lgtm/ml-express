# Google Maps API 问题快速诊断指南

## 🚨 当前问题
即使已付费，Google Maps仍然显示"加载中"状态。

## 🔍 立即检查步骤

### 1. 检查Google Cloud Console设置

**登录Google Cloud Console:**
1. 访问 [console.cloud.google.com](https://console.cloud.google.com)
2. 选择您的项目

**检查API状态:**
1. 导航到 "API和服务" → "信息中心"
2. 确保以下API显示为"已启用"：
   - ✅ Maps JavaScript API
   - ✅ Geocoding API
   - ✅ Places API

**检查API密钥:**
1. 导航到 "API和服务" → "凭据"
2. 点击您的API密钥
3. 检查"应用限制"：
   - **HTTP引用者**: 添加您的域名
   - 例如: `*.netlify.app`, `*.yourdomain.com`
4. 检查"API限制"：确保Maps API已启用

### 2. 检查计费状态

**确认付费设置:**
1. 导航到 "结算" → "账户管理"
2. 确认计费账户状态为"活跃"
3. 检查是否有付款问题

**查看使用量:**
1. 导航到 "API和服务" → "信息中心"
2. 查看Maps JavaScript API的使用量
3. 确认没有超出配额

### 3. 常见问题解决方案

**问题1: API密钥域名限制**
```
解决方案: 在API密钥设置中添加您的域名
- 添加: *.netlify.app
- 添加: your-site-name.netlify.app
- 添加: localhost (用于本地测试)
```

**问题2: API未启用**
```
解决方案: 在API和服务中启用以下API
- Maps JavaScript API
- Geocoding API
- Places API
```

**问题3: 计费问题**
```
解决方案: 检查Google Cloud Console
- 确认计费账户已启用
- 添加有效的付款方式
- 检查是否有付款失败
```

**问题4: 网络问题**
```
解决方案: 
- 清除浏览器缓存
- 尝试不同的网络
- 检查防火墙设置
```

## 🛠️ 临时解决方案

如果Google Maps API仍有问题，您可以使用以下备用方案：

### 方案1: 手动输入坐标
1. 点击"📍 手动输入坐标"
2. 输入纬度和经度
3. 例如: 纬度 21.9588, 经度 96.0891

### 方案2: 选择预设位置
1. 点击"🏙️ 选择预设位置"
2. 选择曼德勒、仰光或内比都
3. 系统会自动填入坐标

### 方案3: 获取坐标的方法
**从Google Maps获取坐标:**
1. 打开 [maps.google.com](https://maps.google.com)
2. 搜索您的位置
3. 右键点击位置
4. 选择坐标（纬度, 经度）

## 📞 技术支持

**如果问题持续存在:**
1. 检查浏览器控制台错误信息
2. 联系Google Cloud支持
3. 使用备用方案继续工作

**紧急联系:**
- Google Cloud支持: [cloud.google.com/support](https://cloud.google.com/support)
- 社区论坛: [stackoverflow.com](https://stackoverflow.com)

## ⚡ 快速测试

**测试API是否工作:**
1. 访问测试页面: `https://您的域名/test-maps-api.html`
2. 查看测试结果
3. 根据结果调整设置

---

**注意**: 即使Google Maps API有问题，您仍然可以使用手动输入坐标的方式继续使用快递店管理功能。
