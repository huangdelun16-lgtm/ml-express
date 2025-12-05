# Netlify 部署指南

本指南将帮助您将 ML Express 客户端 Web 应用部署到 Netlify。

## 📋 前置要求

1. 已注册 Netlify 账户
2. 代码已推送到 GitHub 仓库
3. 已准备好以下环境变量值：
   - Supabase URL
   - Supabase Anon Key
   - Google Maps API Key

## 🚀 部署步骤

### 步骤 1: 在 Netlify 创建新站点

1. 登录 [Netlify Dashboard](https://app.netlify.com/)
2. 点击 **"Add new site"** → **"Import an existing project"**
3. 选择 **"GitHub"** 作为 Git 提供商
4. 授权 Netlify 访问您的 GitHub 仓库（如果尚未授权）
5. 选择仓库：`huangdelun16-lgtm/ml-express`

### 步骤 2: 配置构建设置

在 **"Configure build"** 部分，设置以下内容：

- **Base directory**: `ml-express-client-web`
- **Build command**: `npm install && npm run build`
- **Publish directory**: `ml-express-client-web/build`

> ⚠️ **重要**: 由于项目在子目录中，必须设置 **Base directory** 为 `ml-express-client-web`

### 步骤 3: 配置环境变量

在部署之前，需要配置以下环境变量：

1. 在 Netlify Dashboard 中，进入 **Site settings** → **Environment variables**
2. 点击 **"Add variable"**，添加以下变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `REACT_APP_SUPABASE_URL` | Supabase 项目 URL | `https://uopkyuluxnrewvlmutam.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Google Maps API 密钥 | `AIzaSy...` |

> 🔒 **安全提示**: 这些是敏感信息，请确保只在 Netlify Dashboard 中配置，不要提交到 Git 仓库。

### 步骤 4: 部署

1. 点击 **"Deploy site"** 开始部署
2. 等待构建完成（通常需要 2-5 分钟）
3. 部署成功后，您会看到一个自动生成的 Netlify URL（例如：`https://random-name-123.netlify.app`）

### 步骤 5: 配置自定义域名（可选）

如果您有自定义域名（如 `market-link-express.com`）：

1. 在 Netlify Dashboard 中，进入 **Site settings** → **Domain management**
2. 点击 **"Add custom domain"**
3. 输入您的域名
4. 按照 Netlify 的指示配置 DNS 记录：
   - 添加 A 记录指向 Netlify 的 IP
   - 或添加 CNAME 记录指向 Netlify 的域名

## 📁 项目结构

```
ml-express-client-web/
├── netlify.toml          # Netlify 配置文件（已配置）
├── netlify/
│   └── functions/        # Netlify Functions（邮件验证码）
├── src/                  # 源代码
├── public/               # 静态资源
└── build/                # 构建输出（部署目录）
```

## ⚙️ 配置文件说明

### netlify.toml

已配置的内容：
- ✅ 构建命令和发布目录
- ✅ SPA 路由重定向（支持 React Router）
- ✅ 缓存控制头
- ✅ Netlify Functions 路径

### 环境变量

所有环境变量必须在 Netlify Dashboard 中配置，**不要**在代码中硬编码。

## 🔄 自动部署

配置完成后，Netlify 会自动：
- 监听 GitHub 仓库的 `main` 分支
- 当有新的 commit 推送到 `main` 分支时，自动触发部署
- 每次部署都会使用最新的代码和配置

## 🐛 常见问题

### 1. 构建失败：找不到模块

**原因**: 依赖未正确安装

**解决**: 确保 `package.json` 中的依赖都已正确配置，Netlify 会自动运行 `npm install`

### 2. 页面刷新后 404

**原因**: React Router 路由未正确配置

**解决**: 已通过 `netlify.toml` 中的重定向规则解决，确保配置已生效

### 3. 环境变量未生效

**原因**: 环境变量名称错误或未正确配置

**解决**: 
- 检查环境变量名称是否以 `REACT_APP_` 开头
- 确保在 Netlify Dashboard 中正确配置
- 重新部署站点

### 4. Google Maps 不显示

**原因**: Google Maps API Key 未配置或无效

**解决**:
- 检查 `REACT_APP_GOOGLE_MAPS_API_KEY` 是否正确配置
- 确保 API Key 已启用 Google Maps JavaScript API
- 检查 API Key 的域名限制设置

### 5. Supabase 连接失败

**原因**: Supabase 环境变量未配置或错误

**解决**:
- 检查 `REACT_APP_SUPABASE_URL` 和 `REACT_APP_SUPABASE_ANON_KEY` 是否正确
- 确保 Supabase 项目的 RLS（Row Level Security）策略允许匿名访问

## 📞 获取帮助

如果遇到问题：
1. 查看 Netlify 的构建日志
2. 检查浏览器控制台的错误信息
3. 确认所有环境变量都已正确配置

## ✅ 部署检查清单

- [ ] GitHub 仓库已连接
- [ ] Base directory 设置为 `ml-express-client-web`
- [ ] Build command 设置为 `npm install && npm run build`
- [ ] Publish directory 设置为 `ml-express-client-web/build`
- [ ] `REACT_APP_SUPABASE_URL` 已配置
- [ ] `REACT_APP_SUPABASE_ANON_KEY` 已配置
- [ ] `REACT_APP_GOOGLE_MAPS_API_KEY` 已配置
- [ ] 首次部署成功
- [ ] 自定义域名已配置（如需要）

---

**部署完成后，您的应用将在 Netlify 上运行！** 🎉

