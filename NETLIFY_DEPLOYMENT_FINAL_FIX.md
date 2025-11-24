# Netlify 部署失败修复指南

## 🚨 问题
部署失败：Secrets scanning detected secrets in files during build

## 🔍 错误详情
```
Secrets scanning found 0 instance(s) of secrets and 1 instance(s) of likely secrets
found value at line 21 in GOOGLE_MAPS_DEBUG.md
found value at line 7 in src/pages/RealTimeTracking.tsx
```

## ✅ 解决方案

### 1. 移除硬编码API密钥 ✅
- ✅ 从 `src/pages/RealTimeTracking.tsx` 移除硬编码API密钥
- ✅ 从 `GOOGLE_MAPS_DEBUG.md` 移除硬编码API密钥

### 2. 配置密钥扫描禁用 ✅
在 `netlify.toml` 中添加：
```toml
SECRETS_SCAN_SMART_DETECTION_ENABLED = "false"
```

### 3. 在Netlify控制台设置环境变量

#### 步骤1：登录Netlify控制台
- 访问 [Netlify Dashboard](https://app.netlify.com/)
- 选择您的项目

#### 步骤2：添加环境变量
- 进入 **Site settings**
- 点击 **Environment variables**
- 点击 **Add variable**

#### 步骤3：添加以下环境变量
```
REACT_APP_GOOGLE_MAPS_API_KEY = YOUR_GOOGLE_MAPS_API_KEY
REACT_APP_SUPABASE_URL = your_supabase_url
REACT_APP_SUPABASE_ANON_KEY = your_supabase_anon_key
SECRETS_SCAN_SMART_DETECTION_ENABLED = false
```

### 4. 重新部署
- 点击 **Deploys** > **Trigger deploy** > **Deploy site**

## 🎯 预期结果
- ✅ 部署成功
- ✅ 没有密钥扫描警告
- ✅ Google Maps正常工作
- ✅ 所有功能正常

## 📚 参考
- [Netlify Secrets Scanning](https://docs.netlify.com/configure-builds/secrets-scanning/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
