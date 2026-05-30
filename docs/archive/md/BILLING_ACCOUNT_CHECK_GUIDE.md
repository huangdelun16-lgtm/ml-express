# Google Cloud 计费账号检查指南

## 🚨 为什么需要计费账号？

Google Maps API **必须**关联有效的计费账号才能正常工作，即使使用免费配额也是如此。

## 🔍 快速检查方法

### 方法 1: 使用检查工具
1. 在浏览器中打开 `billing-account-checker.html`
2. 输入您的 Google Maps API Key
3. 点击"检查计费账号状态"
4. 查看详细的检查结果

### 方法 2: 手动检查 Google Cloud Console

#### 步骤 1: 访问计费页面
1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目
3. 在左侧菜单中找到 **"Billing"** (计费)
4. 点击进入

#### 步骤 2: 检查计费账号状态
查看以下信息：
- ✅ **计费账号状态**: 应为 "Active" (活跃)
- ✅ **付款方式**: 应有有效的信用卡
- ✅ **余额**: 不应显示欠费
- ✅ **项目关联**: 确认当前项目已关联计费账号

#### 步骤 3: 检查 API 配额
1. 进入 **"APIs & Services"** → **"Quotas"**
2. 搜索 "Maps JavaScript API"
3. 查看配额使用情况
4. 确认没有超出限制

## 🛠️ 常见问题解决方案

### 问题 1: 没有计费账号
**症状**: 页面显示 "Link a billing account"
**解决**:
1. 点击 "Link a billing account"
2. 创建新的计费账号
3. 添加有效的付款方式 (信用卡)
4. 等待 1-2 分钟生效

### 问题 2: 计费账号被暂停
**症状**: 计费账号状态显示 "Suspended" 或 "Paused"
**解决**:
1. 检查付款方式是否过期
2. 更新信用卡信息
3. 联系 Google Cloud 支持
4. 等待账号恢复

### 问题 3: 配额超出限制
**症状**: API 调用返回 "QuotaExceededError"
**解决**:
1. 检查 API 使用量
2. 增加配额限制
3. 优化 API 调用频率
4. 等待配额重置 (每月 1 日)

### 问题 4: 项目未关联计费账号
**症状**: 项目显示 "No billing account"
**解决**:
1. 在计费页面点击 "Link a billing account"
2. 选择现有的计费账号
3. 或创建新的计费账号

## 📊 Google Maps API 计费信息

### 免费配额 (每月)
- **Maps JavaScript API**: 28,000 次地图加载
- **Places API**: 1,000 次请求
- **Geocoding API**: 40,000 次请求
- **Directions API**: 2,500 次请求

### 超出免费配额后的费用
- **Maps JavaScript API**: $7/1,000 次加载
- **Places API**: $17/1,000 次请求
- **Geocoding API**: $5/1,000 次请求

## 🧪 测试计费账号状态

### 浏览器控制台测试
```javascript
// 测试 API Key 和计费状态
fetch('https://maps.googleapis.com/maps/api/geocode/json?address=test&key=YOUR_API_KEY')
  .then(response => response.json())
  .then(data => {
    if (data.error_message) {
      console.log('错误信息:', data.error_message);
      if (data.error_message.includes('billing')) {
        console.log('❌ 计费账号问题');
      } else if (data.error_message.includes('quota')) {
        console.log('⚠️ 配额问题');
      } else if (data.error_message.includes('key')) {
        console.log('❌ API Key 问题');
      }
    } else {
      console.log('✅ API 和计费账号正常');
    }
  })
  .catch(error => console.error('网络错误:', error));
```

## 🎯 检查清单

- [ ] 项目已关联计费账号
- [ ] 计费账号状态为 "Active"
- [ ] 付款方式有效且未过期
- [ ] 没有欠费或限制
- [ ] API 配额充足
- [ ] Maps JavaScript API 已启用
- [ ] 域名限制配置正确

## 📞 如果问题仍然存在

1. **使用检查工具**: 打开 `billing-account-checker.html` 进行详细诊断
2. **联系 Google Cloud 支持**: 如果计费账号问题无法自行解决
3. **检查项目设置**: 确认项目配置正确
4. **重新创建计费账号**: 如果现有账号有问题

## ⚠️ 重要提醒

- Google Maps API 的免费配额**必须**关联计费账号
- 即使不超出免费配额，也需要有效的付款方式
- 计费账号问题会导致所有 Google Maps API 调用失败
- 设置计费账号后需要等待 1-2 分钟才能生效
