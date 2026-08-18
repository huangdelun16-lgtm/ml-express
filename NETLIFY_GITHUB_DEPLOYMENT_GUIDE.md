# 🚀 Netlify 和 GitHub 部署完整指南

## ✅ 当前状态

- ✅ **GitHub 仓库**: `https://github.com/huangdelun16-lgtm/ml-express.git`
- ✅ **最新代码**: 已推送到 main 分支
- ✅ **Netlify 配置**: `ml-express-client-web/netlify.toml` 已配置
- ⏳ **Netlify 部署**: 需要在 Dashboard 中配置

---

## 📋 第一步：确认 GitHub 代码已推送

### 检查当前状态
```bash
cd /Users/aungmyatthu/Desktop/ml-express
git status
git log --oneline -5
```

### 如果还有未提交的更改
```bash
git add .
git commit -m "更新城市前缀映射和部署配置"
git push origin main
```

**状态**: ✅ 代码已推送到 GitHub

---

## 🔧 第二步：Netlify 部署配置

### 2.1 访问 Netlify Dashboard

1. 打开浏览器，访问：**https://app.netlify.com**
2. 使用您的账号登录

### 2.2 创建新站点（如果还没有）

#### 方法 A：从 GitHub 导入（推荐）

1. 点击 **"Add new site"** → **"Import an existing project"**
2. 选择 **"GitHub"** 作为代码托管平台
3. 如果首次使用，需要授权 Netlify 访问您的 GitHub 账号
4. 在仓库列表中找到并选择：**`huangdelun16-lgtm/ml-express`**

#### 方法 B：手动创建

1. 点击 **"Add new site"** → **"Import an existing project"**
2. 选择 **"Deploy manually"**
3. 上传 `ml-express-client-web/build` 目录（需要先本地构建）

---

### 2.3 配置构建设置

**路径**: Site settings → Build & deploy → Build settings

#### 必需配置：

| 设置项 | 值 |
|--------|-----|
| **Base directory** | `ml-express-client-web` |
| **Build command** | `npm install && npm run build` |
| **Publish directory** | `build` |
| **Node version** | `18` (在 Environment variables 中设置) |

#### 配置步骤：

1. 在 Netlify Dashboard 中，选择您的站点
2. 进入 **Site settings** → **Build & deploy** → **Build settings**
3. 点击 **"Edit settings"**
4. 设置以下值：
   - **Base directory**: `ml-express-client-web`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `build`
5. 点击 **"Save"**

---

### 2.4 配置环境变量

**路径**: Site settings → Environment variables

#### 必需的环境变量

点击 **"Add a variable"**，添加以下 3 个变量：

#### 变量 1: REACT_APP_SUPABASE_URL

- **Key**: `REACT_APP_SUPABASE_URL`
- **Value**: `https://db.market-link-express.com`
- **Scopes**: 
  - ✅ Production
  - ✅ Deploy previews
  - ✅ Branch deploys

#### 变量 2: REACT_APP_SUPABASE_ANON_KEY

- **Key**: `REACT_APP_SUPABASE_ANON_KEY`
- **Value**: `[请从 Supabase Dashboard → Settings → API → API Keys 获取 Anon Key]`
- **Scopes**: 
  - ✅ Production
  - ✅ Deploy previews
  - ✅ Branch deploys

#### 变量 3: REACT_APP_GOOGLE_MAPS_API_KEY

- **Key**: `REACT_APP_GOOGLE_MAPS_API_KEY`
- **Value**: `AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE`
- **Scopes**: 
  - ✅ Production
  - ✅ Deploy previews
  - ✅ Branch deploys

#### 配置步骤：

1. 在 Netlify Dashboard 中，选择您的站点
2. 进入 **Site settings** → **Environment variables**
3. 点击 **"Add a variable"**
4. 依次添加上述 3 个变量
5. 确保每个变量的作用域都勾选了 Production、Deploy previews 和 Branch deploys
6. 点击 **"Save"**

---

### 2.5 配置域名（可选）

**路径**: Site settings → Domain management

#### 如果您有自定义域名：

1. 进入 **Site settings** → **Domain management**
2. 点击 **"Add custom domain"**
3. 输入您的域名（例如：`market-link-express.com`）
4. 按照提示配置 DNS 记录

#### DNS 配置示例：

**如果使用 Netlify DNS**:
```
A Record: @ → 75.2.60.5
CNAME Record: www → your-site.netlify.app
```

**如果使用外部 DNS**:
```
CNAME Record: @ → your-site.netlify.app
CNAME Record: www → your-site.netlify.app
```

---

## 🚀 第三步：触发部署

### 方法 1：自动部署（推荐）

1. 确保代码已推送到 GitHub main 分支
2. Netlify 会自动检测到新的提交
3. 在 **Deploys** 标签页查看部署进度
4. 等待部署完成（通常需要 2-5 分钟）

### 方法 2：手动触发

1. 在 Netlify Dashboard 中，选择您的站点
2. 进入 **Deploys** 标签页
3. 点击 **"Trigger deploy"** → **"Deploy site"**
4. 选择分支：`main`
5. 点击 **"Deploy"**

---

## ✅ 第四步：验证部署

### 检查部署状态

1. 在 **Deploys** 标签页查看最新部署
2. 状态应该显示为 **"Published"**（绿色）
3. 如果有错误，点击部署查看详细日志

### 访问网站

部署成功后，您可以通过以下方式访问：

- **Netlify 默认域名**: `https://your-site-name.netlify.app`
- **自定义域名**: `https://market-link-express.com`（如果已配置）

### 功能测试

访问网站后，测试以下功能：

- ✅ 首页加载正常
- ✅ 地图显示正常（需要 Google Maps API Key）
- ✅ 订单创建功能
- ✅ 订单跟踪功能
- ✅ 用户注册/登录功能

---

## 🔍 常见问题排查

### 问题 1：构建失败

**可能原因**:
- 环境变量未配置
- Node 版本不兼容
- 依赖安装失败

**解决方法**:
1. 检查 **Deploys** 标签页的构建日志
2. 确认所有环境变量已正确配置
3. 在 Environment variables 中添加 `NODE_VERSION = "18"`

### 问题 2：地图无法加载

**可能原因**:
- Google Maps API Key 未配置或错误
- API Key 限制设置不正确

**解决方法**:
1. 检查 `REACT_APP_GOOGLE_MAPS_API_KEY` 环境变量
2. 在 Google Cloud Console 中检查 API Key 的限制设置
3. 确保允许的 HTTP referrers 包含您的 Netlify 域名

### 问题 3：Supabase 连接失败

**可能原因**:
- Supabase URL 或 Key 配置错误
- 网络问题

**解决方法**:
1. 检查 `REACT_APP_SUPABASE_URL` 和 `REACT_APP_SUPABASE_ANON_KEY` 环境变量
2. 确认 Supabase 项目状态正常
3. 检查浏览器控制台的错误信息

---

## 📝 部署检查清单

在完成部署前，请确认：

- [ ] GitHub 代码已推送到 main 分支
- [ ] Netlify 站点已创建并连接到 GitHub 仓库
- [ ] Base directory 设置为 `ml-express-client-web`
- [ ] Build command 设置为 `npm install && npm run build`
- [ ] Publish directory 设置为 `build`
- [ ] `REACT_APP_SUPABASE_URL` 环境变量已配置
- [ ] `REACT_APP_SUPABASE_ANON_KEY` 环境变量已配置
- [ ] `REACT_APP_GOOGLE_MAPS_API_KEY` 环境变量已配置
- [ ] 所有环境变量的作用域都正确设置
- [ ] 部署状态为 "Published"
- [ ] 网站可以正常访问
- [ ] 主要功能测试通过

---

## 🎯 快速部署命令

如果您想快速重新部署，可以使用以下命令：

```bash
# 1. 提交并推送代码
cd /Users/aungmyatthu/Desktop/ml-express
git add .
git commit -m "更新部署配置"
git push origin main

# 2. Netlify 会自动检测并部署
# 或者在 Netlify Dashboard 中手动触发部署
```

---

## 📞 需要帮助？

如果遇到问题：

1. 查看 Netlify 构建日志：**Deploys** → 点击失败的部署 → 查看日志
2. 检查浏览器控制台：F12 → Console 标签
3. 查看 Netlify 文档：https://docs.netlify.com

---

## ✅ 部署完成

部署成功后，您的客户端 Web 应用将可以通过以下地址访问：

- **Netlify 默认域名**: `https://your-site-name.netlify.app`
- **自定义域名**: `https://market-link-express.com`（如果已配置）

**恭喜！您的应用已成功部署！** 🎉

