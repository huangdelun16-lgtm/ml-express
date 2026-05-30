# Netlify 域名与三站点配置

> **以该表为准，避免把商家端推成管理后台、或把客户端推错站。**

| 生产域名 | 代码目录 | Netlify Site ID | `package.json` 中 `deploy:netlify` |
|----------|----------|-------------------|-------------------------------------|
| `https://market-link-express.com` | `ml-express-client-web` | `52f5f573-ca0a-4769-a8c7-e5f675764056` | `ml-express-client-web` |
| `https://mlexpress-merchants.com` | `ml-express-merchant-web` | `126af2b9-244f-47fd-9be9-58fb45b6e7a2` | `ml-express-merchant-web` |
| `https://admin-market-link-express.com` | 仓库**根目录** | `ed9c2173-4031-4f10-a466-5b041dfe3511` | 仓库**根** |

- 每个 Netlify 站点在 **Build settings** 里设置正确的 **Base directory**；三个自定义域名应分别挂在**三个**不同站点上，不要复用错。
- 在子目录执行 `netlify deploy` 前，请 `netlify link --id <上表 ID>` 或使用各目录的 `npm run deploy:netlify`（已带 `--site`），否则会部署到**当前 link 的站点**。

---

## 历史说明（两站点时代的命名）

1. **client-ml-express** (ID: `52f5f573-ca0a-4769-a8c7-e5f675764056`)
   - 自定义域名: `market-link-express.com`（客户端 Web）
   - 构建目录: 必须为 **`ml-express-client-web`**

2. **market-link-express** (ID: `ed9c2173-4031-4f10-a466-5b041dfe3511`)
   - 自定义域名: `admin-market-link-express.com`（Admin 后台）
   - 构建目录: 仓库根目录

## 本机 Netlify CLI 与多子项目（易错点）

`netlify link` 可能只把**一个** `siteId` 记在全局/父目录，导致在 `ml-express-merchant-web` 里 deploy 却推到 **admin** 站。

在仓库内可按目录写入 **`.netlify/state.json`**（该目录在 `.gitignore` 中，需每人本地各一份或部署时用 `--site`）：

| 目录 | `siteId` 文件内容 |
|------|------------------|
| 仓库根 `/` | `{"siteId":"ed9c2173-4031-4f10-a466-5b041dfe3511"}` |
| `ml-express-client-web/` | `{"siteId":"52f5f573-ca0a-4769-a8c7-e5f675764056"}` |
| `ml-express-merchant-web/` | `{"siteId":"126af2b9-244f-47fd-9be9-58fb45b6e7a2"}` |

或在各目录执行：`npx netlify link --id <上表 ID>`。部署时优先使用各目录的 **`npm run deploy:netlify`**（已带 `--site`）。

---

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

