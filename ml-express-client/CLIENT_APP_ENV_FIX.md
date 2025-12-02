# 🔧 客户端 App 环境变量修复指南

## ✅ 已修复

客户端 App 的 `.env` 文件已更新，包含以下环境变量：

```
EXPO_PUBLIC_SUPABASE_URL=https://uopkyuluxnrewvlmutam.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[请从 Supabase Dashboard → Settings → API → API Keys 获取]
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=[请从 Google Cloud Console 获取]
```

**⚠️ 重要**: 请从 Supabase Dashboard 和 Google Cloud Console 获取实际的密钥值，不要使用示例值！

---

## 🔄 下一步操作

### 步骤 1: 重启 Expo 开发服务器

**重要**: 更新 `.env` 文件后，必须重启 Expo 开发服务器才能生效！

```bash
cd ml-express-client

# 停止当前的开发服务器（如果正在运行）
# 按 Ctrl+C

# 清除缓存并重新启动
npx expo start --clear
```

---

### 步骤 2: 验证修复

重启后，App 应该可以正常打开了。请测试：

1. **登录功能**
   - 测试用户登录
   - 确认可以连接到 Supabase

2. **数据加载**
   - 确认可以加载订单数据
   - 确认可以加载用户信息

3. **其他功能**
   - 测试下单功能
   - 测试追踪功能

---

## 🆘 如果仍然无法打开

### 问题 1: 仍然显示环境变量错误

**解决方案**:
1. 确认 `.env` 文件在 `ml-express-client` 目录下
2. 确认文件内容正确（没有多余的空格或换行）
3. 完全重启开发服务器（关闭终端，重新打开）

### 问题 2: 缓存问题

**解决方案**:
```bash
cd ml-express-client

# 清除所有缓存
npx expo start --clear

# 或者完全清理
rm -rf .expo
rm -rf node_modules/.cache
npx expo start --clear
```

---

## 📋 环境变量说明

### EXPO_PUBLIC_SUPABASE_URL
- **用途**: Supabase 项目 URL
- **值**: `https://uopkyuluxnrewvlmutam.supabase.co`
- **必需**: ✅ 是

### EXPO_PUBLIC_SUPABASE_ANON_KEY
- **用途**: Supabase Anon Key（客户端使用）
- **值**: `[请从 Supabase Dashboard → Settings → API → API Keys 获取]`
- **必需**: ✅ 是

### EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
- **用途**: Google Maps API Key（用于地图功能）
- **值**: `[请从 Google Cloud Console 获取]`
- **必需**: ✅ 是（如果使用地图功能）

---

## ✅ 检查清单

- [x] `.env` 文件已创建/更新
- [x] `EXPO_PUBLIC_SUPABASE_URL` 已配置
- [x] `EXPO_PUBLIC_SUPABASE_ANON_KEY` 已配置（使用新的密钥）
- [x] `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` 已配置
- [ ] 已重启 Expo 开发服务器（`npx expo start --clear`）
- [ ] App 可以正常打开
- [ ] 功能测试正常

---

**请重启 Expo 开发服务器，然后告诉我 App 是否可以正常打开了！** 🚀

