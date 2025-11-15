# Netlify 环境变量配置指南

## 客户端 Web (market-link-express.com)

在 Netlify Dashboard 中，为**客户端 Web 站点**添加以下环境变量：

### 必需的环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `REACT_APP_SUPABASE_URL` | Supabase 项目 URL | `https://uopkyuluxnrewvlmutam.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase 匿名密钥 (Anon Key) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Google Maps API 密钥 | `AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE` |

### 如何获取这些值

#### 1. Supabase URL 和 Key
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 复制：
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **anon public** key → `REACT_APP_SUPABASE_ANON_KEY`

#### 2. Google Maps API Key
1. 登录 [Google Cloud Console](https://console.cloud.google.com)
2. 进入 **APIs & Services** → **Credentials**
3. 找到你的 API Key 或创建新的
4. 复制到 `REACT_APP_GOOGLE_MAPS_API_KEY`

## 后台管理 Web (admin-market-link-express.com)

在 Netlify Dashboard 中，为**后台管理 Web 站点**添加相同的环境变量：

| 变量名 | 说明 |
|--------|------|
| `REACT_APP_SUPABASE_URL` | 同上 |
| `REACT_APP_SUPABASE_ANON_KEY` | 同上 |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | 同上 |

**注意：** 两个站点使用相同的 Supabase 数据库，所以使用相同的 URL 和 Key。

## 在 Netlify Dashboard 中配置步骤

### 方法 1：通过 Dashboard 界面

1. 登录 [Netlify Dashboard](https://app.netlify.com)
2. 选择你的站点（客户端或后台管理）
3. 进入 **Site settings** → **Environment variables**
4. 点击 **Add a variable**
5. 添加每个变量：
   - **Key**: `REACT_APP_SUPABASE_URL`
   - **Value**: 你的 Supabase URL
   - **Scopes**: 选择 `Production`, `Deploy previews`, `Branch deploys`（如果需要）
6. 重复步骤 4-5 添加其他变量
7. 点击 **Save**

### 方法 2：通过 Netlify CLI

```bash
# 设置环境变量（客户端 Web）
cd ml-express-client-web
netlify env:set REACT_APP_SUPABASE_URL "https://uopkyuluxnrewvlmutam.supabase.co"
netlify env:set REACT_APP_SUPABASE_ANON_KEY "你的anon key"
netlify env:set REACT_APP_GOOGLE_MAPS_API_KEY "你的google maps key"

# 设置环境变量（后台管理 Web）
cd ..  # 回到根目录
netlify env:set REACT_APP_SUPABASE_URL "https://uopkyuluxnrewvlmutam.supabase.co"
netlify env:set REACT_APP_SUPABASE_ANON_KEY "你的anon key"
netlify env:set REACT_APP_GOOGLE_MAPS_API_KEY "你的google maps key"
```

## 环境变量作用域

建议为所有环境变量设置以下作用域：
- ✅ **Production** - 生产环境
- ✅ **Deploy previews** - 预览部署
- ✅ **Branch deploys** - 分支部署

这样所有部署都能使用这些变量。

## 验证配置

部署后，检查浏览器控制台：
- 如果看到 `⚠️ 警告：使用硬编码的 Supabase 密钥`，说明环境变量未正确配置
- 如果没有警告，说明环境变量已正确加载

## 安全提示

1. **不要**在代码中硬编码密钥（虽然代码中有回退值，但仅用于开发）
2. **不要**将 `.env` 文件提交到 Git
3. **使用** Netlify Dashboard 的环境变量功能
4. **定期**轮换 API 密钥（如果可能）

## 当前使用的值（参考）

根据代码，当前使用的默认值：

```
REACT_APP_SUPABASE_URL=https://uopkyuluxnrewvlmutam.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE
```

**建议：** 在 Netlify 中配置这些值，而不是依赖代码中的硬编码值。

