# 🔧 生产环境登录问题修复指南

## 📋 问题说明

从 Google Play Store 下载的 APK 登录时显示："用户名或密码错误, 或账号已被停用"

**根本原因**：EAS Build 生产环境缺少必要的环境变量配置。

## ✅ 解决方案

### 步骤 1: 检查并配置 EAS Secrets

登录功能需要以下环境变量：

1. **EXPO_PUBLIC_SUPABASE_URL** - Supabase 项目 URL
2. **EXPO_PUBLIC_SUPABASE_ANON_KEY** - Supabase Anon Key
3. **EXPO_PUBLIC_NETLIFY_URL** - Netlify Function URL（用于密码验证）
4. **EXPO_PUBLIC_GOOGLE_MAPS_API_KEY** - Google Maps API Key（已配置）

### 步骤 2: 添加缺失的环境变量到 EAS Secrets

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app

# 设置 Expo Token（如果还没有）
export EXPO_TOKEN="your-token-here"

# 添加 Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://uopkyuluxnrewvlmutam.supabase.co" --type string

# 添加 Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-supabase-anon-key" --type string

# 添加 Netlify URL
eas secret:create --scope project --name EXPO_PUBLIC_NETLIFY_URL --value "https://admin-market-link-express.com" --type string
```

**注意**：请将 `your-supabase-anon-key` 替换为实际的 Supabase Anon Key。

### 步骤 3: 更新 eas.json 配置

更新 `eas.json` 文件，确保所有环境变量都在生产构建中配置：

```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "${EXPO_PUBLIC_SUPABASE_URL}",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "${EXPO_PUBLIC_SUPABASE_ANON_KEY}",
        "EXPO_PUBLIC_NETLIFY_URL": "${EXPO_PUBLIC_NETLIFY_URL}",
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}"
      }
    }
  }
}
```

### 步骤 4: 重新构建 AAB 文件

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app
export EXPO_TOKEN="your-token-here"
eas build --platform android --profile production
```

### 步骤 5: 上传新的 AAB 到 Google Play Store

构建完成后：
1. 下载新的 AAB 文件
2. 上传到 Google Play Console
3. 测试登录功能

## 🔍 验证环境变量

构建前，可以验证 EAS Secrets 是否已正确配置：

```bash
eas secret:list
```

应该能看到所有四个环境变量：
- ✅ EXPO_PUBLIC_SUPABASE_URL
- ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY
- ✅ EXPO_PUBLIC_NETLIFY_URL
- ✅ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY

## 📝 获取 Supabase Anon Key

如果不知道 Supabase Anon Key：

1. 登录 Supabase Dashboard: https://supabase.com/dashboard
2. 选择项目：`uopkyuluxnrewvlmutam`
3. 进入：**Settings** → **API**
4. 复制 **anon/public** key

## 🆘 如果仍然无法登录

### 检查 1: 验证 Netlify Function 是否可访问

```bash
curl -X POST https://admin-market-link-express.com/.netlify/functions/admin-password \
  -H "Content-Type: application/json" \
  -d '{"action":"login","username":"test","password":"test"}'
```

如果返回错误，说明 Netlify Function 可能有问题。

### 检查 2: 验证 Supabase 连接

检查 Supabase URL 和 Key 是否正确，并且项目是否正常运行。

### 检查 3: 查看应用日志

在登录时，查看应用日志（如果可能），确认：
- Supabase URL 是否正确加载
- Netlify URL 是否正确加载
- 网络请求是否成功

## ⚠️ 重要提示

1. **环境变量更新后必须重新构建**
   - 修改 EAS Secrets 后，必须重新构建 AAB 文件
   - 旧的 APK 不会自动获取新的环境变量

2. **确保所有环境变量都已配置**
   - 缺少任何一个环境变量都可能导致登录失败

3. **测试环境变量**
   - 构建完成后，可以在应用中添加调试日志来验证环境变量是否正确加载

