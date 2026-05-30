# Netlify 环境变量配置指南

## 🔍 问题诊断

如果访问 `https://app.netlify.com/projects/market-link-express/settings/env` 显示 "Page not found"，可能是：

1. **项目名称不正确**
2. **URL 路径错误**
3. **权限问题**

## ✅ 正确的配置方法

### 方法 1: 通过 Netlify Dashboard（推荐）

1. **登录 Netlify Dashboard**
   - 访问：https://app.netlify.com
   - 使用您的账户登录

2. **找到项目**
   - 在 Dashboard 首页，找到项目列表
   - 查找名为 `market-link-express` 的项目
   - 如果找不到，尝试搜索其他可能的名称：
     - `admin-market-link-express`
     - `ml-express-admin`
     - 或查看所有项目

3. **进入项目设置**
   - 点击项目名称进入项目详情页
   - 在左侧菜单中，点击 **Site settings**
   - 然后点击 **Environment variables**

4. **添加环境变量**
   点击 **Add variable** 按钮，添加以下变量：

   ```
   Key: REACT_APP_SUPABASE_URL
   Value: [您的 Supabase URL]
   ```

   ```
   Key: REACT_APP_SUPABASE_ANON_KEY
   Value: [您的 Supabase Anon Key]
   ```

   ```
   Key: JWT_SECRET
   Value: [生成一个随机字符串，至少 32 字符]
   ```

   **生成 JWT_SECRET 的方法**：
   ```bash
   # 在终端运行
   openssl rand -base64 32
   ```
   或者使用在线工具生成随机字符串。

5. **保存并重新部署**
   - 添加完所有变量后，点击 **Save**
   - 进入 **Deploys** 标签
   - 点击 **Trigger deploy** → **Deploy site**

### 方法 2: 通过 Netlify CLI

如果您安装了 Netlify CLI：

```bash
# 登录
netlify login

# 链接到项目
netlify link

# 设置环境变量
netlify env:set REACT_APP_SUPABASE_URL "您的 Supabase URL"
netlify env:set REACT_APP_SUPABASE_ANON_KEY "您的 Supabase Anon Key"
netlify env:set JWT_SECRET "您的 JWT 密钥"

# 重新部署
netlify deploy --prod
```

### 方法 3: 通过 netlify.toml（不推荐用于敏感信息）

敏感信息（如密钥）不应该提交到 Git，但可以在 `netlify.toml` 中设置非敏感的环境变量：

```toml
[build.environment]
  REACT_APP_SUPABASE_URL = "您的 Supabase URL"
```

⚠️ **注意**：不要将 `JWT_SECRET` 和 `REACT_APP_SUPABASE_ANON_KEY` 放在 `netlify.toml` 中！

---

## 🔧 检查当前配置

### 检查环境变量是否已设置

1. 在 Netlify Dashboard 中
2. 进入项目 → **Site settings** → **Environment variables**
3. 确认以下变量存在：
   - ✅ `REACT_APP_SUPABASE_URL`
   - ✅ `REACT_APP_SUPABASE_ANON_KEY`
   - ✅ `JWT_SECRET` ⚠️ **这个最重要！**

### 检查函数日志

1. 在 Netlify Dashboard 中
2. 进入项目 → **Functions** 标签
3. 点击 `admin-password` 函数
4. 查看 **Logs** 标签
5. 查找错误信息，特别是：
   - "JWT_SECRET" 相关的警告
   - Cookie 设置相关的日志

---

## 🐛 常见问题

### 问题 1: 找不到项目

**解决方案**：
- 确认项目名称是否正确
- 检查是否有多个 Netlify 账户
- 尝试访问：https://app.netlify.com/teams/[您的团队名]/sites

### 问题 2: 环境变量设置了但不起作用

**解决方案**：
- 确认变量名称拼写正确（区分大小写）
- 重新部署应用（环境变量更改后必须重新部署）
- 检查是否有多个环境（Production、Deploy previews、Branch deploys）

### 问题 3: JWT_SECRET 未设置

**症状**：
- 登录后立即返回登录页面
- 401 Unauthorized 错误
- 函数日志显示 "使用默认 JWT_SECRET" 警告

**解决方案**：
- 立即设置 `JWT_SECRET` 环境变量
- 生成一个强随机字符串（至少 32 字符）
- 重新部署应用

---

## 📋 必需的环境变量清单

### 后台管理项目 (`market-link-express`)

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `REACT_APP_SUPABASE_URL` | Supabase 项目 URL | ✅ 是 | `https://xxx.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ 是 | `eyJhbGc...` |
| `JWT_SECRET` | JWT 签名密钥 | ✅ 是 | `随机字符串（32+字符）` |
| `SUPABASE_SERVICE_ROLE` | Supabase Service Role Key | ⚠️ 可选 | `eyJhbGc...` |

---

## 🚀 快速修复步骤

1. **登录 Netlify Dashboard**
   ```
   https://app.netlify.com
   ```

2. **找到项目**
   - 在项目列表中查找 `market-link-express`
   - 或搜索包含 "market" 或 "express" 的项目

3. **设置环境变量**
   - 进入 **Site settings** → **Environment variables**
   - 添加 `JWT_SECRET`（如果还没有）
   - 确认其他变量已设置

4. **重新部署**
   - 进入 **Deploys** 标签
   - 点击 **Trigger deploy** → **Deploy site**

5. **清除浏览器缓存**
   - 按 `Ctrl + Shift + Delete`
   - 清除 Cookie 和缓存

6. **重新登录**
   - 访问：https://admin-market-link-express.com/admin/login
   - 输入用户名和密码

---

## 🔗 相关链接

- Netlify Dashboard: https://app.netlify.com
- Netlify 文档: https://docs.netlify.com/environment-variables/overview/
- Supabase Dashboard: https://app.supabase.com

---

**最后更新**: 2024年12月
