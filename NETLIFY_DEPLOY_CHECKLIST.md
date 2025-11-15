# Netlify 部署检查清单

## 🚀 客户端 Web 部署到 Netlify

### 项目信息
- **Netlify 项目名**: `client-ml-express`
- **域名**: `market-link-express.com`
- **GitHub 仓库**: 你的仓库 URL

---

## ✅ 步骤 1：提交代码到 Git

```bash
cd /Users/aungmyatthu/Desktop/ml-express
git add ml-express-client-web/
git commit -m "优化客户端 Web UI：统一设计系统、导航栏、表单样式"
git push origin main
```

**状态**: ✅ 代码已提交

---

## ✅ 步骤 2：在 Netlify Dashboard 中配置

### 2.1 访问 Netlify Dashboard
1. 打开：https://app.netlify.com
2. 选择项目：**client-ml-express**

### 2.2 配置构建设置

**路径**: Site settings → Build & deploy → Build settings

确认以下设置：
- ✅ **Base directory**: `ml-express-client-web`
- ✅ **Build command**: `npm install && npm run build`
- ✅ **Publish directory**: `build`

### 2.3 配置环境变量

**路径**: Site settings → Environment variables

点击 **Add a variable**，添加以下 3 个变量：

#### 变量 1: REACT_APP_SUPABASE_URL
- **Key**: `REACT_APP_SUPABASE_URL`
- **Value**: `https://uopkyuluxnrewvlmutam.supabase.co`
- **Scopes**: ✅ Production, ✅ Deploy previews, ✅ Branch deploys

#### 变量 2: REACT_APP_SUPABASE_ANON_KEY
- **Key**: `REACT_APP_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY`
- **Scopes**: ✅ Production, ✅ Deploy previews, ✅ Branch deploys

#### 变量 3: REACT_APP_GOOGLE_MAPS_API_KEY
- **Key**: `REACT_APP_GOOGLE_MAPS_API_KEY`
- **Value**: `AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE`
- **Scopes**: ✅ Production, ✅ Deploy previews, ✅ Branch deploys

---

## ✅ 步骤 3：触发部署

### 方法 1：自动部署（推荐）
- 代码推送到 Git 后，Netlify 会自动检测并触发部署
- 在 **Deploys** 标签页查看部署进度

### 方法 2：手动触发
1. 在 Netlify Dashboard 中，点击 **Deploys** 标签页
2. 点击 **Trigger deploy** → **Deploy site**
3. 等待构建完成（通常需要 2-5 分钟）

---

## ✅ 步骤 4：验证部署

### 4.1 检查部署状态
- 访问：https://market-link-express.com
- 检查页面是否正常加载

### 4.2 检查环境变量
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签页
3. ✅ **如果没有看到警告**：环境变量已正确配置
4. ❌ **如果看到警告**：`⚠️ 警告：使用硬编码的 Supabase 密钥`，需要重新检查环境变量配置

### 4.3 功能测试
- [ ] 首页正常显示
- [ ] 导航栏正常
- [ ] 地图可以加载（需要 Google Maps API Key）
- [ ] 表单可以正常提交
- [ ] 包裹跟踪功能正常
- [ ] 多语言切换正常

---

## 📋 完整检查清单

### 代码
- [x] 代码已提交到 Git
- [x] 所有文件已添加到 Git

### Netlify 配置
- [ ] Base directory 已配置：`ml-express-client-web`
- [ ] Build command 已配置：`npm install && npm run build`
- [ ] Publish directory 已配置：`build`

### 环境变量
- [ ] `REACT_APP_SUPABASE_URL` 已配置
- [ ] `REACT_APP_SUPABASE_ANON_KEY` 已配置
- [ ] `REACT_APP_GOOGLE_MAPS_API_KEY` 已配置
- [ ] 所有环境变量的作用域已正确设置

### 部署
- [ ] 部署已触发
- [ ] 构建成功（无错误）
- [ ] 网站可以正常访问

### 功能验证
- [ ] 首页正常显示
- [ ] 地图功能正常
- [ ] 表单功能正常
- [ ] 跟踪功能正常

---

## 🔗 快速链接

- **Netlify Dashboard**: https://app.netlify.com
- **客户端 Web**: https://market-link-express.com
- **环境变量配置**: https://app.netlify.com/projects/client-ml-express/settings/env
- **构建设置**: https://app.netlify.com/projects/client-ml-express/settings/deploys
- **部署日志**: https://app.netlify.com/projects/client-ml-express/deploys

---

## 🆘 需要帮助？

如果遇到问题：
1. 查看构建日志中的错误信息
2. 检查环境变量是否正确配置
3. 确认 Base directory 设置正确
4. 检查域名 DNS 配置

