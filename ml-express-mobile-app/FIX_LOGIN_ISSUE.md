# 🔧 修复 Google Play Store APK 登录问题

## 📋 问题说明

从 Google Play Store 下载的 APK 登录时显示："用户名或密码错误, 或账号已被停用"

**根本原因**：EAS Build 生产环境缺少必要的环境变量配置。

## ✅ 解决方案

### 步骤 1: 配置 EAS 环境变量

需要在 EAS 中配置以下环境变量：

1. **EXPO_PUBLIC_SUPABASE_URL** - Supabase 项目 URL
2. **EXPO_PUBLIC_SUPABASE_ANON_KEY** - Supabase Anon Key
3. **EXPO_PUBLIC_NETLIFY_URL** - Netlify Function URL
4. **EXPO_PUBLIC_GOOGLE_MAPS_API_KEY** - Google Maps API Key

### 步骤 2: 获取 Supabase Anon Key

1. 登录 Supabase Dashboard: https://supabase.com/dashboard
2. 选择项目：`uopkyuluxnrewvlmutam`
3. 进入：**Settings** → **API** → **API Keys**
4. 复制 **anon public** key（完整的 JWT token）

### 步骤 3: 创建 EAS 环境变量

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app

# 设置 Expo Token
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"

# 创建 Supabase URL（使用 plaintext 而不是 public）
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://uopkyuluxnrewvlmutam.supabase.co" --visibility plaintext --environment production --non-interactive

# 创建 Supabase Anon Key
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_SUPABASE_ANON_KEY_HERE" --visibility sensitive --environment production --non-interactive

# 创建 Netlify URL
eas env:create --scope project --name EXPO_PUBLIC_NETLIFY_URL --value "https://admin-market-link-express.com" --visibility plaintext --environment production --non-interactive

# 创建 Google Maps API Key
eas env:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE" --visibility sensitive --environment production --non-interactive
```

**注意**：
- `--visibility` 参数的值必须是：`plaintext`（用于 URL）、`sensitive`（用于密钥）或 `secret`
- 必须使用 `--environment production` 指定环境
- 使用 `--non-interactive` 避免交互式提示

**✅ 所有环境变量已成功创建！**

### 步骤 4: 验证环境变量已创建

```bash
eas env:list --environment production
```

应该能看到所有四个环境变量：
- ✅ EXPO_PUBLIC_SUPABASE_URL
- ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY
- ✅ EXPO_PUBLIC_NETLIFY_URL
- ✅ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY

**✅ 所有环境变量已成功创建！**

### 步骤 5: 重新构建 AAB 文件

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app
export EXPO_TOKEN="UYTE7q5Tlu8_bDU6H7OXUQKgYMItCFUNuHLFicrc"
eas build --platform android --profile production
```

### 步骤 6: 上传新的 AAB 到 Google Play Store

1. 构建完成后，下载新的 AAB 文件
2. 上传到 Google Play Console
3. 发布到 Closed Testing 或 Production
4. 测试登录功能

## 🔍 验证配置

构建完成后，可以在应用中添加调试日志来验证环境变量是否正确加载：

```typescript
// 在 services/supabase.ts 中已经有日志输出
console.log('✅ Supabase 配置已加载:');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '未配置');
console.log('   Netlify URL:', netlifyUrl);
```

## ⚠️ 重要提示

1. **环境变量更新后必须重新构建**
   - 修改 EAS 环境变量后，必须重新构建 AAB 文件
   - 旧的 APK 不会自动获取新的环境变量

2. **确保所有环境变量都已配置**
   - 缺少任何一个环境变量都可能导致登录失败

3. **Supabase Anon Key 必须是最新的**
   - 如果 Supabase Anon Key 已重置，必须更新 EAS 环境变量

## 🆘 如果仍然无法登录

### 检查 1: 验证 Netlify Function 是否可访问

```bash
curl -X POST https://admin-market-link-express.com/.netlify/functions/admin-password \
  -H "Content-Type: application/json" \
  -d '{"action":"login","username":"test","password":"test"}'
```

### 检查 2: 验证 Supabase 连接

确认 Supabase URL 和 Anon Key 是否正确，并且项目是否正常运行。

### 检查 3: 查看应用日志

在登录时，查看应用日志（如果可能），确认：
- Supabase URL 是否正确加载
- Netlify URL 是否正确加载
- 网络请求是否成功

