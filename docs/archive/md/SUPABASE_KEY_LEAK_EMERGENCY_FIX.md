# 🚨 Supabase 密钥泄漏紧急修复指南

## ⚠️ 严重性评估

根据检测结果，以下 Supabase 密钥已被公开泄漏：

1. **Service Role Key** (`.env:7`) - 🔴 **极度危险**
   - 具有完全访问权限，可以绕过所有 RLS 策略
   - 可以删除、修改所有数据
   - **必须立即撤销！**

2. **Anon Key** (多处硬编码) - 🟡 **中等风险**
   - 权限有限，受 RLS 保护
   - 但仍应更换

---

## 🔥 立即行动步骤

### Step 1: 撤销泄漏的 Service Role Key（最高优先级）

1. **登录 Supabase Dashboard**
   - 访问：https://app.supabase.com
   - 选择项目：`uopkyuluxnrewvlmutam` 或 `cabtgyzmokewrgkxjgvg`

2. **撤销 Service Role Key**
   - 进入 **Settings** → **API**
   - 找到 **service_role** key（secret key）
   - 点击 **Reset** 或 **Revoke**
   - ⚠️ **警告**：重置后，所有使用旧 Service Role Key 的服务将立即失效

3. **生成新的 Service Role Key**
   - 重置后，系统会自动生成新的 Service Role Key
   - **立即复制新密钥**（只显示一次）

---

### Step 2: 撤销并重新生成 Anon Key

1. **撤销旧的 Anon Key**
   - 在 **Settings** → **API** 中
   - 找到 **anon public** key
   - 点击 **Reset**

2. **复制新的 Anon Key**
   - 重置后会显示新的 Anon Key
   - 复制保存

---

### Step 3: 更新代码中的硬编码密钥

#### 3.1 移除硬编码的 Anon Key

需要修改以下文件，移除硬编码的 fallback 值：

**文件列表：**
- `src/services/supabase.ts`
- `ml-express-client-web/src/services/supabase.ts`
- `ml-express-client/src/services/supabase.ts`
- `ml-express-mobile-app/services/supabase.ts`

**修改方式：**
```typescript
// ❌ 错误：硬编码密钥
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

// ✅ 正确：只使用环境变量
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
if (!supabaseKey) {
  throw new Error('REACT_APP_SUPABASE_ANON_KEY is required');
}
```

---

### Step 4: 更新环境变量

#### 4.1 更新本地 `.env` 文件

```bash
# 删除旧的 Service Role Key
# 使用新的 Anon Key（不是 Service Role Key！）

REACT_APP_SUPABASE_URL=https://uopkyuluxnrewvlmutam.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<新的 Anon Key>

# 注意：不要在客户端代码中使用 Service Role Key！
# Service Role Key 只能用于服务器端（如 Netlify Functions）
```

#### 4.2 更新 Netlify 环境变量

**客户端 Web (market-link-express.com):**
1. 登录 Netlify Dashboard
2. 选择站点 → **Site settings** → **Environment variables**
3. 更新以下变量：
   - `REACT_APP_SUPABASE_URL` = `<你的 Supabase URL>`
   - `REACT_APP_SUPABASE_ANON_KEY` = `<新的 Anon Key>`
   - `SUPABASE_SERVICE_ROLE` = `<新的 Service Role Key>`（仅用于 Functions）

**后台管理 Web (admin-market-link-express.com):**
- 同样更新上述变量

**Netlify Functions（如果需要 Service Role Key）:**
- `SUPABASE_SERVICE_ROLE` = `<新的 Service Role Key>`
- ⚠️ **注意**：Service Role Key 只能用于服务器端 Functions，不能暴露给客户端！

#### 4.3 更新 EAS Secrets（客户端 App）

```bash
# 更新 Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<新的 Anon Key>" --force

# 更新 Supabase URL（如果需要）
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "<你的 Supabase URL>" --force
```

---

### Step 5: 清理 Git 历史（可选但推荐）

如果 `.env` 文件已经被提交到 Git，需要清理历史：

```bash
# 使用 git filter-repo（推荐）
git filter-repo --path .env --invert-paths

# 或者使用 BFG Repo-Cleaner
# 下载：https://rtyley.github.io/bfg-repo-cleaner/
bfg --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 强制推送到远程（⚠️ 警告：会重写历史）
git push origin --force --all
```

---

### Step 6: 验证修复

1. **检查代码**
   - 确认所有硬编码密钥已移除
   - 确认 `.env` 文件在 `.gitignore` 中

2. **测试应用**
   - 客户端 Web：测试登录、注册等功能
   - 客户端 App：测试连接 Supabase
   - Netlify Functions：测试邮件发送等功能

3. **检查 Supabase Dashboard**
   - 确认旧的 Service Role Key 已失效
   - 确认新的密钥正常工作

---

## 📋 检查清单

- [ ] 已在 Supabase Dashboard 撤销旧的 Service Role Key
- [ ] 已生成新的 Service Role Key 并保存
- [ ] 已在 Supabase Dashboard 撤销旧的 Anon Key
- [ ] 已生成新的 Anon Key 并保存
- [ ] 已移除代码中所有硬编码的 Supabase 密钥
- [ ] 已更新本地 `.env` 文件（使用新的 Anon Key）
- [ ] 已更新 Netlify 环境变量（客户端 Web）
- [ ] 已更新 Netlify 环境变量（后台管理 Web）
- [ ] 已更新 Netlify Functions 的 `SUPABASE_SERVICE_ROLE`（如果需要）
- [ ] 已更新 EAS Secrets（客户端 App）
- [ ] 已清理 Git 历史（如果 `.env` 被提交）
- [ ] 已测试所有功能正常工作

---

## 🔒 安全最佳实践

### 1. 密钥类型说明

- **Anon Key (anon public)**
  - ✅ 可以暴露给客户端
  - ✅ 受 RLS (Row Level Security) 保护
  - ✅ 用于客户端应用（Web、App）

- **Service Role Key (service_role)**
  - ❌ **绝对不能暴露给客户端**
  - ❌ 可以绕过所有 RLS 策略
  - ✅ 只能用于服务器端（Netlify Functions、后端服务）

### 2. 代码规范

```typescript
// ✅ 正确：只使用环境变量
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
if (!supabaseKey) {
  throw new Error('REACT_APP_SUPABASE_ANON_KEY is required');
}

// ❌ 错误：硬编码密钥
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'hardcoded-key';

// ❌ 错误：在客户端使用 Service Role Key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE; // 只能在服务器端使用！
```

### 3. 环境变量管理

- ✅ 使用 `.env` 文件（本地开发）
- ✅ 使用 Netlify Environment Variables（部署）
- ✅ 使用 EAS Secrets（Expo 应用）
- ✅ `.env` 文件必须在 `.gitignore` 中
- ❌ 永远不要提交密钥到 Git

---

## 🆘 如果应用无法正常工作

### 问题 1: 应用无法连接 Supabase

**可能原因：**
- 环境变量未正确配置
- 使用了错误的密钥类型

**解决方案：**
1. 检查 Netlify/EAS 环境变量是否正确设置
2. 确认使用的是 Anon Key，不是 Service Role Key
3. 检查 Supabase Dashboard 中的项目状态

### 问题 2: Netlify Functions 无法工作

**可能原因：**
- `SUPABASE_SERVICE_ROLE` 环境变量未设置或错误

**解决方案：**
1. 在 Netlify Dashboard 中设置 `SUPABASE_SERVICE_ROLE`
2. 使用新的 Service Role Key
3. 重新部署 Functions

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. Supabase Dashboard → Settings → API（确认密钥状态）
2. Netlify Dashboard → Site settings → Environment variables
3. EAS Dashboard → Secrets（如果使用 Expo）

---

**最后更新：** 2024-12-XX
**紧急程度：** 🔴 最高优先级

