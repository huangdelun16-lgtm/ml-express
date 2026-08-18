# 客户端 Web Netlify 部署指南

## 📋 部署前检查清单

### 1. ✅ 代码已提交到 Git
确保所有更改已提交：
```bash
cd /Users/aungmyatthu/Desktop/ml-express
git add ml-express-client-web/
git commit -m "优化客户端 Web UI：统一设计系统、导航栏、表单样式"
git push origin main
```

### 2. ✅ Netlify 项目配置
- 项目名称：`client-ml-express`
- 域名：`market-link-express.com`
- Base directory：`ml-express-client-web`
- Build command：`npm install && npm run build`
- Publish directory：`build`

## 🔧 必需的环境变量配置

在 Netlify Dashboard 中配置以下环境变量：

### 访问 Netlify Dashboard
1. 登录 [Netlify Dashboard](https://app.netlify.com)
2. 选择项目：**client-ml-express**
3. 进入 **Site settings** → **Environment variables**

### 需要配置的环境变量

| 变量名 | 说明 | 必需 | 作用域 |
|--------|------|------|--------|
| `REACT_APP_SUPABASE_URL` | Supabase 项目 URL | ✅ 是 | Production, Deploy previews, Branch deploys |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | ✅ 是 | Production, Deploy previews, Branch deploys |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Google Maps API 密钥 | ✅ 是 | Production, Deploy previews, Branch deploys |

### 环境变量值

#### 1. REACT_APP_SUPABASE_URL
```
https://ml-supabase-proxy.huangdelun16.workers.dev
```

#### 2. REACT_APP_SUPABASE_ANON_KEY
```
[请从 Supabase Dashboard → Settings → API → API Keys 获取 Anon Key]
```

#### 3. REACT_APP_GOOGLE_MAPS_API_KEY
```
AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE
```

## 📝 配置步骤

### 步骤 1：添加环境变量

1. 在 Netlify Dashboard 中，进入 **Site settings** → **Environment variables**
2. 点击 **Add a variable**
3. 添加第一个变量：
   - **Key**: `REACT_APP_SUPABASE_URL`
   - **Value**: `https://ml-supabase-proxy.huangdelun16.workers.dev`
   - **Scopes**: 勾选 `Production`, `Deploy previews`, `Branch deploys`
   - 点击 **Save**

4. 重复步骤 2-3，添加其他两个变量

### 步骤 2：验证构建配置

在 **Site settings** → **Build & deploy** 中确认：

- **Base directory**: `ml-express-client-web`
- **Build command**: `npm install && npm run build`
- **Publish directory**: `build`

### 步骤 3：触发部署

#### 方法 1：自动部署（推荐）
- 推送代码到 Git 后，Netlify 会自动触发部署
- 在 **Deploys** 标签页查看部署状态

#### 方法 2：手动触发
1. 在 **Deploys** 标签页
2. 点击 **Trigger deploy** → **Deploy site**
3. 等待构建完成

## ✅ 部署后验证

### 1. 检查部署状态
- 访问：https://market-link-express.com
- 检查页面是否正常加载

### 2. 检查环境变量
打开浏览器控制台（F12），检查：
- ✅ 如果没有看到 `⚠️ 警告：使用硬编码的 Supabase 密钥`，说明环境变量已正确配置
- ✅ 如果看到警告，说明环境变量未正确配置，需要重新检查

### 3. 测试功能
- ✅ 首页是否正常显示
- ✅ 地图是否正常加载（需要 Google Maps API Key）
- ✅ 表单是否可以正常提交
- ✅ 包裹跟踪功能是否正常

## 🔍 常见问题

### Q: 部署失败？
**A**: 检查：
1. Base directory 是否正确设置为 `ml-express-client-web`
2. Build command 是否正确
3. 环境变量是否已配置
4. 查看构建日志中的错误信息

### Q: 环境变量未生效？
**A**: 
1. 确认环境变量名称正确（必须以 `REACT_APP_` 开头）
2. 确认作用域已勾选（Production, Deploy previews, Branch deploys）
3. 重新触发部署（环境变量更改后需要重新部署）

### Q: 地图无法加载？
**A**: 
1. 检查 `REACT_APP_GOOGLE_MAPS_API_KEY` 是否已配置
2. 检查 Google Maps API Key 是否有效
3. 检查 API Key 的域名限制设置

## 📊 部署检查清单

- [ ] 代码已提交到 Git
- [ ] Netlify 项目已创建（client-ml-express）
- [ ] Base directory 已配置（ml-express-client-web）
- [ ] Build command 已配置（npm install && npm run build）
- [ ] Publish directory 已配置（build）
- [ ] REACT_APP_SUPABASE_URL 已配置
- [ ] REACT_APP_SUPABASE_ANON_KEY 已配置
- [ ] REACT_APP_GOOGLE_MAPS_API_KEY 已配置
- [ ] 部署已触发
- [ ] 网站可以正常访问
- [ ] 功能测试通过

## 🎉 完成！

部署完成后，你的客户端 Web 将在 https://market-link-express.com 上运行！

