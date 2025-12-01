# 🔐 Supabase Secret Keys 删除和重新创建指南

## 📋 当前情况

根据 Supabase Dashboard，您有两个 Secret Keys：
1. **default** - 3 hours ago 使用过
2. **mlexpress** - Never used

## ⚠️ 重要决策

### 如果这些密钥已被泄漏（在 GitHub 上公开）

**建议：删除这两个 Secret Keys，然后创建新的**

原因：
- Secret Keys 具有完全访问权限（类似 Service Role Key）
- 如果密钥已公开泄漏，任何人都可以使用它们访问您的数据库
- 删除旧密钥并创建新的是最安全的做法

### 如果这些密钥未被泄漏

**建议：只删除未使用的 "mlexpress" key，保留 "default" key**

原因：
- "default" key 在 3 小时前使用过，可能正在被 Netlify Functions 使用
- 如果删除正在使用的 key，会导致服务中断

---

## 🔥 推荐操作步骤（假设密钥已泄漏）

### Step 1: 删除现有的 Secret Keys

1. **在 Supabase Dashboard 中**
   - 进入 **Settings** → **API** → **Secret keys**
   - 对于每个 key，点击右侧的 **⋮**（三个点）菜单
   - 选择 **Delete** 或 **Revoke**
   - 确认删除

2. **删除顺序**
   - 先删除 "mlexpress"（未使用，风险较低）
   - 再删除 "default"（⚠️ 删除后，Netlify Functions 会立即失效）

---

### Step 2: 创建新的 Secret Key

1. **在 Supabase Dashboard 中**
   - 点击 **"+ New secret key"** 按钮
   - 输入名称（例如：`netlify-functions`）
   - 可选：添加描述（例如：`For Netlify Functions only`）
   - 点击 **Create**

2. **立即复制新密钥**
   - ⚠️ **重要**：Secret Key 只显示一次！
   - 复制并保存到安全的地方（例如：密码管理器）

---

### Step 3: 更新 Netlify 环境变量

#### 3.1 更新客户端 Web (market-link-express.com)

1. 登录 Netlify Dashboard
2. 选择站点 → **Site settings** → **Environment variables**
3. 找到或添加 `SUPABASE_SERVICE_ROLE`
4. 更新值为新的 Secret Key
5. 点击 **Save**

#### 3.2 更新后台管理 Web (admin-market-link-express.com)

- 同样更新 `SUPABASE_SERVICE_ROLE` 环境变量

#### 3.3 重新部署

- 删除 Secret Key 后，Netlify Functions 会失效
- 更新环境变量后，需要重新部署站点：
  - 在 Netlify Dashboard 中点击 **Deploys** → **Trigger deploy** → **Deploy site**

---

### Step 4: 验证修复

1. **测试 Netlify Functions**
   - 测试发送邮箱验证码功能
   - 测试验证邮箱验证码功能
   - 确认功能正常工作

2. **检查 Supabase Dashboard**
   - 确认旧的 Secret Keys 已删除
   - 确认新的 Secret Key 正常工作

---

## 🔍 检查密钥是否被使用

### 检查 Netlify Functions 使用情况

您的 Netlify Functions 使用 `SUPABASE_SERVICE_ROLE` 环境变量：

**文件：**
- `ml-express-client-web/netlify/functions/send-email-code.js`
- `ml-express-client-web/netlify/functions/verify-email-code.js`

**代码：**
```javascript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
```

这意味着：
- 如果 `SUPABASE_SERVICE_ROLE` 未设置，Functions 会回退到使用 Anon Key
- 如果设置了 `SUPABASE_SERVICE_ROLE`，Functions 会优先使用它

---

## 📋 操作检查清单

### 删除前准备
- [ ] 确认已备份新的 Secret Key（创建后立即保存）
- [ ] 确认已准备好更新 Netlify 环境变量
- [ ] 确认已准备好重新部署站点

### 删除操作
- [ ] 已删除 "mlexpress" Secret Key
- [ ] 已删除 "default" Secret Key
- [ ] 已创建新的 Secret Key 并保存

### 更新配置
- [ ] 已更新 Netlify 客户端 Web 的 `SUPABASE_SERVICE_ROLE`
- [ ] 已更新 Netlify 后台管理 Web 的 `SUPABASE_SERVICE_ROLE`
- [ ] 已重新部署两个站点

### 验证
- [ ] 已测试发送邮箱验证码功能
- [ ] 已测试验证邮箱验证码功能
- [ ] 已确认所有功能正常工作

---

## 🆘 如果删除后出现问题

### 问题 1: Netlify Functions 无法工作

**症状：**
- 发送验证码失败
- 验证验证码失败

**解决方案：**
1. 检查 Netlify Dashboard → Environment variables → `SUPABASE_SERVICE_ROLE` 是否正确设置
2. 确认使用的是新的 Secret Key，不是旧的
3. 重新部署站点

### 问题 2: 应用无法连接 Supabase

**症状：**
- 登录失败
- 数据无法加载

**解决方案：**
1. 检查 `REACT_APP_SUPABASE_ANON_KEY` 环境变量是否正确
2. 确认使用的是 Anon Key，不是 Secret Key
3. Secret Key 只能用于服务器端（Netlify Functions）

---

## 🔒 安全最佳实践

### 1. Secret Key vs Anon Key

- **Secret Key (Service Role Key)**
  - ❌ 绝对不能暴露给客户端
  - ✅ 只能用于服务器端（Netlify Functions、后端服务）
  - ✅ 可以绕过 RLS 策略

- **Anon Key**
  - ✅ 可以暴露给客户端
  - ✅ 受 RLS 保护
  - ✅ 用于客户端应用（Web、App）

### 2. 密钥管理

- ✅ 使用环境变量存储密钥
- ✅ 定期轮换密钥（每 3-6 个月）
- ✅ 如果怀疑泄漏，立即删除并创建新的
- ❌ 永远不要提交密钥到 Git
- ❌ 永远不要在代码中硬编码密钥

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. Supabase Dashboard → Settings → API → Secret keys（确认密钥状态）
2. Netlify Dashboard → Site settings → Environment variables（确认环境变量）
3. Netlify Dashboard → Deploys（确认部署状态）

---

**最后更新：** 2024-12-XX
**紧急程度：** 🔴 高优先级（如果密钥已泄漏）

