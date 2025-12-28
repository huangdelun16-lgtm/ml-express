# 🔧 骑手 App 登录问题修复指南

## ✅ 已完成的修复

### 问题原因
骑手 app 的登录逻辑直接比较明文密码，但数据库中的密码已经加密（bcrypt）。这导致：
- 即使输入正确的密码，也无法登录
- 因为加密后的密码与明文密码不匹配

### 修复方案
更新了 `services/supabase.ts` 中的 `adminAccountService.login` 方法：

1. **优先使用 Netlify Function 验证密码**（推荐）
   - 调用 `/.netlify/functions/admin-password` 验证密码
   - 支持加密密码验证
   - 与 Web 端使用相同的验证逻辑

2. **向后兼容明文密码**（仅用于旧数据）
   - 如果 Netlify Function 不可用，尝试直接数据库验证
   - 仅当密码是明文时才使用此方法
   - 如果密码已加密，会提示必须使用 Netlify Function

---

## 🚀 下一步操作

### 步骤 1: 更新 `.env` 文件

在 `ml-express-mobile-app/.env` 文件中添加 Netlify URL：

```bash
# Netlify Function URL for password verification
EXPO_PUBLIC_NETLIFY_URL=https://market-link-express.netlify.app
```

**注意**: 如果您的 Netlify 站点使用自定义域名，请使用自定义域名。

### 步骤 2: 重启 Expo 开发服务器

**重要**: 修改 `.env` 文件后，必须重启 Expo 开发服务器！

```bash
cd ml-express-mobile-app

# 停止当前的开发服务器（如果正在运行）
# 按 Ctrl+C

# 清除缓存并重新启动
npx expo start --clear
```

### 步骤 3: 测试登录

1. **使用骑手账号登录**
   - 输入用户名和密码
   - 确认可以正常登录

2. **检查网络连接**
   - 确保设备可以访问 Netlify Function URL
   - 如果使用模拟器，确保网络配置正确

---

## 🆘 如果仍然无法登录

### 问题 1: Netlify Function 不可用

**症状**: 登录时显示网络错误

**解决方案**:
1. 检查 Netlify 站点是否正常运行
2. 确认 Netlify Function URL 是否正确
3. 检查设备网络连接

### 问题 2: 密码格式问题

**症状**: 提示"密码格式已过期"

**解决方案**:
1. 在 Admin Web 中重置骑手账号密码
2. 新密码会自动加密
3. 使用新密码登录

### 问题 3: 账号不存在或已停用

**症状**: 提示"用户名不存在或账号已被停用"

**解决方案**:
1. 在 Admin Web 中检查账号状态
2. 确认账号的 `status` 字段为 `active`
3. 确认用户名拼写正确

---

## 📋 环境变量说明

### EXPO_PUBLIC_NETLIFY_URL
- **用途**: Netlify 站点 URL，用于调用登录验证函数
- **值**: `https://market-link-express.netlify.app`（或您的自定义域名）
- **必需**: ✅ 是（用于加密密码验证）

### EXPO_PUBLIC_SUPABASE_URL
- **用途**: Supabase 项目 URL
- **值**: `https://cabtgyzmokewrgkxjgvg.supabase.co`
- **必需**: ✅ 是

### EXPO_PUBLIC_SUPABASE_ANON_KEY
- **用途**: Supabase Anon Key
- **必需**: ✅ 是

---

## ⚠️ 重要提示

1. **密码加密**
   - 所有新创建的账号密码都会自动加密
   - 旧账号的明文密码需要重置后才能使用新登录逻辑

2. **网络要求**
   - 登录需要访问 Netlify Function
   - 确保设备网络可以访问 Netlify 站点

3. **向后兼容**
   - 如果 Netlify Function 不可用，会尝试直接数据库验证
   - 但仅支持明文密码（不推荐）

---

修复完成后，请重启 Expo 开发服务器并测试登录。如果还有问题，请告诉我！

