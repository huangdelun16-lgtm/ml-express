# Netlify 配置步骤（需要在 Dashboard 中手动配置）

## 当前状态

- **client-ml-express** 项目：Base directory 已设置为 `ml-express-client-web` ✅
- **market-link-express** 项目：已有 `market-link-express.com` 域名

## 需要完成的配置

### 1. 修复 client-ml-express 的构建配置

**问题：** `dir` 应该设置为 `ml-express-client-web/build`，但目前是 `build`

**解决步骤：**

1. 访问：https://app.netlify.com/projects/client-ml-express
2. 进入 **Site settings** → **Build & deploy**
3. 在 **Build settings** 中：
   - **Base directory**: `ml-express-client-web` ✅ (已正确)
   - **Build command**: `npm install && npm run build` ✅ (已正确)
   - **Publish directory**: `ml-express-client-web/build` ⚠️ (需要修改为这个)
4. 点击 **Save**

### 2. 配置域名

#### 步骤 A：为 client-ml-express 添加 market-link-express.com

1. 访问：https://app.netlify.com/projects/client-ml-express
2. 进入 **Site settings** → **Domain management**
3. 点击 **Add custom domain**
4. 输入：`market-link-express.com`
5. 按照提示配置 DNS 记录

#### 步骤 B：从 market-link-express 移除 market-link-express.com

1. 访问：https://app.netlify.com/projects/market-link-express
2. 进入 **Site settings** → **Domain management**
3. 找到 `market-link-express.com`
4. 点击 **Remove** 或 **Unlink**
5. 确认移除

#### 步骤 C：为 market-link-express 添加 admin-market-link-express.com

1. 在 **market-link-express** 项目中
2. 进入 **Site settings** → **Domain management**
3. 点击 **Add custom domain**
4. 输入：`admin-market-link-express.com`
5. 按照提示配置 DNS 记录

### 3. DNS 配置

在你的域名注册商（如 GoDaddy, Namecheap）配置 DNS：

#### 选项 1：使用 CNAME 记录（推荐）

```
类型    主机名    值
CNAME   admin     market-link-express.netlify.app
CNAME   @         client-ml-express.netlify.app
```

#### 选项 2：使用 Netlify DNS（最简单）

1. 在 Netlify Dashboard 中，进入 **Site settings** → **Domain management**
2. 点击 **Use Netlify DNS**
3. 按照提示更新域名注册商的 nameservers

### 4. 环境变量配置

#### client-ml-express 项目（客户端 Web）

1. 访问：https://app.netlify.com/projects/client-ml-express
2. 进入 **Site settings** → **Environment variables**
3. 添加以下变量：
   - `REACT_APP_SUPABASE_URL` = `https://uopkyuluxnrewvlmutam.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY` = (你的 Supabase Anon Key)
   - `REACT_APP_GOOGLE_MAPS_API_KEY` = (你的 Google Maps API Key)

#### market-link-express 项目（后台管理）

确保已配置相同的环境变量。

### 5. 触发重新构建

配置完成后，触发重新构建：

1. 在 **client-ml-express** 项目中
2. 进入 **Deploys** 标签
3. 点击 **Trigger deploy** → **Deploy site**

## 验证配置

配置完成后：

1. **客户端 Web**: https://market-link-express.com
2. **后台管理**: https://admin-market-link-express.com

## 重要提示

- DNS 配置可能需要几分钟到几小时才能生效
- 确保两个项目都配置了正确的环境变量
- 如果构建失败，检查构建目录配置是否正确

