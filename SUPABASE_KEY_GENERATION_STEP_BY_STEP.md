# 🔑 Supabase 密钥生成完整步骤指南

## ⚠️ 重要说明

**我无法直接访问您的 Supabase Dashboard**，但我可以为您提供详细的步骤指导。

---

## 📍 当前状态确认

根据您的描述：
- ✅ **Secret Key**: 已生成新的
- ⏳ **Anon Key**: 需要生成新的

---

## 🎯 您需要做什么

### 情况 1: 如果您在 "JWT Keys" 页面

**JWT Keys 页面 ≠ API Keys 页面**

- **JWT Keys**: 用于签名和验证 JWT token（通常不需要手动重置）
- **API Keys**: 用于访问 Supabase API（Anon Key 和 Service Role Key）

**操作**: 您需要切换到 **"API Keys"** 页面，而不是 JWT Keys 页面。

---

### 情况 2: 如果您在 "API Keys" 页面

#### 步骤 1: 找到 Anon Public Key

在 API Keys 页面中，您应该看到两个部分：
1. **Anon Public Key** (anon public)
2. **Service Role Secret Key** (service_role secret)

#### 步骤 2: 重置 Anon Key

**方法 A: 直接重置（如果有 Reset 按钮）**
1. 在 **Anon Public Key** 字段右侧找到 **"Reset"** 或 **"Regenerate"** 按钮
2. 点击按钮
3. 确认操作
4. 复制新的 Anon Key

**方法 B: 通过 JWT Secret 重置（如果没有 Reset 按钮）**
1. 切换到 **"Legacy JWT Secret"** 标签页
2. 找到 **"Reset JWT Secret"** 或 **"Regenerate"** 按钮
3. ⚠️ **注意**: 这会同时重置 Anon Key 和 Service Role Key
4. 由于您已经生成了新的 Secret Key，重置后需要**再次更新 Secret Key**

---

## 🔄 推荐操作流程

### 选项 1: 只重置 Anon Key（推荐）

1. **在 Supabase Dashboard 中**
   - 进入 **Settings** → **API** → **API Keys**
   - 找到 **"Anon Public Key"** 部分
   - 点击右侧的 **"Reset"** 按钮（如果有）
   - 确认重置
   - 复制新的 Anon Key

2. **如果 API Keys 页面没有 Reset 按钮**
   - 切换到 **Settings** → **API** → **JWT Keys**
   - 点击 **"Legacy JWT Secret"** 标签页
   - 找到 **"Reset JWT Secret"** 按钮
   - ⚠️ **警告**: 这会重置所有密钥（包括您刚生成的 Secret Key）
   - 重置后，需要重新复制新的 Secret Key 和 Anon Key

---

### 选项 2: 通过 JWT Secret 重置（如果选项 1 不可用）

如果您在 JWT Keys 页面看到 "Legacy JWT Secret" 标签页：

1. **重置 JWT Secret**
   - 点击 **"Reset JWT Secret"** 或 **"Regenerate"** 按钮
   - 确认操作

2. **获取新的密钥**
   - 重置后，切换到 **API Keys** 页面
   - 复制新的 **Anon Public Key**
   - 复制新的 **Service Role Secret Key**（需要点击 Reveal）

3. **更新环境变量**
   - 更新 Netlify `REACT_APP_SUPABASE_ANON_KEY`（新的 Anon Key）
   - 更新 Netlify `SUPABASE_SERVICE_ROLE`（新的 Secret Key）
   - 更新 EAS `EXPO_PUBLIC_SUPABASE_ANON_KEY`（新的 Anon Key）

---

## 📋 详细操作步骤（按页面分类）

### 页面 A: API Keys 页面

**路径**: Settings → API → API Keys

**您应该看到**:
- Anon Public Key（显示完整的密钥）
- Service Role Secret Key（显示为 `****`，需要 Reveal）

**操作**:
1. 找到 Anon Public Key 右侧的 **"Reset"** 按钮
2. 点击 Reset
3. 确认操作
4. 复制新的 Anon Key

---

### 页面 B: JWT Keys 页面

**路径**: Settings → API → JWT Keys

**您应该看到**:
- "JWT Signing Keys" 标签页
- "Legacy JWT Secret" 标签页

**操作**:
1. 切换到 **"Legacy JWT Secret"** 标签页
2. 找到 **"Reset JWT Secret"** 或 **"Regenerate"** 按钮
3. 点击按钮
4. ⚠️ **警告**: 这会重置所有密钥
5. 重置后，切换到 **API Keys** 页面获取新密钥

---

## 🆘 如果找不到 Reset 按钮

### 可能的原因：

1. **权限问题**
   - 确认您有项目管理员权限
   - 尝试刷新页面

2. **UI 更新**
   - Supabase 可能更新了界面
   - 尝试查找 "Regenerate"、"Rotate" 或类似的按钮

3. **需要联系支持**
   - 如果完全找不到重置选项
   - 可以联系 Supabase 支持团队

---

## ✅ 重置后的操作清单

### 立即执行：

1. **复制新的 Anon Key**
   - 从 Supabase Dashboard → API Keys 页面复制
   - 保存到安全位置（密码管理器）

2. **更新 Netlify 环境变量**
   - 客户端 Web: `REACT_APP_SUPABASE_ANON_KEY`
   - 后台管理 Web: `REACT_APP_SUPABASE_ANON_KEY`

3. **更新 EAS Secrets**
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<新的 Anon Key>" --force
   ```

4. **更新本地 .env 文件**
   ```bash
   REACT_APP_SUPABASE_ANON_KEY=<新的 Anon Key>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<新的 Anon Key>
   ```

5. **重新部署**
   - Netlify: 触发重新部署
   - App: 重新构建（如果需要）

---

## 🔍 验证步骤

重置并更新后，测试以下功能：

1. **客户端 Web**
   - 访问网站
   - 测试登录
   - 测试注册
   - 确认数据加载正常

2. **后台管理 Web**
   - 访问管理后台
   - 测试管理员登录
   - 确认数据加载正常

3. **客户端 App**
   - 测试登录功能
   - 测试数据加载

4. **Netlify Functions**
   - 测试发送验证码
   - 测试验证验证码

---

## 📞 需要帮助？

如果遇到问题，请告诉我：
1. 您当前在哪个页面？（API Keys 还是 JWT Keys）
2. 您看到了哪些按钮？（Reset、Regenerate、或其他）
3. 是否有任何错误消息？

我可以根据您的具体情况提供更精确的指导。

---

**最后更新**: 2024-12-XX

