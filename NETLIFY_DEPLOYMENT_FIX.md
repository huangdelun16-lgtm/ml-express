# Netlify 部署修复指南

## 🚨 问题原因
Netlify部署失败是因为检测到了硬编码的Google API密钥，这被认为是安全风险。

## ✅ 解决方案

### 1. 移除硬编码API密钥
已完成的修改：
- ✅ `src/pages/HomePage.tsx` - 移除硬编码API密钥
- ✅ `src/pages/DeliveryStoreManagement.tsx` - 移除硬编码API密钥  
- ✅ `src/pages/DeliveryStoreManagementBackup.tsx` - 移除硬编码API密钥
- ✅ `ml-express-mobile-app/app.json` - 使用环境变量
- ✅ `courier-app/app.json` - 使用环境变量

### 2. 配置Netlify环境变量

#### 步骤1：登录Netlify控制台
1. 访问 [Netlify Dashboard](https://app.netlify.com/)
2. 选择你的项目

#### 步骤2：添加环境变量
1. 进入 **Site settings**
2. 点击 **Environment variables**
3. 点击 **Add variable**

#### 步骤3：添加以下环境变量
```
REACT_APP_GOOGLE_MAPS_API_KEY = YOUR_GOOGLE_MAPS_API_KEY
REACT_APP_SUPABASE_URL = your_supabase_url
REACT_APP_SUPABASE_ANON_KEY = your_supabase_anon_key
```

### 3. 重新部署
1. 在Netlify控制台中点击 **Deploys**
2. 点击 **Trigger deploy** > **Deploy site**
3. 或者推送代码到Git仓库触发自动部署

## 🔧 本地开发配置

### 创建 .env 文件
在项目根目录创建 `.env` 文件：
```bash
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 移动应用配置
对于Expo应用，创建 `.env` 文件：
```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛡️ 安全最佳实践

### 1. 永远不要提交敏感信息
- ✅ `.env` 文件已添加到 `.gitignore`
- ✅ 硬编码API密钥已移除
- ✅ 使用环境变量管理敏感信息

### 2. API密钥管理
- 🔑 定期轮换API密钥
- 🔑 限制API密钥的使用范围
- 🔑 监控API使用情况

### 3. 环境分离
- 🏠 开发环境：使用本地 `.env` 文件
- 🌐 生产环境：使用Netlify环境变量
- 📱 移动应用：使用Expo环境变量

## 📋 检查清单

- [ ] 移除所有硬编码API密钥
- [ ] 创建 `.env` 文件（本地开发）
- [ ] 在Netlify添加环境变量
- [ ] 测试本地开发环境
- [ ] 重新部署到Netlify
- [ ] 验证生产环境功能

## 🎯 预期结果

完成以上步骤后：
- ✅ Netlify部署成功
- ✅ Google Maps功能正常
- ✅ 没有安全警告
- ✅ 环境变量正确配置

## 🆘 故障排除

### 如果部署仍然失败：
1. 检查环境变量名称是否正确
2. 确认API密钥有效
3. 查看Netlify构建日志
4. 验证代码中没有遗漏的硬编码密钥

### 如果Google Maps不工作：
1. 检查API密钥权限
2. 确认域名已添加到API密钥限制
3. 验证环境变量是否正确加载
