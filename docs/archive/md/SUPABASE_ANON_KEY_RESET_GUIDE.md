# 🔑 Supabase Anon Key 重置指南

## 📋 当前状态

- ✅ **Secret Key**: 已生成新的
- ⏳ **Anon Key**: 需要重置生成新的

---

## 🔄 重置 Anon Key 的步骤

### 方法 1: 通过 API Keys 页面重置（推荐）

1. **在 Supabase Dashboard 中**
   - 确保您正在查看 **Settings** → **API** → **API Keys** 页面
   - 找到 **"Anon Public Key"** 部分

2. **重置 Anon Key**
   - 在 Anon Public Key 字段的右侧，应该有一个 **"Reset"** 或 **"Regenerate"** 按钮
   - 点击该按钮
   - 系统会提示您确认操作

3. **确认重置**
   - ⚠️ **警告**: 重置后，旧的 Anon Key 将立即失效
   - 所有使用旧 Anon Key 的应用将无法连接 Supabase
   - 点击 **"Confirm"** 或 **"Reset"** 确认

4. **复制新的 Anon Key**
   - 重置后，系统会显示新的 Anon Key
   - ⚠️ **重要**: Anon Key 会完整显示（不像 Secret Key 那样掩码）
   - **立即复制并保存**到安全的地方（例如：密码管理器）

---

### 方法 2: 通过 JWT Secret 重置（如果方法 1 不可用）

如果 API Keys 页面没有直接的 Reset 按钮，可以通过重置 JWT Secret 来生成新的密钥：

1. **进入 Settings → API**
   - 找到 **"JWT Secret"** 部分
   - 点击 **"Reset JWT Secret"** 或 **"Regenerate"**

2. **确认重置**
   - ⚠️ **重要**: 重置 JWT Secret 会同时重置：
     - Anon Key
     - Service Role Key
   - 由于您已经生成了新的 Secret Key，这个方法会**再次重置 Secret Key**
   - **不推荐使用此方法**（除非方法 1 不可用）

---

## 📝 重置后的操作步骤

### Step 1: 更新 Netlify 环境变量

#### 客户端 Web (market-link-express.com)

1. 登录 Netlify Dashboard
2. 选择站点 → **Site settings** → **Environment variables**
3. 找到 `REACT_APP_SUPABASE_ANON_KEY`
4. 点击 **Edit**
5. 更新值为新的 Anon Key
6. 点击 **Save**

#### 后台管理 Web (admin-market-link-express.com)

1. 在 Netlify Dashboard 中选择后台管理站点
2. 进入 **Site settings** → **Environment variables**
3. 更新 `REACT_APP_SUPABASE_ANON_KEY` 为新的 Anon Key
4. 点击 **Save**

---

### Step 2: 更新 EAS Secrets（客户端 App）

```bash
cd ml-express-client

# 更新 Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<新的 Anon Key>" --force

# 验证更新
eas secret:list
```

---

### Step 3: 更新本地 `.env` 文件

**⚠️ 注意**: `.env` 文件已在 `.gitignore` 中，不会被提交到 Git

更新本地 `.env` 文件：

```bash
# 编辑 .env 文件
REACT_APP_SUPABASE_URL=https://uopkyuluxnrewvlmutam.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<新的 Anon Key>

# 客户端 App
EXPO_PUBLIC_SUPABASE_URL=https://uopkyuluxnrewvlmutam.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<新的 Anon Key>
```

---

### Step 4: 重新部署

#### Netlify 站点

1. **客户端 Web**
   - 在 Netlify Dashboard 中
   - 点击 **Deploys** → **Trigger deploy** → **Deploy site**

2. **后台管理 Web**
   - 同样触发重新部署

#### 客户端 App

- 如果使用 EAS Build，下次构建时会自动使用新的密钥
- 如果使用本地构建，确保 `.env` 文件已更新

---

## ✅ 验证更新

### 1. 测试客户端 Web

1. 访问 `https://market-link-express.com`
2. 测试登录功能
3. 测试注册功能
4. 确认数据可以正常加载

### 2. 测试后台管理 Web

1. 访问 `https://admin-market-link-express.com`
2. 测试管理员登录
3. 确认数据可以正常加载

### 3. 测试客户端 App

1. 重新构建 App（如果使用 EAS）
2. 测试登录功能
3. 测试数据加载

### 4. 测试 Netlify Functions

1. 测试发送邮箱验证码功能
2. 测试验证邮箱验证码功能
3. 确认 Functions 正常工作

---

## 🔍 如果遇到问题

### 问题 1: 应用无法连接 Supabase

**症状**:
- 登录失败
- 数据无法加载
- 控制台显示认证错误

**解决方案**:
1. 检查 Netlify/EAS 环境变量是否正确更新
2. 确认使用的是新的 Anon Key，不是旧的
3. 确认环境变量名称正确：
   - Web: `REACT_APP_SUPABASE_ANON_KEY`
   - App: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. 重新部署站点

### 问题 2: Netlify Functions 无法工作

**症状**:
- 发送验证码失败
- 验证验证码失败

**解决方案**:
1. 检查 `SUPABASE_SERVICE_ROLE` 环境变量是否正确（使用新的 Secret Key）
2. 如果 `SUPABASE_SERVICE_ROLE` 未设置，Functions 会回退到使用 Anon Key
3. 确认 Anon Key 已更新
4. 重新部署站点

---

## 📋 检查清单

### 重置前准备
- [ ] 已准备好更新所有环境变量
- [ ] 已准备好重新部署所有站点
- [ ] 已通知团队成员（如果有）

### 重置操作
- [ ] 已在 Supabase Dashboard 重置 Anon Key
- [ ] 已复制新的 Anon Key 并保存

### 更新配置
- [ ] 已更新 Netlify 客户端 Web 的 `REACT_APP_SUPABASE_ANON_KEY`
- [ ] 已更新 Netlify 后台管理 Web 的 `REACT_APP_SUPABASE_ANON_KEY`
- [ ] 已更新 EAS Secrets 的 `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 已更新本地 `.env` 文件

### 重新部署
- [ ] 已重新部署客户端 Web
- [ ] 已重新部署后台管理 Web
- [ ] 已重新构建客户端 App（如果需要）

### 验证
- [ ] 已测试客户端 Web 功能
- [ ] 已测试后台管理 Web 功能
- [ ] 已测试客户端 App 功能
- [ ] 已测试 Netlify Functions
- [ ] 已确认所有功能正常工作

---

## 🔒 安全提醒

1. **Anon Key vs Secret Key**
   - **Anon Key**: 可以暴露给客户端，受 RLS 保护
   - **Secret Key**: 绝对不能暴露给客户端，具有完全访问权限

2. **密钥管理**
   - ✅ 使用环境变量存储密钥
   - ✅ 定期轮换密钥（每 3-6 个月）
   - ✅ 如果怀疑泄漏，立即重置
   - ❌ 永远不要提交密钥到 Git
   - ❌ 永远不要在代码中硬编码密钥

3. **重置后的影响**
   - 旧的 Anon Key 会立即失效
   - 所有使用旧密钥的应用会无法连接
   - 必须尽快更新所有环境变量并重新部署

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. Supabase Dashboard → Settings → API → API Keys（确认密钥状态）
2. Netlify Dashboard → Site settings → Environment variables（确认环境变量）
3. EAS Dashboard → Secrets（如果使用 Expo）

---

**最后更新**: 2024-12-XX  
**紧急程度**: 🔴 高优先级（如果旧密钥已泄漏）

