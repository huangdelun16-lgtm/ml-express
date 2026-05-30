# 🔑 Supabase 新 API Keys 系统指南

## 📋 重要发现

根据您看到的页面，Supabase 已经**迁移到了新的 API Keys 系统**！

**关键信息**：
- Legacy JWT Secret 已经迁移到新的 JWT Signing Keys
- Legacy API Keys (anon 和 service_role) 现在可能已经迁移到新的系统
- 需要使用新的 **Publishable API Keys** 和 **Secret API Keys**

---

## 🎯 解决方案

### 步骤 1: 点击 "Go to API keys" 按钮

在 Legacy JWT Secret 页面中，您应该看到一个警告框，里面有：

**"Go to API keys"** 按钮（带外部链接图标）

**操作**：
1. 点击 **"Go to API keys"** 按钮
2. 这会带您到新的 API Keys 管理页面

---

### 步骤 2: 在新的 API Keys 页面查找

在新的 API Keys 页面，您应该看到：

1. **Publishable API Keys**（新的 Anon Key 替代品）
   - 可以安全地在客户端使用
   - 受 RLS 保护
   - 这就是您需要的新的 "Anon Key"

2. **Secret API Keys**（新的 Service Role Key 替代品）
   - 只能在服务器端使用
   - 具有完全访问权限
   - 这就是您需要的新的 "Secret Key"

---

### 步骤 3: 创建或查看新的 API Keys

**如果看到 "Create API Key" 或类似的按钮**：
1. 点击创建新的 Publishable API Key
2. 复制新的密钥
3. 这就是您的新 Anon Key

**如果已经存在 API Keys**：
1. 查看现有的 Publishable API Key
2. 如果需要重置，查找 Reset 或 Regenerate 按钮
3. 或者创建新的 API Key

---

## 🔄 迁移步骤

### 1. 获取新的 Publishable API Key

在新的 API Keys 页面：
1. 查找 **Publishable API Keys** 部分
2. 如果已有密钥，复制它
3. 如果没有，点击 **"Create API Key"** 或 **"New API Key"** 创建新的

### 2. 获取新的 Secret API Key

在新的 API Keys 页面：
1. 查找 **Secret API Keys** 部分
2. 如果已有密钥，点击 **Reveal** 查看
3. 如果没有，创建新的 Secret API Key

---

## 📝 更新配置

### 更新 Netlify 环境变量

#### 客户端 Web (market-link-express.com)
- `REACT_APP_SUPABASE_ANON_KEY` = `<新的 Publishable API Key>`
- `SUPABASE_SERVICE_ROLE` = `<新的 Secret API Key>`

#### 后台管理 Web (admin-market-link-express.com)
- `REACT_APP_SUPABASE_ANON_KEY` = `<新的 Publishable API Key>`
- `SUPABASE_SERVICE_ROLE` = `<新的 Secret API Key>`

### 更新 EAS Secrets（客户端 App）

```bash
cd ml-express-client

# 更新 Supabase Anon Key（使用新的 Publishable API Key）
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<新的 Publishable API Key>" --force
```

### 更新本地 .env 文件

```bash
REACT_APP_SUPABASE_ANON_KEY=<新的 Publishable API Key>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<新的 Publishable API Key>
```

---

## ⚠️ 重要说明

### Legacy API Keys vs 新的 API Keys

1. **Legacy API Keys** (已弃用)
   - `anon` key (旧的 Anon Key)
   - `service_role` key (旧的 Secret Key)
   - 这些密钥仍然有效，但 Supabase 建议迁移到新系统

2. **新的 API Keys** (推荐)
   - **Publishable API Keys** (替代 anon key)
   - **Secret API Keys** (替代 service_role key)
   - 这是 Supabase 推荐的新系统

### 迁移建议

1. **立即迁移到新系统**
   - 使用新的 Publishable API Key 替代旧的 Anon Key
   - 使用新的 Secret API Key 替代旧的 Service Role Key

2. **更新所有配置**
   - Netlify 环境变量
   - EAS Secrets
   - 本地 .env 文件

3. **测试功能**
   - 确保所有功能正常工作
   - 确认数据可以正常访问

---

## 🔍 如果找不到新的 API Keys 页面

### 方法 1: 直接访问

尝试直接访问：
```
https://app.supabase.com/project/[project-id]/settings/api/keys
```

### 方法 2: 通过菜单导航

1. 在 Supabase Dashboard 左侧菜单
2. 点击 **Settings**
3. 点击 **API**
4. 查找 **"API Keys"** 或 **"Keys"** 选项
5. 应该可以看到新的 API Keys 管理界面

---

## 📋 操作检查清单

### 在新 API Keys 页面

- [ ] 已点击 "Go to API keys" 按钮
- [ ] 已找到 Publishable API Keys 部分
- [ ] 已找到 Secret API Keys 部分
- [ ] 已创建或复制新的 Publishable API Key
- [ ] 已创建或复制新的 Secret API Key

### 更新配置

- [ ] 已更新 Netlify 客户端 Web 的 `REACT_APP_SUPABASE_ANON_KEY`
- [ ] 已更新 Netlify 后台管理 Web 的 `REACT_APP_SUPABASE_ANON_KEY`
- [ ] 已更新 Netlify 的 `SUPABASE_SERVICE_ROLE`（如果需要）
- [ ] 已更新 EAS Secrets 的 `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 已更新本地 `.env` 文件

### 重新部署

- [ ] 已重新部署客户端 Web
- [ ] 已重新部署后台管理 Web
- [ ] 已测试所有功能正常工作

---

## 🆘 如果仍然找不到

如果点击 "Go to API keys" 后仍然找不到新的 API Keys：

1. **检查 URL**
   - 确认您是否在正确的页面
   - URL 应该包含 `/settings/api/keys` 或类似路径

2. **查看页面内容**
   - 页面显示了什么？
   - 有哪些选项或按钮？

3. **联系 Supabase 支持**
   - 说明您需要迁移到新的 API Keys 系统
   - 请求帮助创建新的 Publishable API Key

---

## 💡 关键提示

**新的系统更安全**：
- Publishable API Keys 可以安全地在客户端使用
- Secret API Keys 只能在服务器端使用
- 更好的密钥管理和轮换机制

**迁移的好处**：
- 更好的安全性
- 更容易管理密钥
- 支持密钥轮换和撤销

---

**请告诉我**：
1. 点击 "Go to API keys" 后，您看到了什么页面？
2. 是否看到了 Publishable API Keys 和 Secret API Keys？
3. 如果看到了，请告诉我新的密钥，我可以帮您更新所有配置！

