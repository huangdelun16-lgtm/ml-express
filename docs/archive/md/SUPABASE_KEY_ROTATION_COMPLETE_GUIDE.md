# 🔑 Supabase 密钥旋转完整指南

## 📋 情况说明

根据 Supabase 新系统：
- ✅ **Secret Key**: 已生成新的
- ⏳ **Anon Key**: 需要重置，但新版 Supabase 不再提供单独的 Reset 按钮
- 🔄 **解决方案**: 需要旋转 JWT Secret 或迁移到新的 Publishable/Secret Keys 系统

---

## 🎯 两个方案对比

### 方案 A: 旋转 JWT Secret（立即失效旧密钥）

**适用场景**:
- ✅ 需要立即让泄漏的 anon key 失效
- ✅ 可以接受短暂的停机时间
- ✅ 希望快速解决问题

**优点**:
- 立即作废旧密钥
- 操作简单快速

**缺点**:
- 会立即中断所有使用旧密钥的连接
- 需要同步更新所有配置并重新部署
- 有停机风险

---

### 方案 B: 迁移到 Publishable/Secret Keys（推荐）

**适用场景**:
- ✅ 希望零停机过渡
- ✅ 需要更好的密钥管理
- ✅ 长期使用

**优点**:
- 零停机过渡（新旧密钥可同时存在）
- 前端和后端密钥可以独立管理
- 以后可以独立创建、轮换、撤销密钥
- 不需要旋转 JWT Secret

**缺点**:
- 需要更新代码配置
- 迁移过程需要时间

---

## 🚀 方案 A: 旋转 JWT Secret（立即失效）

### 步骤 1: 在 Dashboard 中旋转 JWT Secret

1. **打开 Supabase Dashboard**
   - 进入 **Settings** → **API** → **API Keys** 页面
   - 或 **Settings** → **API** → **JWT Keys** 页面

2. **查找 JWT Secret 旋转选项**
   - 查找 **"Generate new secret"** 或 **"Rotate JWT Secret"** 按钮
   - 可能在 **Legacy JWT Secret** 区域
   - 或在 **JWT Keys** 页面的操作菜单中

3. **执行旋转**
   - 点击按钮
   - 确认操作
   - ⚠️ **警告**: 旧的 anon/service_role 将立即失效

4. **获取新密钥**
   - 旋转完成后，切换到 **API Keys** 页面
   - 复制新的 **anon public** key
   - 复制新的 **service_role secret** key（需要 Reveal）

---

### 步骤 2: 立即更新所有配置

#### 2.1 更新 Netlify 环境变量（最高优先级）

**客户端 Web (market-link-express.com)**:
```
REACT_APP_SUPABASE_ANON_KEY = <新的 anon key>
SUPABASE_SERVICE_ROLE = <新的 service_role key>
```

**后台管理 Web (admin-market-link-express.com)**:
```
REACT_APP_SUPABASE_ANON_KEY = <新的 anon key>
SUPABASE_SERVICE_ROLE = <新的 service_role key>
```

**操作**:
1. 登录 Netlify Dashboard
2. 选择站点 → **Site settings** → **Environment variables**
3. 立即更新上述变量
4. 点击 **Save**

#### 2.2 更新 EAS Secrets（客户端 App）

```bash
cd ml-express-client

# 更新 Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<新的 anon key>" --force

# 验证更新
eas secret:list
```

#### 2.3 更新本地 .env 文件

```bash
REACT_APP_SUPABASE_ANON_KEY=<新的 anon key>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<新的 anon key>
```

---

### 步骤 3: 立即重新部署

**Netlify 站点**:
1. 客户端 Web: **Deploys** → **Trigger deploy** → **Deploy site**
2. 后台管理 Web: 同样触发重新部署

**客户端 App**:
- 如果使用 EAS Build，下次构建时会自动使用新密钥
- 如果需要立即更新，重新构建 App

---

### 步骤 4: 验证和监控

1. **测试功能**
   - 客户端 Web: 测试登录、注册、数据加载
   - 后台管理 Web: 测试管理员登录、数据加载
   - 客户端 App: 测试登录、数据加载
   - Netlify Functions: 测试发送验证码、验证验证码

2. **检查错误日志**
   - Netlify Dashboard → Functions → Logs
   - Supabase Dashboard → Logs
   - 确认没有使用旧密钥的错误

---

## 🌟 方案 B: 迁移到 Publishable/Secret Keys（推荐）

### 步骤 1: 创建新的 API Keys

1. **打开 Dashboard**
   - **Settings** → **API** → **API Keys** 页面
   - 点击 **"Go to API keys"** 按钮（如果在 Legacy JWT Secret 页面）

2. **创建 Publishable API Key（用于前端）**
   - 点击 **"New API Key"** 或 **"Create API Key"**
   - 选择类型：**Publishable**
   - 输入名称（例如：`client-web`）
   - 点击 **Create**
   - **立即复制并保存**新的 Publishable Key

3. **创建 Secret API Key（用于后端）**
   - 点击 **"New API Key"** 或 **"Create API Key"**
   - 选择类型：**Secret**
   - 输入名称（例如：`netlify-functions`）
   - 点击 **Create**
   - **立即复制并保存**新的 Secret Key（只显示一次）

---

### 步骤 2: 更新前端配置（使用 Publishable Key）

#### 2.1 更新 Netlify 环境变量

**客户端 Web (market-link-express.com)**:
```
REACT_APP_SUPABASE_ANON_KEY = <新的 Publishable API Key>
```

**后台管理 Web (admin-market-link-express.com)**:
```
REACT_APP_SUPABASE_ANON_KEY = <新的 Publishable API Key>
```

#### 2.2 更新 EAS Secrets（客户端 App）

```bash
cd ml-express-client

# 更新 Supabase Anon Key（使用新的 Publishable API Key）
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<新的 Publishable API Key>" --force
```

#### 2.3 更新本地 .env 文件

```bash
REACT_APP_SUPABASE_ANON_KEY=<新的 Publishable API Key>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<新的 Publishable API Key>
```

---

### 步骤 3: 更新后端配置（使用 Secret Key）

#### 3.1 更新 Netlify Functions

**客户端 Web 和后台管理 Web**:
```
SUPABASE_SERVICE_ROLE = <新的 Secret API Key>
```

**注意**: Netlify Functions 代码可能需要更新，因为新的 Secret API Key 可能使用不同的认证方式。

#### 3.2 检查 Netlify Functions 代码

**文件**: `ml-express-client-web/netlify/functions/send-email-code.js`
**文件**: `ml-express-client-web/netlify/functions/verify-email-code.js`

当前代码：
```javascript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
```

**可能需要更新为**:
```javascript
// 优先使用新的 Secret API Key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SECRET_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
```

---

### 步骤 4: 逐步部署和验证

1. **先更新前端**
   - 更新 Netlify 环境变量（使用新的 Publishable Key）
   - 重新部署前端
   - 验证前端功能正常

2. **再更新后端**
   - 更新 Netlify Functions 环境变量（使用新的 Secret Key）
   - 重新部署 Functions
   - 验证 Functions 功能正常

3. **验证所有功能**
   - 客户端 Web: 登录、注册、数据加载
   - 后台管理 Web: 管理员登录、数据加载
   - 客户端 App: 登录、数据加载
   - Netlify Functions: 发送验证码、验证验证码

---

### 步骤 5: 停用旧的 Legacy API Keys

**在所有功能验证正常后**:

1. **在 Dashboard → API Keys 页面**
2. **查找 Legacy API Keys 部分**
3. **停用旧的 anon/service_role**
   - 查找 **Disable** 或 **Revoke** 选项
   - 确认旧密钥已无"最近使用"记录
   - 停用旧密钥

---

## 📋 方案选择建议

### 选择方案 A（旋转 JWT Secret）如果：

- ✅ 需要立即让泄漏的密钥失效
- ✅ 可以接受短暂的停机时间（几分钟到几十分钟）
- ✅ 希望快速解决问题
- ✅ 团队可以快速响应并更新配置

### 选择方案 B（迁移到新系统）如果：

- ✅ 希望零停机过渡
- ✅ 需要更好的长期密钥管理
- ✅ 有足够时间进行迁移
- ✅ 希望使用 Supabase 推荐的新系统

---

## 🎯 我的推荐

**基于您的情况，我推荐：方案 B（迁移到新系统）**

**原因**:
1. ✅ 零停机风险（新旧密钥可同时存在）
2. ✅ 更好的长期安全性（可以独立管理密钥）
3. ✅ 符合 Supabase 推荐的最佳实践
4. ✅ 以后可以独立轮换密钥，不需要旋转 JWT Secret

**但如果您需要立即失效旧密钥**，可以选择方案 A。

---

## 📝 请告诉我您的选择

1. **您选择哪个方案？**
   - 方案 A: 旋转 JWT Secret（立即失效）
   - 方案 B: 迁移到 Publishable/Secret Keys（推荐）

2. **如果选择方案 A**:
   - 请告诉我新的 anon key 和 service_role key
   - 我会帮您立即更新所有配置

3. **如果选择方案 B**:
   - 请告诉我新的 Publishable API Key 和 Secret API Key
   - 我会帮您更新所有配置，并提供逐步迁移计划

---

## 🔍 需要的信息

无论选择哪个方案，请提供：

1. **新的密钥**:
   - 方案 A: 新的 anon key 和 service_role key
   - 方案 B: 新的 Publishable API Key 和 Secret API Key

2. **项目信息**（可选）:
   - 项目 ID
   - 当前部署方式（Netlify、EAS 等）

3. **您的偏好**:
   - 是否需要立即失效旧密钥？
   - 是否可以接受短暂停机？

---

**请告诉我您的选择，我会立即帮您更新所有配置！** 🚀

