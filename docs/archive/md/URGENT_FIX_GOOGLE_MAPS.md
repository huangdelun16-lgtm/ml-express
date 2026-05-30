# 紧急解决方案：Google Maps API密钥失效

## 🚨 当前状态
API密钥 `YOUR_GOOGLE_MAPS_API_KEY` 显示 InvalidKey 错误。

## 🔧 立即解决步骤

### 选项1：在Google Cloud Console中修复（5分钟）

1. **访问Google Cloud Console**
   - 打开 https://console.cloud.google.com/
   - 进入 **APIs & Services** > **Credentials**

2. **检查API密钥状态**
   - 找到API密钥（以 `AIza` 开头）
   - 确认状态为"启用"（绿色）
   - 如果是"禁用"（灰色），点击启用

3. **检查API启用状态**
   - 进入 **APIs & Services** > **Library**
   - 搜索并确认以下API已启用：
     - Maps JavaScript API ✅
     - Places API ✅
     - Geocoding API ✅

4. **检查域名限制**
   - 编辑API密钥
   - 在 **Application restrictions** 确认包含：
     ```
     *.netlify.app/*
     market-link-express.com/*
     *.market-link-express.com/*
     localhost:*
     ```

5. **检查计费**
   - 确认项目已关联计费账户
   - 确认计费账户状态正常

### 选项2：创建新的API密钥（10分钟）

如果现有密钥无法修复，创建新密钥：

1. **创建密钥**
   - Google Cloud Console > Credentials
   - **CREATE CREDENTIALS** > **API key**
   - 复制新密钥

2. **配置密钥**
   - 点击编辑新创建的密钥
   - **Application restrictions**: HTTP referrers
   - 添加：
     ```
     *
     ```
   - （注意：使用 * 表示无限制，仅用于测试）

3. **启用API**
   - 确保Maps JavaScript API已启用

4. **更新代码**
   - 将新密钥发给我
   - 我会立即更新代码

### 选项3：临时禁用域名限制（1分钟）

**最快的解决方案：**

1. Google Cloud Console > Credentials
2. 编辑现有API密钥
3. **Application restrictions** 改为 **None**
4. 点击 **SAVE**
5. 等待1-2分钟生效
6. 刷新页面测试

⚠️ **注意**：此方案仅用于测试，确认工作后应重新添加域名限制。

## 🎯 我建议

**最快的解决方案是选项3**：
1. 临时移除API密钥的域名限制
2. 测试地图是否能加载
3. 如果可以，说明是域名限制的问题
4. 然后重新配置正确的域名限制

## 📞 需要我做什么？

请告诉我：
1. 您想使用哪个选项？
2. 如果创建了新的API密钥，请告诉我新密钥
3. 我会立即更新代码并部署
