# 🔧 骑手 App 无法打开问题修复指南

## ✅ 已完成的修复

### 1. 创建 `.env` 文件
已在 `ml-express-mobile-app` 目录下创建 `.env` 文件，包含以下环境变量：

```
EXPO_PUBLIC_SUPABASE_URL=https://cabtgyzmokewrgkxjgvg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE
```

### 2. 更新环境变量读取逻辑
- 修改了 `services/supabase.ts`，支持从 `expo-constants` 读取环境变量
- 更新了 `app.config.js`，将环境变量传递到 `extra` 字段

---

## 🚀 下一步操作（重要）

### 步骤 1: 重启 Expo 开发服务器

**重要**: 创建或修改 `.env` 文件后，必须重启 Expo 开发服务器才能生效！

```bash
cd ml-express-mobile-app

# 停止当前的开发服务器（如果正在运行）
# 按 Ctrl+C

# 清除缓存并重新启动
npx expo start --clear
```

### 步骤 2: 验证修复

重启后，App 应该可以正常打开了。请测试：

1. **App 启动**
   - 确认不再显示环境变量错误
   - 确认可以正常进入登录页面

2. **登录功能**
   - 测试骑手登录
   - 确认可以连接到 Supabase

3. **数据加载**
   - 确认可以加载包裹数据
   - 确认可以加载任务列表

---

## 🆘 如果仍然无法打开

### 问题 1: 仍然显示环境变量错误

**解决方案**:
1. 确认 `.env` 文件在 `ml-express-mobile-app` 目录下
2. 确认文件内容正确（没有多余的空格或换行）
3. 完全重启开发服务器（关闭终端，重新打开）

### 问题 2: 缓存问题

**解决方案**:
```bash
cd ml-express-mobile-app

# 清除所有缓存
npx expo start --clear

# 或者完全清理
rm -rf .expo
rm -rf node_modules/.cache
npx expo start --clear
```

### 问题 3: dotenv 未安装

**解决方案**:
```bash
cd ml-express-mobile-app
npm install dotenv
```

---

## 📋 环境变量说明

### EXPO_PUBLIC_SUPABASE_URL
- **用途**: Supabase 项目 URL
- **值**: `https://cabtgyzmokewrgkxjgvg.supabase.co`
- **必需**: ✅ 是

### EXPO_PUBLIC_SUPABASE_ANON_KEY
- **用途**: Supabase Anon Key（客户端使用）
- **值**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **必需**: ✅ 是

### EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
- **用途**: Google Maps API 密钥
- **值**: `AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE`
- **必需**: ✅ 是

---

## ⚠️ 重要提示

1. **`.env` 文件不会被提交到 Git**（已在 `.gitignore` 中）
   - 这是正常的安全措施
   - 每个开发者需要在自己的机器上创建 `.env` 文件

2. **生产环境构建**
   - 如果使用 EAS Build，需要在 EAS Secrets 中配置这些环境变量
   - 命令：`eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value <your-value>`

3. **环境变量更新**
   - 如果 Supabase 密钥更新，需要同时更新 `.env` 文件和 EAS Secrets

---

修复完成后，请重启 Expo 开发服务器测试。如果还有问题，请告诉我！

