# 🔧 Supabase URL 配置错误修复指南

## ✅ 已完成的修复

### 问题原因
Supabase URL 和 ANON_KEY 不匹配：
- **错误的 URL**: `https://cabtgyzmokewrgkxjgvg.supabase.co`
- **正确的 URL**: `https://uopkyuluxnrewvlmutam.supabase.co`（从 ANON_KEY 的 payload 中可以看到 `"ref":"uopkyuluxnrewvlmutam"`）

这导致所有 Supabase 查询都失败，因为 URL 和 Key 不匹配。

### 修复方案
1. **更新 `.env` 文件**
   - 将 `EXPO_PUBLIC_SUPABASE_URL` 从 `https://cabtgyzmokewrgkxjgvg.supabase.co` 改为 `https://uopkyuluxnrewvlmutam.supabase.co`

2. **更新默认值**
   - 在 `app.config.js` 和 `services/supabase.ts` 中更新了默认 URL

3. **改进 Supabase 客户端配置**
   - 添加了超时设置（30秒）
   - 改进了错误处理
   - 添加了重试逻辑

---

## 🚀 需要立即执行的操作

### 步骤 1: 确认 `.env` 文件已更新

`.env` 文件应该包含：
```bash
EXPO_PUBLIC_SUPABASE_URL=https://uopkyuluxnrewvlmutam.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
```

### 步骤 2: 重启 Expo 开发服务器

**重要**: 修改 `.env` 文件后，必须重启 Expo 开发服务器！

```bash
cd ml-express-mobile-app

# 停止当前的开发服务器（如果正在运行）
# 按 Ctrl+C

# 清除缓存并重新启动
npx expo start --offline --clear
```

### 步骤 3: 测试数据加载

重启后，测试以下功能：
1. **登录功能** - 应该可以正常登录
2. **包裹列表** - 应该可以加载包裹数据
3. **我的任务** - 应该可以加载任务列表
4. **统计数据** - 应该可以加载统计数据

---

## 🆘 如果仍然无法加载数据

### 问题 1: 网络连接问题

**症状**: 仍然显示 "Network request failed"

**解决方案**:
1. 检查设备网络连接
2. 确认可以访问 `https://uopkyuluxnrewvlmutam.supabase.co`
3. 如果使用模拟器，确保网络配置正确

### 问题 2: Supabase 项目状态

**症状**: 所有查询都失败

**解决方案**:
1. 登录 Supabase Dashboard: https://app.supabase.com
2. 检查项目 `uopkyuluxnrewvlmutam` 的状态
3. 确认项目没有被暂停或限制

### 问题 3: RLS 策略问题

**症状**: 查询返回空数据或权限错误

**解决方案**:
1. 在 Supabase Dashboard 中检查 RLS 策略
2. 确认 `admin_accounts`、`packages`、`couriers` 等表的 RLS 策略允许查询

---

## 📋 如何验证 Supabase URL 和 Key 是否匹配

### 方法 1: 检查 ANON_KEY 的 payload

ANON_KEY 是 JWT token，可以解码查看 payload：
- 访问 https://jwt.io
- 粘贴 ANON_KEY
- 查看 `ref` 字段，应该与 Supabase URL 中的项目 ID 匹配

### 方法 2: 在 Supabase Dashboard 中验证

1. 登录 https://app.supabase.com
2. 选择项目
3. 进入 **Settings** → **API**
4. 确认 **Project URL** 和 **Anon Key** 与 `.env` 文件中的值匹配

---

## ⚠️ 重要提示

1. **URL 和 Key 必须匹配**
   - Supabase URL 中的项目 ID 必须与 ANON_KEY 的 `ref` 字段匹配
   - 不匹配会导致所有查询失败

2. **环境变量优先级**
   - `expo-constants` (app.config.js) > `process.env` (.env 文件) > 默认值

3. **重启服务器**
   - 修改 `.env` 文件后必须重启 Expo 开发服务器
   - 使用 `--clear` 标志清除缓存

---

修复完成后，请重启 Expo 开发服务器并测试数据加载。如果还有问题，请告诉我！

