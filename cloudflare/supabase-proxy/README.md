# Supabase Cloudflare Worker 反代

缅甸部分 ISP 会拦截 `*.supabase.co`（DNS，以及可能的 IPv6）。网站本身（Netlify）一般能打开，但浏览器 / App 访问 `uopkyuluxnrewvlmutam.supabase.co` 会失败。本 Worker 把全部 Supabase 流量透明反代到上游，让客户端改走自定义域名。

| | |
|---|---|
| 生产公网 URL | `https://db.market-link-express.com` |
| 上游 | `https://uopkyuluxnrewvlmutam.supabase.co` |
| 覆盖路径 | `/rest/v1/*`、`/auth/v1/*`、`/storage/v1/*`、`/functions/v1/*`、`/realtime/v1/*`（含 WebSocket） |

Worker **不存放** service-role key。Anon key / JWT 由客户端在请求头里携带。

不要用 Netlify `_redirects` / 反向代理做这件事：它们无法正确转发 Realtime 的 `Upgrade: websocket`。

## 部署

在本目录执行：

```bash
npx wrangler deploy
```

首次需要登录 Cloudflare（`npx wrangler login`）。部署成功后会得到一个 `*.workers.dev` 临时地址，可先把某个客户端的 `REACT_APP_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL` 指过去做联通测试。

## 绑定自定义域名

1. 在 Cloudflare 为 `market-link-express.com` 的 DNS 增加 `db` 记录（CNAME 到该 Worker 的 `workers.dev` 主机名，或按 Cloudflare 给该 Worker 绑定自定义域名时提示的记录）。
2. 把自定义域名 `db.market-link-express.com` 绑到本 Worker。
3. 用浏览器或 `curl` 确认 `https://db.market-link-express.com/auth/v1/health`（或任意 `/rest/v1/` 带 anon key 的探测）能打到上游。

DNS 生效后，再改各站点 / EAS 的客户端 URL（见下方清单）。切勿把 Netlify Functions 的 `SUPABASE_URL` 改成这个域名。

## 运维清单（一次性）

按顺序做，先让反代可访问，再切客户端。

1. **`npx wrangler deploy`**（本目录）
2. **DNS + 自定义域名**：`db.market-link-express.com` 指向本 Worker
3. **三个 Web 的 Netlify 环境变量**（只改客户端用的 `REACT_APP_SUPABASE_URL`，不要改 Functions 用的 `SUPABASE_URL`）：
   - Admin（仓库根目录站点）
   - `ml-express-client-web`
   - `ml-express-merchant-web`
   - 值：`https://db.market-link-express.com`
   - 改完后重新部署这三个站点（CRA 会把 `REACT_APP_*` 打进前端包）
4. **四个 Expo App 的 EAS 环境变量** `EXPO_PUBLIC_SUPABASE_URL=https://db.market-link-express.com`，然后 **重新出包**：
   - `ml-express-client`
   - `ml-express-merchant-app`
   - `ml-express-mobile-app`（STAFF；`app.json` extra.supabaseUrl 也会打进包）
   - `ml-express-inventory-app`（若在独立仓库：改 `app.config.js` extra.supabaseUrl 后 EAS rebuild）
5. **服务端保持直连**：Netlify Functions / Edge Functions 继续使用 `https://uopkyuluxnrewvlmutam.supabase.co`（`SUPABASE_URL`）。那些机器不在缅甸封锁范围内。

若浏览器出现 CORS 报错，在 Supabase 项目里把现有 Web 源（`https://market-link-express.com` 等）继续留在允许列表中即可——浏览器的 `Origin` 仍是站点域名，不是 `db.` 反代域名。
