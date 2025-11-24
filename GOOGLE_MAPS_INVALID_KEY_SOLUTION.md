# Google Maps API 密钥失效解决方案

## 🚨 当前问题
```
Google Maps JavaScript API warning: InvalidKey
```

这说明API密钥 `YOUR_GOOGLE_MAPS_API_KEY` 无效。

## ✅ 解决方案

### 方案1：创建新的API密钥（推荐）

#### 步骤1：访问Google Cloud Console
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目或创建新项目

#### 步骤2：启用必要的API
进入 **APIs & Services** > **Library**，启用以下API：
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API

#### 步骤3：创建API密钥
1. 进入 **APIs & Services** > **Credentials**
2. 点击 **+ CREATE CREDENTIALS**
3. 选择 **API key**
4. 复制新生成的API密钥

#### 步骤4：配置API密钥限制
1. 点击刚创建的API密钥进行编辑
2. 在 **Application restrictions** 中选择 **HTTP referrers (web sites)**
3. 添加以下referrers：
   ```
   localhost:*
   127.0.0.1:*
   *.netlify.app/*
   market-link-express.com/*
   *.market-link-express.com/*
   ```
4. 在 **API restrictions** 中选择 **Restrict key**
5. 选择以下API：
   - Maps JavaScript API
   - Places API
   - Geocoding API
6. 点击 **SAVE**

#### 步骤5：更新代码
将新的API密钥更新到代码中。

### 方案2：检查现有API密钥

#### 检查API密钥状态
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 进入 **APIs & Services** > **Credentials**
3. 找到API密钥：`YOUR_GOOGLE_MAPS_API_KEY`
4. 检查：
   - ✅ 密钥是否启用
   - ✅ 是否有计费问题
   - ✅ API配额是否超限
   - ✅ 域名限制是否正确

### 方案3：临时解决方案（仅用于测试）

创建一个**无限制**的API密钥用于测试：
1. 创建新的API密钥
2. **Application restrictions** 选择 **None**
3. **API restrictions** 选择 **Don't restrict key**
4. 使用此密钥测试地图是否能正常工作
5. 如果可以，说明是域名限制的问题
6. 然后添加正确的域名限制

## 🔧 快速测试

### 测试API密钥是否有效
在浏览器控制台运行：
```javascript
fetch('https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY')
  .then(response => {
    if (response.ok) {
      console.log('✅ API密钥有效');
    } else {
      console.error('❌ API密钥无效:', response.status);
    }
  });
```

## 📋 常见问题

### Q: 为什么会显示InvalidKey？
A: 可能的原因：
1. API密钥已被禁用或删除
2. API密钥的域名限制不包含当前域名
3. 未启用Maps JavaScript API
4. 计费账户有问题
5. API配额已用完

### Q: 如何确认API密钥是否有效？
A: 检查以下几点：
1. API密钥在Google Cloud Console中显示为"启用"
2. 已启用Maps JavaScript API
3. 计费账户正常
4. 配额未超限

### Q: 域名限制应该如何配置？
A: 对于Netlify部署，至少需要添加：
```
*.netlify.app/*
your-domain.com/*
*.your-domain.com/*
```

## 🎯 下一步

1. **立即行动**：创建一个新的Google Maps API密钥
2. **配置限制**：添加正确的域名限制
3. **更新代码**：将新密钥更新到代码中
4. **测试验证**：确认地图能正常加载

## 📞 如果需要帮助

请提供以下信息：
1. Google Cloud Console中API密钥的状态
2. 是否启用了Maps JavaScript API
3. 是否有计费账户
4. 当前的域名限制配置
