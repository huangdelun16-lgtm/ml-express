# 🔧 使用 Secret Key 修复登录问题指南

## ⚠️ 重要说明

**Secret Key 不应该在客户端代码中使用！** 它拥有完整的数据库访问权限，暴露在客户端代码中会带来严重的安全风险。

但是，我们可以用 Secret Key 来：
1. **测试连接** - 确认 Supabase 项目是否正常
2. **修复 RLS 策略** - 在 Supabase Dashboard 中使用 Secret Key 执行 SQL 脚本
3. **诊断问题** - 确定是 CORS 问题还是 RLS 策略问题

---

## 🔍 步骤 1: 测试 Secret Key 连接

1. **打开测试工具**
   - 在浏览器中打开 `test-secret-key.html`
   - 点击 "测试 Secret Key 连接"
   - 查看结果

2. **如果 Secret Key 连接成功**
   - 说明 Supabase 项目正常
   - 问题可能是 RLS 策略或 CORS 配置

3. **如果 Secret Key 也连接失败**
   - 说明 Supabase 项目可能暂停或限制
   - 需要检查 Supabase Dashboard 中的项目状态

---

## 🛠️ 步骤 2: 修复 RLS 策略（使用 Secret Key）

### 方法 1: 在 Supabase Dashboard 中执行 SQL

1. **登录 Supabase Dashboard**
   - 访问：https://app.supabase.com
   - 选择项目：`uopkyuluxnrewvlmutam`

2. **进入 SQL Editor**
   - 左侧菜单 → **SQL Editor**
   - 点击 **New query**

3. **执行修复脚本**
   - 复制 `fix-users-rls-policy-simple.sql` 的内容
   - 粘贴到 SQL Editor
   - 点击 **Run** 执行

4. **验证结果**
   - 应该看到 "Success. No rows returned" 或类似消息
   - 检查 **Table Editor** → **users** 表，确认可以查询

### 方法 2: 使用 Supabase CLI（如果已安装）

```bash
# 使用 Secret Key 连接 Supabase
supabase link --project-ref uopkyuluxnrewvlmutam

# 执行 SQL 脚本
supabase db execute --file fix-users-rls-policy-simple.sql
```

---

## 🔐 步骤 3: 检查 Anon Key 是否正确

如果 Secret Key 可以连接，但 Anon Key 不行，可能是：

1. **Anon Key 已过期或被重置**
   - 在 Supabase Dashboard → **Settings** → **API**
   - 查看 **anon/public** key
   - 如果与代码中的不同，需要更新

2. **更新客户端代码中的 Anon Key**
   - 如果 Anon Key 已更改，需要更新：
     - `ml-express-client-web/src/services/supabase.ts`
     - Netlify 环境变量 `REACT_APP_SUPABASE_ANON_KEY`

---

## 📋 步骤 4: 检查 CORS 配置

即使使用 Secret Key 可以连接，客户端仍可能遇到 CORS 错误。

### 检查 Supabase CORS 设置

1. **Supabase Dashboard** → **Settings** → **API**
2. **检查 CORS 设置**（如果有）
   - 确认允许的域名包括：
     - `https://market-link-express.com`
     - `https://client-ml-express.netlify.app`
     - `http://localhost:3000` (开发环境)

### 如果 Supabase 没有 CORS 设置

Supabase 默认允许所有来源，但如果出现 CORS 错误，可能是：
- 项目暂停或限制
- API Key 无效
- 网络问题

---

## ✅ 步骤 5: 验证修复

修复后，测试登录功能：

1. **清除浏览器缓存**
   - 按 `Ctrl+Shift+Delete` (Windows) 或 `Cmd+Shift+Delete` (Mac)
   - 清除缓存和 Cookie

2. **重新加载页面**
   - 按 `Ctrl+F5` (Windows) 或 `Cmd+Shift+R` (Mac) 强制刷新

3. **尝试登录**
   - 使用之前无法登录的账号
   - 检查控制台是否还有错误

---

## 🚨 安全建议

### ❌ 不要这样做：

1. **不要在客户端代码中使用 Secret Key**
   ```typescript
   // ❌ 错误示例
   const supabase = createClient(url, SECRET_KEY); // 危险！
   ```

2. **不要将 Secret Key 提交到 Git**
   - Secret Key 应该只在服务端使用
   - 如果已提交，立即重置 Secret Key

### ✅ 正确做法：

1. **客户端使用 Anon Key**
   ```typescript
   // ✅ 正确示例
   const supabase = createClient(url, ANON_KEY); // 安全
   ```

2. **Secret Key 只在服务端使用**
   - 后端 API
   - 服务器端脚本
   - Supabase Dashboard SQL Editor

3. **使用环境变量**
   - 不要在代码中硬编码密钥
   - 使用环境变量管理密钥

---

## 📞 如果问题仍然存在

如果按照以上步骤操作后问题仍然存在，请提供：

1. **测试结果**
   - `test-secret-key.html` 的测试结果
   - `test-supabase-cors.html` 的测试结果

2. **Supabase Dashboard 信息**
   - 项目状态（是否暂停？）
   - RLS 策略列表
   - API Key 信息

3. **浏览器控制台错误**
   - 完整的错误信息
   - 网络请求详情

---

## 🎯 快速修复清单

- [ ] 使用 `test-secret-key.html` 测试 Secret Key 连接
- [ ] 在 Supabase Dashboard 中执行 `fix-users-rls-policy-simple.sql`
- [ ] 检查 Anon Key 是否正确
- [ ] 更新 Netlify 环境变量（如果需要）
- [ ] 重新部署 Netlify 站点
- [ ] 清除浏览器缓存并测试登录

