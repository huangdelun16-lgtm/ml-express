# Netlify 域名配置指南

## 当前项目状态

你有两个 Netlify 项目：

1. **client-ml-express** (ID: 52f5f573-ca0a-4769-a8c7-e5f675764056)
   - 当前 URL: https://client-ml-express.netlify.app
   - 应该使用域名: `market-link-express.com` (客户端 Web)
   - 构建目录: `ml-express-client-web`

2. **market-link-express** (ID: ed9c2173-4031-4f10-a466-5b041dfe3511)
   - 当前 URL: https://market-link-express.com
   - 应该使用域名: `admin-market-link-express.com` (后台管理)
   - 构建目录: 根目录

## 需要配置的步骤

### 1. 配置 client-ml-express 项目（客户端 Web）

在 Netlify Dashboard 中：

1. 进入 `client-ml-express` 项目
2. 进入 **Site settings** → **Build & deploy**
3. 在 **Build settings** 中配置：
   - **Base directory**: `ml-express-client-web`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `ml-express-client-web/build`
4. 保存设置

### 2. 配置域名

#### 为 client-ml-express 配置 `market-link-express.com`

1. 在 `client-ml-express` 项目中
2. 进入 **Site settings** → **Domain management**
3. 点击 **Add custom domain**
4. 输入: `market-link-express.com`
5. 按照提示配置 DNS 记录

#### 为 market-link-express 配置 `admin-market-link-express.com`

1. 在 `market-link-express` 项目中
2. 进入 **Site settings** → **Domain management**
3. 点击 **Add custom domain**
4. 输入: `admin-market-link-express.com`
5. 按照提示配置 DNS 记录

### 3. DNS 配置

在你的域名注册商（如 GoDaddy, Namecheap）配置 DNS：

#### 选项 1：使用 CNAME 记录（推荐）

```
类型    名称    值
CNAME   admin   market-link-express.netlify.app
CNAME   @       client-ml-express.netlify.app
```

#### 选项 2：使用 A 记录

如果 Netlify 提供 IP 地址，使用 A 记录：
- 联系 Netlify 支持获取 IP 地址
- 或者使用 Netlify DNS（推荐）

### 4. 环境变量配置

#### client-ml-express 项目（客户端 Web）

在 Netlify Dashboard 中配置：
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_GOOGLE_MAPS_API_KEY`

#### market-link-express 项目（后台管理）

确保已配置：
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_GOOGLE_MAPS_API_KEY`

## 使用 Netlify CLI 配置（可选）

### 配置 client-ml-express 构建设置

```bash
# 切换到客户端项目目录
cd ml-express-client-web

# 链接到 client-ml-express 项目
netlify link --name client-ml-express

# 或者使用项目 ID
netlify link --id 52f5f573-ca0a-4769-a8c7-e5f675764056
```

### 添加域名

```bash
# 为 client-ml-express 添加域名
netlify domains:add market-link-express.com

# 为 market-link-express 添加域名
netlify domains:add admin-market-link-express.com --site-id ed9c2173-4031-4f10-a466-5b041dfe3511
```

## 验证配置

配置完成后：

1. **客户端 Web**: 访问 https://market-link-express.com
2. **后台管理**: 访问 https://admin-market-link-express.com

## 重要提示

- DNS 配置可能需要几分钟到几小时才能生效
- 确保两个项目都配置了正确的环境变量
- 如果构建失败，检查构建目录配置是否正确

