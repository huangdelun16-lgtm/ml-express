# Supabase Cloudflare Worker 反代

缅甸部分 ISP 会拦截 `*.supabase.co`（DNS，以及可能的 IPv6）。网站本身（Netlify）一般能打开，但浏览器 / App 访问 `uopkyuluxnrewvlmutam.supabase.co` 会失败。本目录是已上线 Worker 的版本库副本；**当前生产客户端必须打到已有的 `workers.dev` 地址**，不要再等自定义域名。

| | |
|---|---|
| **当前生产公网 URL** | `https://ml-supabase-proxy.huangdelun16.workers.dev` |
| 上游 | `uopkyuluxnrewvlmutam.supabase.co`（Worker 环境变量 `SUPABASE_HOSTNAME`） |
| 覆盖路径 | `/rest/v1/*`、`/auth/v1/*`、`/storage/v1/*`、`/functions/v1/*`、`/realtime/v1/*`（含 WebSocket） |
| 可选自定义域名 | `db.market-link-express.com` — **以后**把 apex 区迁到 Cloudflare 再绑；现在 DNS 仍在 Netlify，免费套餐无法只接入子域 |

Worker **不存放** service-role key。Anon key / JWT 由客户端在请求头里携带。

不要用 Netlify `_redirects` / 反向代理做这件事：它们无法正确转发 Realtime 的 `Upgrade: websocket`。

已验证：`GET /auth/v1/health` 与 `/rest/v1/` 能打到真实项目（无 apikey 时 401，`sb-project-ref` 为 `uopkyuluxnrewvlmutam`）。

## 部署（已有线上 Worker）

生产 Worker 名称是 `ml-supabase-proxy`，公网地址已是 `https://ml-supabase-proxy.huangdelun16.workers.dev`。本目录仅作源码备份；不要再新建一个平行 Worker。

若需更新已有 Worker：

```bash
npx wrangler deploy
```

首次需要登录 Cloudflare（`npx wrangler login`）。

## 以后可选：自定义域名

`market-link-express.com` 目前不是 Cloudflare zone（DNS 仍在 Netlify），因此现在绑不了 `db.market-link-express.com`。等 apex 区迁到 Cloudflare 之后，再把该主机名绑到 `ml-supabase-proxy`，并把客户端 URL 从 `workers.dev` 切过去。

切勿把 Netlify Functions 的 `SUPABASE_URL` 改成 `workers.dev` 或将来的自定义域名。

## 运维清单

1. 生产反代已上线：`https://ml-supabase-proxy.huangdelun16.workers.dev`（无需等自定义域名）
2. **三个 Web 的 Netlify 环境变量**（只改客户端用的 `REACT_APP_SUPABASE_URL`，不要改 Functions 用的 `SUPABASE_URL`）：
   - Admin（仓库根目录站点）
   - `ml-express-client-web`
   - `ml-express-merchant-web`
   - 值：`https://ml-supabase-proxy.huangdelun16.workers.dev`
   - 改完后重新部署这三个站点（CRA 会把 `REACT_APP_*` 打进前端包）
3. **四个 Expo App 的 EAS 环境变量** `EXPO_PUBLIC_SUPABASE_URL=https://ml-supabase-proxy.huangdelun16.workers.dev`，然后 **重新出包**：
   - `ml-express-client`
   - `ml-express-merchant-app`
   - `ml-express-mobile-app`（STAFF；`app.json` extra.supabaseUrl 也会打进包）
   - `ml-express-inventory-app`（若在独立仓库：改 `app.config.js` extra.supabaseUrl 后 EAS rebuild）
4. **服务端保持直连**：Netlify Functions / Edge Functions 继续使用 `https://uopkyuluxnrewvlmutam.supabase.co`（`SUPABASE_URL`）。不要指向 `workers.dev`。

若浏览器出现 CORS 报错，在 Supabase 项目里把现有 Web 源（`https://market-link-express.com` 等）继续留在允许列表中即可——浏览器的 `Origin` 仍是站点域名，不是反代主机名。
