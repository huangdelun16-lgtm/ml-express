# MARKET LINK EXPRESS — AI 与维护者架构指南

本文档概括本仓库（**market-link-express / ml-express**）内所有产品形态、目录职责、数据边界、关键业务流程与部署关系，便于后续改需求或让 AI 快速建立上下文。**若本指南与代码不一致，以仓库当前文件为准，并请同步更新本文件。**

---

## 目录

1. [仓库总览](#1-仓库总览)
    - [1.1 仓库目录树](#11-仓库目录树)
2. [生产域名与部署矩阵](#2-生产域名与部署矩阵)
    - [2.1 缅甸网络与 `/__sb` 代理（必读）](#21-缅甸网络与-__sb-代理必读)
3. [子项目一览](#3-子项目一览)
3.1. [各子项目架构详解（总览）](#31-各子项目架构详解总览)
4. [管理后台（仓库根 `src/`）](#4-管理后台仓库根-src)
5. [会员端网站 `ml-express-client-web`](#5-会员端网站-ml-express-client-web)
6. [商家端网站 `ml-express-merchant-web`](#6-商家端网站-ml-express-merchant-web)
7. [会员 App `ml-express-client`](#7-会员-app-ml-express-client)
8. [商家 App `ml-express-merchant-app`](#8-商家-app-ml-express-merchant-app)
9. [骑手/员工 App `ml-express-mobile-app`](#9-骑手员工-app-ml-express-mobile-app)
10. [Inventory 中转站 App `ml-express-inventory-app`](#10-inventory-中转站-app-ml-express-inventory-app)
    - [10.2 A 发站出库 / B 到站签收（必读）](#102-业务双线划分a-发站出库--b-到站签收)
    - [10.12 JWT 写入守卫与到站三步](#1012-jwt-写入守卫与到站三步)
11. [Admin 跨境物流控制台](#11-admin-跨境物流控制台)
    - [11.4 跨境客户编码与按客户计费](#114-跨境客户编码与按客户计费)
12. [中转物流业务流（MUSE → MDY → YGN）](#12-中转物流业务流muse--mdy--ygn)
13. [共享代码层 `/shared`](#13-共享代码层-shared)
14. [Supabase 与数据模型](#14-supabase-与数据模型)
15. [Netlify 与 EAS 部署](#15-netlify-与-eas-部署)
16. [环境变量](#16-环境变量)
17. [常见问题与排障](#17-常见问题与排障)
18. [给 AI / 维护者的改代码提示](#18-给-ai--维护者的改代码提示)
19. [常用文件速查](#19-常用文件速查)
20. [版本与分支](#20-版本与分支)
21. [CI 与质量门禁](#21-ci-与质量门禁)
22. [架构记忆恢复卡（全仓速记）](#22-架构记忆恢复卡全仓速记)

---

## 1. 仓库总览

本仓库是 **多包单体仓库（monorepo）**，但 **没有 npm workspaces**：根目录即 **管理后台 Web**；其余业务线为子目录独立应用，**各自**依赖 Supabase、各自独立部署（Netlify 静态站 / EAS 应用）。

```mermaid
flowchart TB
  subgraph clients [C 端用户]
    CW[ml-express-client-web\nReact SPA 会员站]
    CA[ml-express-client\nExpo 会员 App]
  end
  subgraph merchants [B 端商家]
    MW[ml-express-merchant-web\nReact SPA]
    MA[ml-express-merchant-app\nExpo 商家 App]
  end
  subgraph ops [运营与配送]
    ADM[src/* 管理后台 CRA]
    RIDER[ml-express-mobile-app\nExpo 骑手端 STAFF]
    INV[ml-express-inventory-app\nExpo 中转站库存]
  end
  SH[/shared\n跨端共享纯逻辑/]
  SB[(Supabase\nPostgreSQL + Auth + Storage + Realtime)]
  NF[Netlify\n静态站 + Functions + /__sb Edge BFF]
  CF[Cloudflare Worker\nsupabase-proxy 备份]
  CW --> NF
  CA --> NF
  MW --> NF
  MA --> NF
  ADM --> NF
  RIDER --> NF
  INV --> NF
  NF --> SB
  CF --> SB
  SH -. sync .-> CW
  SH -. sync .-> CA
  SH -. sync .-> MW
  SH -. sync .-> MA
  SH -. sync .-> ADM
  SH -. sync .-> RIDER
```

> 缅甸直连 `*.supabase.co` 会 TLS reset。生产 REST/Auth/Storage **一律走各站点同源 `/__sb/`**（见 §2.1）。Realtime WebSocket **不能**经 Netlify rewrite 升级；生产 Admin **轮询**，不要打 `wss://*.workers.dev`。

### 两条业务线（勿混表）

| 业务线 | 典型表 | 典型 App / 模块 |
|--------|--------|-----------------|
| **City 配送 / 商城 / 跑腿** | `packages`、`orders`、`products`、`couriers`… | 会员/商家/骑手 App + 管理后台 City 模块 |
| **中转站库存 / 跨境包裹** | `inventory_*`、`cross_border_customers`、`cross_border_manual_entries` | `ml-express-inventory-app` + Admin **跨境物流** |

### 认证体系概览

| 端 | 登录方式 | 会话存储 |
|----|----------|----------|
| 会员 Web/App | `users` 表（customer）邮箱/手机 + 密码 | `localStorage` / `AsyncStorage`（**不含商家登录**） |
| 商家 Web/App | Web：`delivery_stores` 客户端比对（待对齐）；**App**：Netlify `merchant-password`（**无客户端明文密码兜底**） | `localStorage` / `AsyncStorage` |
| 骑手 App | `admin_accounts` + Netlify `admin-password` + `ensure-courier-auth`（**无客户端明文密码兜底**） | `AsyncStorage`（`persistSession: false`） |
| 管理后台 | `admin-password` 登录 + `verify-admin` HMAC Cookie（**无**客户端明文/`admin`/`admin` 回退；令牌仅服务端签发） | httpOnly Cookie + 本地令牌副本（Cookie 丢失时 Bearer） |
| Inventory App | `inventory-store-login` Edge Function → Supabase Auth JWT | SecureStore + Supabase Auth |

### 1.1 仓库目录树

无 npm workspaces。根目录就是 Admin Web；其余业务线各自 `package.json`、各自部署。

```
ml-express/                          # 仓库根 = Admin Web（market-link-express）
├── AI_GUIDE.md                      # 本文件：全仓架构（与代码不一致时以代码为准并改这里）
├── package.json                     # Admin CRA 2.2.4
├── src/                             # Admin 前端
│   ├── App.tsx                      # React Router v6
│   ├── pages/                       # 运营页（City / 财务 / 跨境 / 指标…）
│   ├── components/                  # CrossBorder*、GlobalToast…
│   ├── services/                    # supabase.ts、inventoryConsoleService、authService
│   ├── hooks/                       # useSupabaseRealtime（生产不订阅 WS）
│   ├── utils/                       # supabaseBrowserUrl、crossBorderCustomerCode…
│   └── styles/
├── public/
├── netlify.toml                     # Admin 构建 + [[edge_functions]] /__sb/*
├── netlify/
│   ├── functions/                   # Admin / 商家登录 / 跨境 CRUD
│   └── edge-functions/supabase-bff.js   # 同源代理到 supabase.co（剥 __cf_bm）
├── cloudflare/supabase-proxy/       # Worker 备份；生产 Admin 不要用其 Realtime WS
├── supabase/
│   ├── migrations/                  # 64 个 SQL（City + Inventory 同库隔离）
│   └── functions/                   # inventory-store-login 等 4 个 Edge Functions
├── shared/                          # 跨端纯逻辑源；sync 到各端 _shared/（不含 Inventory）
├── ml-express-client-web/           # 会员站 market-link-express.com
├── ml-express-merchant-web/         # 商家站 mlexpress-merchants.com
├── ml-express-client/               # 会员 App com.mlexpress.client
├── ml-express-merchant-app/         # 商家 App com.mlexpress.merchants
├── ml-express-mobile-app/           # 骑手 STAFF com.mlexpress.courier（无 src/ 前缀）
├── ml-express-inventory-app/        # 中转站 App com.mlexpress.inventory
├── scripts/                         # CI typecheck、运维脚本
├── .github/workflows/typecheck.yml
├── docs/                            # 现行文档；历史排障在 docs/archive/
├── design/  specs/
└── supabase/.temp/                  # CLI 缓存，勿提交
```

---

## 2. 生产域名与部署矩阵

| 产品 | 典型域名 / 渠道 | 说明 |
|------|-----------------|------|
| 会员 Web | `https://market-link-express.com` | `ml-express-client-web`；同源 `/__sb/` |
| 管理后台 | **`https://admin-market-link-express.com`** | 仓库根 CRA + Functions + Edge `/__sb`；备用 `*.netlify.app` |
| 商家 Web | `https://mlexpress-merchants.com` | `ml-express-merchant-web`；同源 `/__sb/` |
| Inventory App Support | `https://market-link-express.com/support` | App Store Support URL |
| Inventory iOS / Android | App Store / 内测 APK `com.mlexpress.inventory` | EAS，当前 **2.0.0 (34)** |
| 会员 App | `com.mlexpress.client` | EAS **2.8.0 (74)**；原生 REST 走 `market-link-express.com/__sb/` |
| 商家 App | `com.mlexpress.merchants` | EAS **2.5.4 (24)**；原生 REST 走 `mlexpress-merchants.com/__sb/` |
| 骑手 App | `com.mlexpress.courier` | EAS **2.4.3 (81)**；原生 REST 走 `admin-market-link-express.com/__sb/` |
| Inventory 原生 | 同上 Admin 域 `/__sb/` | `nativeSupabaseUrl.ts`；**必须尾斜杠** |
| Supabase 上游 | `uopkyuluxnrewvlmutam.supabase.co` | 全端共用同一项目；缅甸客户端勿直连 |
| Cloudflare 备份 | `ml-supabase-proxy.huangdelun16.workers.dev` | 仅诊断/备份；**生产 Admin 勿拨其 WS** |

> ⚠️ 勿在 App Store 使用无效域名（如 `linkexpress.com/support`）；Support URL 必须可访问。

### 2.1 缅甸网络与 `/__sb` 代理（必读）

缅甸运营商对 `*.supabase.co`（以及部分 `*.workers.dev`）常见 **TLS reset**。生产路径：

```
App / 浏览器
  → https://<本站域名>/__sb/rest/v1/...   （基址必须带尾斜杠 /__sb/）
  → Netlify Edge `supabase-bff`（优先）或 `[[redirects]]` 200 rewrite
  → uopkyuluxnrewvlmutam.supabase.co
```

| 层 | 文件 | 要点 |
|----|------|------|
| Admin / 会员 Web / 商家 Web 浏览器 | `src/utils/supabaseBrowserUrl.ts`（及各 Web 副本） | 生产 `resolveBrowserSupabaseUrl` → `origin/__sb/`；本地 `localhost` 可直连上游 |
| Netlify Edge BFF（**仅 Admin 根站**） | `netlify/edge-functions/supabase-bff.js` | `netlify.toml` `[[edge_functions]] path = "/__sb/*"`；**剥掉 `Set-Cookie __cf_bm`**（Firefox 会拒跨域 cookie）；响应 `Cache-Control: no-store`（避免到站确认后 GET 仍返回「在途」） |
| Netlify rewrite | 各站 `netlify.toml` `from = "/__sb/*"` | 会员/商家 Web **只有** 200 rewrite（无 Edge BFF）；**不能**升级 WebSocket |
| Cloudflare Worker | `cloudflare/supabase-proxy/`；根脚本 `deploy:supabase-proxy` | 备份通道；Realtime 路径存在，但缅甸拨 Worker WS 同样会断 |
| Inventory 原生 | `ml-express-inventory-app/src/services/nativeSupabaseUrl.ts` | 生产基址 `https://admin-market-link-express.com/__sb/`；`EXPO_PUBLIC_SUPABASE_DIRECT=1` 仅 VPN 可达 supabase.co 时使用 |
| Inventory fetch | `ml-express-inventory-app/src/services/supabase.ts` | 对 `/rest/v1`、`/functions/v1` **强制 Authorization = 店铺 access_token**（`shouldAttachInventoryUserJwt`）；**不要**改 `/auth/v1` |
| Admin Realtime | `src/hooks/useSupabaseRealtime.ts` + `isBrowserRealtimeAvailable()` | 生产 `/__sb` 下 **不订阅**；仪表盘/跟踪页 **轮询** |

**硬规则**

1. supabase-js `new URL('rest/v1', base)` 在 base **没有尾斜杠**时会丢掉 `/__sb`。任何 native/browser 基址必须写成 `…/__sb/`。
2. 不要把生产 Admin Realtime 指到 `wss://ml-supabase-proxy.huangdelun16.workers.dev`。
3. 不要让 Inventory REST 带着 **anon key** 写 `inventory_*`（RLS 会拒，文案常是 `syncRlsBlocked`）。
4. 不要给 `/__sb` GET 加缓存；到站确认后立刻 GET 必须看到新状态。

---

## 3. 子项目一览

| 目录 | 类型 | 角色 | 技术栈 | 当前版本 | 部署 |
|------|------|------|--------|----------|------|
| **`/`（仓库根）** | Web | **管理后台**：订单、用户、财务、跟踪、告警、合伙店铺、报表、跨境物流 | CRA + TS + React Router **v6** | **2.2.4** | Netlify（根目录） |
| **`ml-express-client-web/`** | Web | **会员端网站**：首页、商城、购物车、账户、Support | CRA + TS + React Router **v7** | **0.1.0** | Netlify |
| **`ml-express-merchant-web/`** | Web | **商家端网站**：门店订单/商品/对账 | CRA + TS + React Router **v7** | **0.1.0** | Netlify |
| **`ml-express-client/`** | Mobile | **会员 App** `com.mlexpress.client` | Expo SDK 54 / RN 0.81 | **2.8.0 (74)** | EAS |
| **`ml-express-merchant-app/`** | Mobile | **商家 App** `com.mlexpress.merchants` | Expo SDK 54 / RN 0.81 | **2.5.4 (24)** | EAS |
| **`ml-express-mobile-app/`** | Mobile | **骑手/员工端** `com.mlexpress.courier` | Expo SDK 54 / RN 0.81 | **2.4.3 (81)** | EAS |
| **`ml-express-inventory-app/`** | Mobile | **中转站库存 App** `com.mlexpress.inventory` | Expo SDK 54 + Supabase Auth JWT + `/__sb` + 蓝牙打印 | **2.0.0 (34)** | EAS |
| **`shared/`** | 共享源 | 跨端纯逻辑单一源 | TS | — | sync 进各 app |
| **`netlify/`** | 服务端 | Functions + Edge `supabase-bff` | Node | — | `/__sb` |
| **`cloudflare/supabase-proxy/`** | 边缘 | Worker 备份代理 | JS | — | `deploy:supabase-proxy` |
| **`supabase/`** | 数据 | SQL migrations + Edge Functions | SQL / Deno | — | Supabase Cloud |
| **`design/` `specs/` `scripts/` `docs/`** | 资源 | 设计、规格、CI 脚本、归档文档 | — | — | — |

> 根 `package.json` 的 `name` 为 `market-link-express`，**代码职责是管理后台**；勿与 `ml-express-client-web` 站点混用 Base directory。

> 历史排障文档已归档至 `docs/archive/`；构建产物（apk/aab/zip）不入库（见 `.gitignore`）。

---

## 3.1 各子项目架构详解（总览）

以下为 **8 个可部署子项目** 的统一架构说明。改代码前先确认业务线（§1）与认证方式（§1 认证表）。

### 架构分层（通用模式）

```
┌─────────────────────────────────────────┐
│  UI 层：pages/screens/components        │
├─────────────────────────────────────────┤
│  状态层：contexts/hooks                 │
├─────────────────────────────────────────┤
│  业务层：services/*.ts（巨型 supabase.ts│
│          或 inventoryService 等）        │
├─────────────────────────────────────────┤
│  共享逻辑：/shared → 各 app _shared/    │
├─────────────────────────────────────────┤
│  数据层：Supabase JS / Netlify Fn / RPC │
│          （Inventory 另有 45s 内存缓存）  │
└─────────────────────────────────────────┘
```

### 3.1.1 管理后台（仓库根 `/`）

| 维度 | 说明 |
|------|------|
| **定位** | 内部运营：City 包裹/财务/跟踪/告警 + 跨境物流控制台 + 指标/代购 |
| **入口** | `src/index.tsx`（生产 console 门禁）→ `src/App.tsx`（React Router **v6**） |
| **UI** | `src/pages/`（约 39 个页面文件）、`AdminShellLayout`；全屏独立模块见 §4.3 |
| **业务层** | `src/services/supabase.ts`（City 主业务）、`inventoryConsoleService.ts`（跨境）、`authService.ts` |
| **服务端** | `netlify/functions/`（Admin JWT 校验、跨境 CRUD、短信/邮件） |
| **认证** | `admin-password` + `verify-admin` HMAC；角色 `admin\|manager\|operator\|finance` + `permissionId`。**不要**把 Admin 会话接到会员/商家/骑手或 Inventory JWT。 |
| **数据** | 生产浏览器走同源 `/__sb/`（anon key 读 City）；跨境写操作经 Netlify Function + service role |
| **共享** | `prebuild` → `sync:shared` → `src/services/_shared/` |
| **体验** | `FeedbackService` + `GlobalToast`：非确认提示走 Toast；`window.confirm` 仅确认/破坏性操作；生产 `installProductionConsoleGate`（**无 Sentry**，勿擅自加） |
| **部署** | Netlify site `ed9c2173-…`；`npm run deploy:netlify` |

### 3.1.2 会员 Web（`ml-express-client-web/`）

| 维度 | 说明 |
|------|------|
| **定位** | C 端官网：着陆、商城、购物车、账户、合规/Support |
| **入口** | `src/index.tsx`（生产 console 门禁 + Sentry）→ `src/App.tsx`（React Router **v7**） |
| **UI** | `src/pages/`（14 页）；`LanguageProvider`、`CartProvider`；`GlobalToast` |
| **业务层** | `src/services/supabase.ts` + `_shared/` |
| **服务端** | `netlify/functions/`：`merchant-apply`、`send-sms`、`send-statement` 等 |
| **认证** | `users`（customer）→ `localStorage`（`ml-express-customer`）；**非 Supabase Auth** |
| **体验** | `FeedbackService` + `GlobalToast`：非确认提示走 Toast；`window.confirm` 仅确认/破坏性操作；生产 `installProductionConsoleGate`；**已有** `@sentry/react`（`sentryInit`），可保留 |
| **路由** | `/`、`/mall`、`/cart`、`/profile`、`/support`、`/ml-inventory/privacy`、合规页 |
| **部署** | Netlify site `52f5f573-…`；Base directory = 本子目录 |

### 3.1.3 商家 Web（`ml-express-merchant-web/`）

| 维度 | 说明 |
|------|------|
| **定位** | B 端轻量后台：门店资料、商品、订单跟踪 |
| **入口** | `src/index.tsx`（生产 console 门禁）→ `src/App.tsx`（Router **v7**） |
| **UI** | `LoginPage`、`ProfilePage`、`StoreProductsPage`、`TrackingPage`；`OrderModal` 4 步下单向导；`GlobalToast` |
| **业务层** | `src/services/supabase.ts` + `_shared/`（含 `merchantLoginGuard`） |
| **认证** | `delivery_stores` 店铺码 + 密码 → `localStorage`；**拒绝** `transit_station` |
| **体验** | `FeedbackService` + `GlobalToast`：非确认提示走 Toast；`window.confirm` 仅确认/破坏性操作；生产 `installProductionConsoleGate`（**无 Sentry**，勿擅自加） |
| **路由** | `/login` → `/`（Profile）、`/products`、订单经 Profile/Tracking |
| **部署** | Netlify site `126af2b9-…` |

### 3.1.4 会员 App（`ml-express-client/`）

| 维度 | 说明 |
|------|------|
| **定位** | C 端原生：下单、追踪、商城、充值、通知（**仅 customer**；商家运营请用 `ml-express-merchant-app`） |
| **入口** | `index.js` → `App.tsx`（React Navigation 6 Native Stack） |
| **UI** | `src/screens/`（16 Screen）、`src/components/` |
| **状态** | `AppContext`、`CartContext`、`LoadingContext` |
| **业务层** | `supabase.ts` + `clientApi/`、`DatabaseService.ts`（SQLite 缓存）、`notificationService.ts`、`appUpdateService.ts` |
| **工具** | `mediaAccess.ts`（Android Photo Picker，无 READ_MEDIA 权限）、`appUpdate.ts` |
| **认证** | `users` `user_type='customer'` → `AsyncStorage`；支持游客；旧 merchant session 由 `AppContext` 清掉并提示用商家 App |
| **Deep link** | `ml-express-client://`；关联域 `mlexpress.com` |
| **Google Play** | `blockedPermissions` 屏蔽 READ_MEDIA_*；选图走系统 Photo Picker |
| **部署** | EAS projectId `80b0873d-…`；profiles：`apk` / `production`（AAB） |

**屏幕导航**：Welcome → Login/Register → Main(Home) → PlaceOrder、MyOrders、TrackOrder、CityMall、Cart、**MerchantProducts（客户逛店只读）**、Profile、OrderDetail、AddressBook、NotificationCenter…

### 3.1.5 商家 App（`ml-express-merchant-app/`）

| 维度 | 说明 |
|------|------|
| **定位** | B 端原生：**仅店铺运营**（接单、打包、商品 CRUD、打印、**代客下单**）；不含会员注册/商城逛店/购物车 |
| **入口** | `index.js`（`installProductionConsoleGate`）→ `App.tsx` |
| **包名** | `com.mlexpress.merchants`；scheme `ml-express-merchants://` |
| **核心屏** | Home、MyOrders、MerchantProducts（管理）、PlaceOrder（电话订餐代客下单）、Profile、打印 |
| **认证** | `delivery_stores` + Netlify `merchant-password`（**无客户端明文密码兜底**）+ `merchantLoginGuard` |
| **业务层** | `supabase.ts`（barrel）+ `merchantApi/`；登录 `merchantAuthService` |
| **体验** | `FeedbackService` + `GlobalToast`：非确认提示走 Toast；`Alert.alert` 仅确认/破坏性操作；生产 `installProductionConsoleGate`（**无 Sentry**，勿擅自加） |
| **共享** | `src/services/_shared/`（含 `productReview.ts`） |
| **部署** | EAS projectId `0c1336bd-…`；版本见 §20（app.json **2.5.4 (24)**） |

### 3.1.6 骑手/员工 App（`ml-express-mobile-app/`）

| 维度 | 说明 |
|------|------|
| **定位** | STAFF：骑手配送 + 管理员督导（**工作区切换**，不删管理员） |
| **入口** | `index.ts`（Sentry + 生产 console 门禁）→ `App.tsx`；显示名 **MARKET LINK STAFF** |
| **目录** | 无 `src/` 前缀：`screens/`、`services/`、`navigation/`、`utils/`、`contexts/` |
| **业务层** | `supabase.ts`（barrel）+ `staffApi/`；`locationService`；`feedbackService` / `LoggerService` |
| **工作区** | `utils/staffWorkspace.ts`：`admin` / `courier`；双岗可切换；财务进管理督导 |
| **扫码主路径** | `scanCodeHelpers` + `findPackageByScanCode`；取件扫包裹码、送达扫 `STORE_`；地图进详情 `openScan` |
| **认证** | `admin_accounts` + Netlify `admin-password`（**无客户端明文密码兜底**）+ `ensure-courier-auth` |
| **导航** | Stack + 双 Tab：Admin（Dashboard/Map/Scan/Profile）vs Courier（MyTasks/Map/Scan/Profile） |
| **部署** | EAS projectId `9831d961-…`；`build:aab`；版本 **2.4.3 (81)** |

### 3.1.7 Inventory 中转站 App（`ml-express-inventory-app/`）

| 维度 | 说明 |
|------|------|
| **定位** | 跨境包裹：**A 发站出库**（入库→打包→装车）+ **B 到站签收**（到站→入库/分拨→车费→签收），见 §10.2 |
| **入口** | `App.tsx`：AuthProvider → Login / `AppNavigator` |
| **认证** | **唯一使用 Supabase Auth JWT 的移动端**；`inventory-store-login` Edge Function；SecureStore |
| **网络** | 生产 REST/Auth/Storage：`https://admin-market-link-express.com/__sb/`（§2.1）；写操作必须店铺 JWT |
| **数据** | **在线专用**：`inventory_*` 表 + RPC 幂等事务；45s 内存缓存（`inventoryCloudStore`） |
| **写入守卫** | `withInventoryCloudWrite` + fetch 拦截器（§10.12）；禁止 anon 写 |
| **不写 shared** | `sync:shared` 为空操作 |
| **测试** | `vitest`（`npm test`）；A 基本完成；B 到站三步已落地，仍需现场回归 |
| **详细** | §10.2 A/B、§10.12 JWT/三步、§10.4 屏幕、§10.7 区域可见性 |

### 3.1.8 共享层（`/shared/`）

| 维度 | 说明 |
|------|------|
| **机制** | 单一源 `shared/src/*.ts` → `sync.mjs` → 各 app `_shared/`（AUTO-GENERATED，已提交 git） |
| **源文件（7）** | `pricing.ts`、`productReview.ts`、`rechargeQr.ts`、`merchantLoginGuard.ts`、`merchantStoreTypes.ts`、`domainTypes.ts`、`services.ts` |
| **消费方** | Admin、client-web、merchant-web、client、merchant-app、mobile-app（**不含 Inventory**） |
| **规则** | ❌ 勿改 `_shared/` 副本；✅ 只改 `/shared/src` 后 `npm run sync:shared` |

### 3.1.9 Supabase 后端（`supabase/`）

| 维度 | 说明 |
|------|------|
| **项目** | `uopkyuluxnrewvlmutam.supabase.co`（全端共用） |
| **Migrations** | **64** 个 SQL 文件（`supabase/migrations/`；以目录实际数量为准） |
| **Edge Functions** | 4 个：`inventory-store-login`、`inventory-change-password`、`inventory-clear-test-data`、`ensure-courier-auth` |
| **同源代理** | 客户端不直连 supabase.co；由 Netlify `/__sb` 或 Cloudflare Worker 转发，见 §2.1 |
| **业务域** | City（`packages`/`users`…）与 Inventory（`inventory_*`）**表隔离**，见 §14 |

### 3.1.10 CI 与脚本（`scripts/`、`.github/`）

| 项 | 说明 |
|----|------|
| **CI** | `.github/workflows/typecheck.yml`：7 子项目 `tsc --noEmit`（基线门禁） |
| **脚本** | `scripts/ci-typecheck.mjs` + `typecheck-baselines.json` |
| **其它** | `scripts/` 含密码迁移、图标同步等运维脚本 |

---

## 4. 管理后台（仓库根 `src/`）

### 4.1 技术栈

- **React 18** + **TypeScript 4.9** + **react-scripts 5**（CRA）
- **react-router-dom v6**
- **@supabase/supabase-js ^2.76**
- 地图：**@react-google-maps/api**；图表：**recharts**；Excel：**exceljs**；OCR：**tesseract.js**
- 服务端：**twilio**、**nodemailer**（Netlify Functions）

> 架构总览见 [§3.1.1](#311-管理后台仓库根-)。

### 4.2 目录结构

| 路径 | 职责 |
|------|------|
| `src/index.tsx` → `src/App.tsx` | 入口与路由表（生产 console 门禁 + `GlobalToast`） |
| `src/pages/` | 页面（见 §4.3）；City 包裹列表走 `listCityPackagesPage` 分页，**勿**在该页调用 `getAllPackages` |
| `src/components/` | 通用与跨境组件（`GlobalToast`、`CrossBorder*`、`CblTablePagination`） |
| `src/services/FeedbackService.ts` / `ToastService.ts` / `LoggerService.ts` | Toast 入口与生产日志门禁 |
| `src/layouts/AdminShellLayout.tsx` | 侧栏+顶栏；`STANDALONE_ADMIN_MODULE_PATHS` |
| `src/contexts/` | 含 `AdminTodoContext` |
| `src/services/supabase.ts` | Supabase 客户端 + 各业务 service |
| `src/services/inventoryConsoleService.ts` | 跨境 Admin API 客户端 |
| `src/utils/crossBorderHubs.ts` | MUSE/MDY/YGN 枢纽与账号草稿 |
| `src/utils/crossBorderCustomerCode.ts` | 客户编码：区域 + YYMMDD + 当日客量 + 推销员序号 |
| `src/utils/crossBorderRoutePricing.ts` | 路线单价矩阵；可按客户编码存专属 `per_kg` |
| `src/utils/supabaseBrowserUrl.ts` | 生产 `/__sb/`；Realtime 可用性 |
| `src/styles/crossBorderLogistics.css` | 跨境独立页样式 |
| `src/services/_shared/` | `/shared` 同步副本（**勿手改**） |
| `netlify/functions/` | 服务端（§4.7） |

### 4.3 路由与页面（`src/App.tsx`）

根 `/` → `/admin/login`；`**/admin/**` + `ProtectedRoute`（角色 + `permissionId`）。

| 路径 | 页面 | 权限 |
|------|------|------|
| `/admin/login` | `AdminLogin` | — |
| `/admin/dashboard` | 仪表盘 | 默认 |
| `/admin/city-packages` | City 包裹（服务端分页；状态 count 单独查；财务仍用 `getAllPackages`） | `city_packages` |
| `/admin/users` | 用户 | `users` |
| `/admin/finance` | 财务 | `finance` |
| `/admin/tracking` / `realtime-tracking` | 跟踪 | `tracking` |
| `/admin/settings` / `system-settings` | 设置 | `settings` |
| `/admin/accounts` | 后台账号权限 | `settings` |
| `/admin/banners` | Banner | `banners` |
| `/admin/delivery-stores` | **合伙店铺**（不含中转站） | `merchant_stores` |
| `/admin/merchant-applications` | 商家入驻申请 | `merchant_stores` |
| `/admin/supervision` | 督导 | — |
| `/admin/audit-logs` | 审计日志 | — |
| `/admin/delivery-alerts` | 配送警报 | `delivery_alerts` |
| `/admin/recharges` | 充值 | `recharges` |
| `/admin/reports` | 报表 | `reports` |
| `/admin/courier-performance` | 骑手绩效 | `courier_performance` |
| `/admin/merchant-reconciliation` | 商家对账 | `merchant_reconciliation` |
| `/admin/metric-management` | 指标管理（**全屏独立**，4 Tab 见 §4.8） | `metric_management` |
| `/admin/proxy-purchase` | 代购清单（独立页，也可从指标管理 Tab 进入） | `metric_management` |
| `/admin/product-price` | 商品价格 | — |
| `/admin/personal-expenses` | 个人开销 | — |
| `/admin/cross-border-logistics` | 跨境物流（**全屏独立**） | `cross_border_logistics` |

### 4.4 独立全屏模块

`STANDALONE_ADMIN_MODULE_PATHS`：`/admin/metric-management`、`/admin/cross-border-logistics`。无通用侧栏/全局搜索/待办条。

### 4.5 合伙店铺 vs 中转站

- **合伙店铺**：City 配送门店；列表过滤 `transit_station`。
- **跨境物流**：中转站账号、财务、包裹；**跨境账号管理** 创建/编辑 `transit_station`。

### 4.6 跨境物流前端关键文件

| 文件 | 职责 |
|------|------|
| `CrossBorderLogisticsPage.tsx` | 主控制台 |
| `CrossBorderAccountManagementModal.tsx` | 账号列表/编辑 |
| `CreateCrossBorderAccountModal.tsx` | 创建/编辑表单+地图 |
| `CreateCrossBorderCustomerModal.tsx` | 登记跨境客户并生成客户编码 |
| `CrossBorderManualEntryModal.tsx` | 其它开销 |
| `CrossBorderPricingModal.tsx` | 跨境定价（默认路线 + **按客户编码**专属单价） |
| `StationReconciliationModal.tsx` | 对账 |
| `inventoryConsoleService.ts` | Admin API |
| `crossBorderCustomerCode.ts` | 编码算法（Admin 与 Netlify utils 各一份，须同步） |

### 4.7 Netlify Functions（根 `netlify/functions/`）

**通用 Admin**

| 函数 | 用途 |
|------|------|
| `verify-admin` | 校验 Admin JWT |
| `admin-password` | Admin / 骑手改密与登录 |
| `merchant-password` | 商家 App 店铺登录 / 改密（不回传 password） |
| `send-email-code` / `verify-email-code` | 邮箱验证码 |
| `send-sms` / `verify-sms` | 短信验证码 |
| `send-order-confirmation` | 下单确认邮件 |
| `ensure-courier-auth` | 骑手 Auth 代理 |
| `upload-banner` | Banner 上传 |
| `cleanup-delivery-photos` | 配送照片清理（cron） |
| `merchant-admin-applications` | 商家申请审核 |

**跨境 / Inventory Admin**

| 函数 | 用途 |
|------|------|
| `inventory-admin-data.js` | 概览/财务/包裹（含 RPC 分页） |
| `inventory-admin-create-account.js` | 创建中转站+Auth |
| `inventory-admin-update-account.js` | GET/PUT 编辑账号 |
| `inventory-admin-delete-account.js` | 删除账号 |
| `inventory-admin-cross-border-entry.js` | 手工收支 |
| `inventory-admin-customers.js` | 客户汇总 |
| `inventory-admin-cross-border-customers.js` | 跨境登记客户 CRUD（`cross_border_customers`） |
| `inventory-admin-salespersons.js` | 推销员编码 |
| `inventory-admin-finance.js` | 财务明细 |
| `inventory-admin-clear-test-data.js` | 清空测试数据 |

**Utils**：`inventoryTransitAccount.js`、`inventoryFinanceAggregate.js`、`inventoryCustomerAggregate.js`、`crossBorderCustomerCode.js`、`crossBorderCustomerRegistry.js`、`packDisplayStatus.js`、`cors.js`。

生产 Netlify 站点 ID：`ed9c2173-4031-4f10-a466-5b041dfe3511`。

### 4.8 指标管理 Hub（`ImportMetricDraftsPage.tsx`）

全屏独立模块，**不与会员 Web/App、商家 Web/App、骑手 App、Inventory App 做登录或业务链接**。数据只服务 Admin 内部运营（换电脑需 Supabase 云端，勿只依赖 localStorage）：

| Tab | 页面/组件 | 数据存储 |
|-----|-----------|----------|
| 进口指标草稿 | 本页表格 + 编辑弹窗 | `import_metric_drafts`（Supabase） |
| 商品价格 | 嵌入商品价格区块 | `products` / 定价设置 |
| 个人开销 | `PersonalExpensePage` | `personal_ledger_entries`（按 username 隔离） |
| 代购清单 | `ProxyPurchasePage` | `proxy_purchase_workspaces`（Supabase，migration `20260707120000`） |

---

## 5. 会员端网站 `ml-express-client-web/`

> 架构总览见 [§3.1.2](#312-会员-webml-express-client-web)。

### 5.1 技术栈

CRA + TypeScript + React Router **v7** + `@supabase/supabase-js` + `@sentry/react` + Google Maps。

### 5.2 目录结构

```
ml-express-client-web/
├── src/
│   ├── index.tsx → App.tsx   # 启动前 installProductionConsoleGate；Sentry 见 sentryInit
│   ├── pages/              # 14 个页面（Home、Mall、Cart、Profile、Support…）
│   ├── components/         # GlobalToast、home/OrderModal…
│   ├── contexts/           # LanguageProvider, CartProvider
│   ├── services/           # supabase.ts、FeedbackService、ToastService、LoggerService + _shared/
│   ├── utils/              # supabaseBrowserUrl.ts（生产 origin/__sb/）
│   ├── constants/ styles/
├── netlify/functions/      # merchant-apply, send-sms, send-statement…
└── netlify.toml            # Base directory = 本子目录；`/__sb/*` rewrite
```

### 5.3 认证与会话

- 仅服务会员：`users` 表 customer 凭证。
- 会话：`localStorage` 键 `ml-express-customer`。
- **非 Supabase Auth JWT**；`ClientWebMerchantSessionGuard` 防止商家 session 误用。

### 5.4 路由（`src/App.tsx`）

| 路径 | 页面 |
|------|------|
| `/` | HomePage（着陆，内嵌 services/tracking/contact） |
| `/profile` | 账户 |
| `/mall`、`/mall/:storeId` | 商城 |
| `/cart` | 购物车 |
| `/merchant-apply` | 商家入驻申请 |
| `/support` | **ML Inventory App Store Support 页** |
| `/ml-inventory/privacy` | Inventory 隐私政策 |
| `/privacy-policy`、`/terms-of-service`、`/delete-account` | 合规 |
| `/download`、`/download-rider` | 重定向 GitHub APK |

### 5.5 部署

- Netlify 站点 ID：`52f5f573-ca0a-4769-a8c7-e5f675764056`；域名 `market-link-express.com`。
- 构建：`npm install --legacy-peer-deps && CI=false npm run build`（`prebuild` → `sync:shared`）。
- 生产浏览器 REST：同源 `/__sb/`（`netlify.toml` rewrite；见 §2.1）。

```bash
cd ml-express-client-web && npm install && npm start
```

### 5.6 反馈、日志与监控（对标商家 App §8.8）

| 模块 | 职责 |
|------|------|
| `ToastService` + `GlobalToast` | 全局轻提示（顶部固定） |
| `FeedbackService` | Toast 统一入口（`notify` 承接旧 `alert(title, message)`；无震动） |
| `window.confirm` | **仅**确认/破坏性操作（清空购物车、删除商品、取消订单等） |
| `LoggerService` + `installProductionConsoleGate`（`index.tsx`） | 生产压制 `console.log/info`；错误脱敏 |
| `@sentry/react` + `sentryInit` | **已有**，可保留；勿擅自改 DSN |

非确认提示（登录校验、保存结果、打烊、加入购物车）一律 `feedbackService.notify/success/error/warning`，不要各页再挂本地 Toast。

---

## 6. 商家端网站 `ml-express-merchant-web/`

> 架构总览见 [§3.1.3](#313-商家-webml-express-merchant-web)。

### 6.1 技术栈

与 client-web 类似：CRA + TS + React Router v7 + Supabase。**无 Sentry**，勿擅自加。

### 6.2 目录结构

```
ml-express-merchant-web/
├── src/
│   ├── index.tsx           # 启动前 installProductionConsoleGate
│   ├── pages/              # Login, Profile, StoreProducts, Tracking
│   ├── components/         # GlobalToast；home/OrderModal.tsx（4 步下单向导）
│   ├── contexts/ hooks/
│   ├── services/           # supabase.ts、FeedbackService、ToastService、LoggerService + _shared/
│   ├── utils/              # supabaseBrowserUrl.ts（生产 origin/__sb/）
├── netlify/functions/      # send-sms, send-statement, merchant-password, verify-email…
└── netlify.toml            # `/__sb/*` rewrite；域名 mlexpress-merchants.com
```

### 6.3 认证

- `delivery_stores.store_code` + 密码 → `localStorage`。
- **`merchantLoginGuard`**（来自 `/shared`）：拒绝 `store_type = transit_station` 登录商家端。

### 6.4 路由

| 路径 | 页面 |
|------|------|
| `/login` | 登录 |
| `/` | Profile（主页） |
| `/products` | 商品管理 |
| `/orders` | 订单（经 Profile/Tracking 导航） |

### 6.5 关键 UI

- **下单弹窗**：`OrderModal.tsx` + `orderModalWizard.ts`（4 步）。
- **多规格**：`ProductVariantPicker.tsx` + `utils/productVariants.ts`。

### 6.6 部署

- Netlify 站点 ID：`126af2b9-244f-47fd-9be9-58fb45b6e7a2`；域名 `mlexpress-merchants.com`。
- 生产浏览器 REST：同源 `/__sb/`（见 §2.1）。

```bash
cd ml-express-merchant-web && npm install && npm start
```

### 6.7 反馈、日志与监控（对标商家 App §8.8）

| 模块 | 职责 |
|------|------|
| `ToastService` + `GlobalToast` | 全局轻提示（顶部固定） |
| `FeedbackService` | Toast 统一入口（`notify` 承接旧 `alert`；无震动） |
| `window.confirm` | **仅**确认/破坏性操作（删除商品、拒单、取消订单等） |
| `LoggerService` + `installProductionConsoleGate`（`index.tsx`） | 生产压制 `console.log/info`；错误脱敏。**无 Sentry**，勿擅自加 |

非确认提示（保存/上传结果、接单失败、余额不足）一律 `feedbackService.notify/success/error/warning`，不要各页再挂本地 Toast。

---

## 7. 会员 App `ml-express-client`

> 架构总览见 [§3.1.4](#314-会员-appml-express-client)。

### 7.1 标识与版本

| 项 | 值 |
|----|-----|
| 包名 | `com.mlexpress.client` |
| 版本 | **2.8.0**（iOS build **74** / Android versionCode **74**） |
| 技术 | Expo SDK 54 + RN 0.81.4 + React Navigation 6 |
| Deep link | `ml-express-client://`、`https://mlexpress.com` |
| EAS | projectId `80b0873d-1d76-429e-8c79-738a817d8a15` |

### 7.2 目录结构

```
ml-express-client/
├── index.js → App.tsx
├── app.json / app.config.js / eas.json   # Maps Key 由 app.config.js 从环境变量注入
├── .env.example                          # 本地/EAS 所需 EXPO_PUBLIC_* 模板
├── src/
│   ├── screens/            # 16 Screen（见 7.4）；Profile 文案/样式见 screens/profile/
│   ├── components/
│   │   └── placeOrder/     # 下单向导子组件 + placeOrderStyles
│   ├── contexts/           # AppContext, CartContext, LoadingContext
│   ├── services/
│   │   ├── supabase.ts     # 业务 API 入口（re-export）
│   │   ├── clientApi/      # 拆分后的服务实现（customer/package/merchant…）
│   │   ├── DatabaseService.ts   # expo-sqlite 本地缓存
│   │   ├── notificationService.ts
│   │   ├── appUpdateService.ts  # 应用内 APK 更新检查
│   │   └── _shared/
│   └── utils/
│       ├── mediaAccess.ts       # Android Photo Picker（Google Play 合规）
│       └── appUpdate.ts
├── android/
│   ├── keystore.properties.example  # 签名模板
│   ├── keystore.properties          # 本地签名密码（gitignore，勿提交）
│   └── app/*.keystore               # 仅 debug.keystore 可入库；release/upload 勿提交
└── docs/sql/               # client_android_latest_release.sql
```

**密钥约定**：`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` / `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` 放 `.env`（本地）或 EAS Secrets；`android/keystore.properties` 放上传密钥密码。勿把 Maps Key、keystore 密码写入 `app.json` / `gradle.properties`。

### 7.3 数据层

| 层 | 说明 |
|----|------|
| **Supabase** | `users`、`packages`、`products`、`delivery_stores`、`address_book`、`banners`、`user_notifications`… |
| **网络** | 生产 REST/Storage 走 `https://market-link-express.com/__sb/`（`clientApi/nativeSupabaseUrl.ts`，尾斜杠必留） |
| **SQLite** | `DatabaseService.ts` 离线/缓存辅助 |
| **AsyncStorage** | 用户 session（`currentUser`） |
| **SecureStore** | 敏感数据 |

### 7.4 屏幕与导航

**Native Stack**（`initialRouteName="Welcome"`）：

Welcome → Login/Register → **Main(HomeScreen)** → PlaceOrder、MyOrders、TrackOrder、Profile、OrderDetail、AddressBook、CityMall、Cart、MerchantProducts（客户逛店只读）、NotificationCenter、NotificationSettings…

### 7.5 认证

- `users` 表 `user_type='customer'`，自定义密码校验（**非 Supabase Auth JWT**）。
- 支持游客模式；**会员 App 仅维护 customer 会话**（`AppContext` 守卫：检测到 merchant/partner 会清 session 并提示使用 `ml-express-merchant-app`）。
- CityMall / MerchantProducts 为客户逛店只读浏览 + 购物车下单，不含商家接单/商品 CRUD/打印机等运营能力。

### 7.6 Google Play 媒体权限策略

- `app.json` → `android.blockedPermissions` 屏蔽 `READ_MEDIA_IMAGES/VIDEO/AUDIO`、`READ_MEDIA_VISUAL_USER_SELECTED`、`READ_EXTERNAL_STORAGE`。
- `expo-media-library` 配置 `granularPermissions: []`；保存二维码用 `writeOnly` 或 Android 13+ MediaStore。
- 选图统一经 `utils/mediaAccess.ts` → 系统 Photo Picker，**不** `requestMediaLibraryPermissionsAsync`（Android）。

### 7.7 应用内更新

- `appUpdateService.ts` 读取 Supabase `system_settings` 键 `client.android.latest_release`。
- SQL 模板：`docs/sql/client_android_latest_release.sql`。

### 7.8 构建

```bash
cd ml-express-client
npm install && npx expo start
eas build --platform android --profile production   # Play AAB
eas build --platform android --profile apk          # 侧载 APK
npm run build:apk:gradle                            # 本地 Gradle APK
```

---

## 8. 商家 App `ml-express-merchant-app`

> 架构总览见 [§3.1.5](#315-商家-appml-express-merchant-app)。

### 8.1 标识

| 项 | 值 |
|----|-----|
| 包名 | `com.mlexpress.merchants` |
| 显示名 | MARKET LINK MERCHANT |
| 版本 | **2.5.4**（iOS build **24** / Android versionCode **24**） |
| Scheme | `ml-express-merchants://` |
| EAS | projectId `0c1336bd-…` |

### 8.2 产品边界（对标会员端「只留 customer」）

商家 App **只做店铺运营**，不提供会员能力：

| 保留（B 端） | 已去掉（会员残留） |
|--------------|-------------------|
| 接单提醒 `OrderAlertModal`、订单列表/详情 | 会员注册 `Register` |
| 商品管理（增删改、上下架、批量改价） | 城市商城逛店 `CityMall` |
| **立即下单**（电话订餐 / 代客下单） | 购物车 `Cart` / `CartContext` |
| 地址簿（代客下单用） | 商品页「加入购物车」只读逛店 |
| 蓝牙小票打印、打包 | 注销会员账号（`customerService.deleteAccount`） |
| 订单追踪、店铺资料、充值申请 | 客户端明文比对 `delivery_stores.password` |

会员购物请用 `ml-express-client`。中转站账号请用 Inventory App。

### 8.3 架构

Expo 54 + Navigation 6 + `supabase.ts`（barrel）+ `merchantApi/` + SQLite 缓存 + `_shared/`。生产 REST 走 `https://mlexpress-merchants.com/__sb/`（`merchantApi/nativeSupabaseUrl.ts`）。

```
src/services/
├── supabase.ts              # 业务 API 入口（re-export）
├── merchantApi/             # 拆分后的服务实现（customer/package/merchant…）
├── merchantAuthService.ts   # 店铺登录 / 改密（Netlify merchant-password）
├── FeedbackService.ts / ToastService.ts / LoggerService.ts
├── DatabaseService.ts
└── _shared/
```

**额外依赖**：`expo-image-manipulator`（商品图处理）、蓝牙打印。

### 8.4 认证与密钥

- 登录：店铺码 + 密码 → Netlify **`merchant-password`**（`merchantAuthService`）；**不在客户端** `select("*")` 比对 `delivery_stores.password`。
- 弱网 vs 凭据错误在 `LoginScreen` 区分提示。
- **`merchantLoginGuard`**：拦截 `transit_station`（中转站账号只能登 Inventory App）。
- 改密：商家走 `merchant-password` `updatePassword`（仍写入 `password` 列以兼容商家 Web）。
- **Maps Key**：`app.config.js` 从 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` / `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` 注入；勿写回 `app.json`。

### 8.5 屏幕

Welcome → Login → Main(Home) → MyOrders、OrderDetail、MerchantProducts、**PlaceOrder（代客下单）**、AddressBook、Profile、TrackOrder、NotificationCenter、NotificationSettings。

### 8.6 构建

```bash
cd ml-express-merchant-app && npm install && npx expo start
eas build --platform android --profile production
```

### 8.7 Google Play 媒体权限策略

对标会员 §7.6：

- `app.json` / `app.config.js` → `android.blockedPermissions` 屏蔽 `READ_MEDIA_IMAGES/VIDEO/AUDIO`、`READ_MEDIA_VISUAL_USER_SELECTED`、`READ_EXTERNAL_STORAGE`、`RECORD_AUDIO`。
- `expo-media-library` 配置 `granularPermissions: []`；保存收款码用 `writeOnly` 或 Android 13+ MediaStore。
- 选图统一经 `utils/mediaAccess.ts` → 系统 Photo Picker，**不**在 Android 上 `requestMediaLibraryPermissionsAsync`。
- 现有 `android/` 清单用 `tools:node="remove"` 剔除读相册权限；`WRITE_EXTERNAL_STORAGE` 仅 `maxSdkVersion=32`。下次 EAS/`prebuild` 后生效于新包。

### 8.8 反馈、日志与监控（对标骑手 §9.8）

| 模块 | 职责 |
|------|------|
| `ToastService` + `GlobalToast` + `Toast` | 全局轻提示 |
| `FeedbackService` | Toast + Vibration 统一入口（`notify` 承接旧 `Alert.alert(title, message)`） |
| `Alert.alert` | **仅**确认/破坏性操作（退出、拒绝订单、删除商品、取消订单、热线选择、强制下线、OTA 重启） |
| `LoggerService` + `installProductionConsoleGate`（`index.js`） | 生产压制 `console.log/info`；错误脱敏。**无 Sentry**，勿擅自加 |

非确认提示（权限、保存/打印结果、余额不足、接单失败）一律 `feedbackService.notify/success/error/warning`，不要各屏再挂本地 `<Toast>`。

---

## 9. 骑手/员工 App `ml-express-mobile-app`

> 架构总览见 [§3.1.6](#316-骑手员工-appml-express-mobile-app)。

### 9.1 标识

| 项 | 值 |
|----|-----|
| 包名 | `com.mlexpress.courier` |
| 显示名 | MARKET LINK STAFF |
| 版本 | **2.4.3**（iOS build **81** / Android versionCode **81**） |
| Scheme | `ml-express-staff://` |
| EAS | projectId `9831d961-…` |

### 9.2 目录结构（无 `src/` 前缀）

```
ml-express-mobile-app/
├── index.ts                 # Sentry instrument + installProductionConsoleGate → App
├── instrument.ts            # Sentry 初始化
├── App.tsx                  # 导航根；MainTabs 按工作区切换 Admin/Courier
├── screens/
│   ├── LoginScreen.tsx
│   ├── MapScreen.tsx + map/mapScreenStyles.ts
│   ├── MyTasksScreen.tsx + myTasks/myTasksScreenStyles.ts  # SectionList 虚拟化
│   ├── PackageDetailScreen.tsx / ScanScreen / ScannerScreen
│   ├── Dashboard / Profile / Settings / Finance* / Courier* / PackageManagement…
│   └── …
├── navigation/              # lazyScreens.tsx, navigationRef.ts
├── services/
│   ├── supabase.ts          # barrel：业务 API + re-export staffApi
│   ├── staffApi/
│   │   ├── supabaseClient.ts
│   │   ├── nativeSupabaseUrl.ts     # 生产 /__sb/（Admin 域）
│   │   ├── types.ts
│   │   └── adminAccountService.ts   # 登录 / admin-password
│   ├── locationService.ts / routingService.ts / notificationService.ts
│   ├── feedbackService.ts / toastService.ts / LoggerService.ts / errorService.ts
│   └── _shared/             # sync 自 /shared（勿手改）
├── components/              # GlobalToast、MyTaskPackageCard、RoleGuardScreen、InAppNavigationModal…
├── utils/
│   ├── staffWorkspace.ts    # 工作区 admin|courier + 角色能力
│   ├── scanCodeHelpers.ts   # 扫码分类 / STORE_ / 匹配包裹
│   └── packageStatusNormalize.ts、i18n.ts…
├── contexts/ AppContext.tsx
├── constants/               # courierOnline.ts、packageStatus.ts
└── app.config.js            # blockedPermissions 等
```

### 9.3 认证与角色（红线）

- 登录：`admin_accounts` 用户名 + 密码 → Netlify **`admin-password`**（`adminAccountService`）；弱网与凭据错误在 `LoginScreen` 区分提示。
- **禁止**：客户端明文密码比对 / 本地密码兜底；**不要**改成纯 Supabase Auth 替代 `admin_accounts`。
- Provisioning：`ensure-courier-auth`（Edge / Netlify）为骑手绑定 Auth 能力。
- Supabase JS client：**`persistSession: false`**；业务态存在 `AsyncStorage`（role / position / courierId / workspace）。
- **保留双角色 STAFF**：管理督导 + 骑手配送；**不删管理员**能力。

### 9.4 工作区与权限（`utils/staffWorkspace.ts`）

| 概念 | 说明 |
|------|------|
| 工作区 `admin` | Tab：Dashboard / Map / Scan / Profile；财务默认进此区 |
| 工作区 `courier` | Tab：MyTasks / Map / Scan / Profile |
| 角色能力 | `admin`/`manager`/`finance` → 管理区；职位骑手或有 `courierId` → 配送区 |
| 双岗 | `isDualCapabilityStaff`：账号页可切换；默认督导 |
| 守卫 | `RoleGuardScreen`：无权限 Toast 后退；菜单按 `canAccess*` 裁剪 |

事件：`STAFF_WORKSPACE_CHANGED_EVENT`；存储键 `staff_workspace_mode`。

### 9.5 导航

Stack：Login → LocationDisclosure → Main(Tabs) → PackageDetail、DeliveryHistory、PackageManagement、CourierManagement、FinanceManagement、PerformanceAnalytics、Settings、MapView…

### 9.6 扫码 / 取件 / 送达主路径

| 步骤 | 实现要点 |
|------|----------|
| 分类 | `classifyScanCode`：`package` / `transfer` / `store`（`STORE_`）/ `unknown` |
| 查单 | `packageService.findPackageByScanCode`（精确，防抖） |
| 取件 | 详情内扫包裹码 / 寄件码；成功后「去配送」 |
| 送达 | 扫门店 `STORE_{storeId}_…`；`parseStoreReceiveCode` |
| 地图入口 | 进 `PackageDetail` 并带 `openScan` 自动开扫 |
| 匹配 | `scanMatchesPackage`（id / sender_code / transfer_code / store_receive_code） |

### 9.7 定位、地图与省电

- 前台：`locationService` 默认 **Balanced**；地图/任务 **离屏停** `watchPosition`。
- 后台：`expo-task-manager` 上报 `courier_locations`；idle / 在途降频。
- MapView：仅 `mapFocused && showMapPreview`（或导航弹层可见）时挂载；导航 Map **关 `showsTraffic`**。
- 应用内导航：`InAppNavigationModal` + `routingService` / `routeNavigationSession`。

### 9.8 反馈、日志与监控

| 模块 | 职责 |
|------|------|
| `toastService` + `GlobalToast` + `Toast` | 全局轻提示 |
| `feedbackService` | Toast + 触觉统一入口 |
| `Alert.alert` | **仅**确认/破坏性操作 |
| `LoggerService` + `installProductionConsoleGate`（`index.ts`） | 生产压制 `console.log/info`；错误脱敏 → Sentry |
| `@sentry/react-native`（`instrument.ts`） | 崩溃/异常 |

### 9.9 我的任务性能

- `MyTasksScreen`：`SectionList` 虚拟化（非全量 `ScrollView`）。
- 卡片：`components/MyTaskPackageCard.tsx` 独立渲染，减列表重绘。
- 样式：`screens/myTasks/myTasksScreenStyles.ts`（与 Map 样式拆分同类手法）。

### 9.10 特性速记 & 构建

- City 配送主数据：`packages`、`couriers`、`courier_locations`、`delivery_stores`（与 Inventory `inventory_*` 隔离）。
- 缓存：`cacheService` + 列表缓存键（见 `supabase.ts`）。

```bash
cd ml-express-mobile-app && npm install && npx expo start
npx tsc --noEmit
npm run build:aab   # Android AAB 生产包
```

---

## 10. Inventory 中转站 App `ml-express-inventory-app`

独立 Expo 应用，供 Admin 创建的 **中转站合伙店铺**（`delivery_stores.store_type = transit_station`）使用。详细云端设计见 **`ml-express-inventory-app/docs/CLOUD_DATA_ARCHITECTURE.md`**（若存在）。

> **Inventory 业务必须切成两条线（勿混）** — 详见 **[§10.2](#102-业务双线划分a-发站出库--b-到站签收)**：
>
> | 代号 | 业务含义 | 状态（2026-08） |
> |------|----------|-----------------|
> | **A** | **入库** → 客户编码/货物 → **打包** → **装车** 发往下一枢纽/目的站 | ✅ **基本完成**（仍在打磨缓存 / RPC / RLS） |
> | **B** | **到站三步**（确认到站 → 入库/释放中转 → 车费）→ **客户签收** | ✅ 三步已落地；现场回归 |
>
> **分界点**：A 在装车 RPC 成功、PKG 写入 `inventory_pkg_tracking.status = in_transit` 时结束；B 从到站确认 / 扫描 PKG 开始。

### 10.1 定位与数据策略

| 项 | 值 |
|----|-----|
| 包名 | iOS/Android `com.mlexpress.inventory` |
| App Store 名 | **ML Inventory** |
| 版本 | **2.0.0**（iOS build **34** / Android versionCode **34**） |
| 登录 | Edge Function `inventory-store-login` → Supabase Auth JWT |
| JWT claims | `inventory_store_code`、`inventory_hub_code` 等 |
| 数据策略 | **Supabase `inventory_*` 是唯一业务数据源；必须联网，不提供离线队列** |
| 本地 | 仅设备会话、语言、打印设置等非业务配置 |
| 云端 | `inventory_*` 表；与 City **`packages`/`orders` 隔离** |
| 多语言 | `src/i18n/`（中/英/缅）+ `LanguageContext` |
| Support URL | `src/constants/support.ts` → `https://market-link-express.com/support` |

**Supabase 配置**：`app.config.js` 将 URL/anon key 写入 `extra`；EAS production 见 `eas.json` env；本地 `.env` 可覆盖。

**不参与 `/shared` sync**（独立业务线）。

### 10.2 业务双线划分（A 发站出库 / B 到站签收）⭐

**维护者速记（与用户口径一致）**

- **A**：入库、填写客户信息、填写货物信息、（快递明细）打包、装车到目的地  
- **B**：到货签收、支付车费、中转包裹、客户签收  

Inventory App 在业务上必须拆成 **两条独立链路**。改需求、修 Bug、写 migration 时，**先判断属于 A 还是 B**，勿把发站逻辑与到站逻辑混在同一补丁里。

| 维度 | **A — 发站出库（Origin / Outbound）** | **B — 到站签收（Hub / Inbound & Delivery）** |
|------|--------------------------------------|-----------------------------------------------|
| **一句话** | 从本站点 **收货登记 → 打包 → 装车发往下一枢纽/目的站** | 包裹 **到站 → 付车费 → 分拨/中转 → 客户签收** |
| **典型角色** | 木姐 **MUSE**、瑞丽 **RUILI** 等 **发站** | **MDY** 中转站、**YGN/TGI** 目的站 |
| **开发状态（2026-08）** | ✅ **基本完成**，仍在打磨缓存/RPC/RLS | ✅ 到站三步已落地；现场回归中 |
| **业务边界** | A 在 `inventory_load_shipments` 成功、PKG 进入 `in_transit` 时 **结束** | B 从 `inventory_pkg_tracking.status = in_transit` 被到站扫描/确认时 **开始** |

#### A — 发站出库（入库 → 客户/货物信息 → 装车）

**用户路径（屏幕）**

| 顺序 | 屏幕 | 说明 |
|------|------|------|
| 1 | `StockInScreen` **入库** | 商品包装步不强制选客户；费用步金额仍按跨境单价×重量写入（UI 可隐藏总费用/地址，开关 `SHOW_TOTAL_FEE_FIELD`） |
| 1′ | `PackagingStockInScreen` **多个入库** | 批量扫码；订单 **直接已入库+已打包**（库存 0），整包重量在 PKG 上；同上费用隐藏策略 |
| 2 | `ItemsScreen` **快递明细** | 查看本店可见订单；**打包快递**（`PackExpressModal`） |
| 3 | `PkgScreen` **打包** | 已生成 PKG 列表；编辑/拆包/打印 |
| 4 | `StockOutScreen` **装车出库** | 选 PKG、本段目的地、车费；确认后写入在途追踪 |
| 辅 | `ShipmentTrackScreen` **在途追踪** | 发站视角查看已发出 PKG |
| 辅 | `MovementsScreen` **流水** | 出入库流水 |

**核心服务 / RPC（只改 A 时动这些）**

| 环节 | 关键代码 | Supabase RPC / 表 |
|------|----------|-------------------|
| 单票入库 | `inventoryService.applyStockMovement`（type=in） | `inventory_apply_stock_movement` |
| 多个入库 | `submitPackagingStockIn` → `packagingStockInBatchAtomic` | `inventory_packaging_stock_in_batch` |
| 快递明细打包 | `createPackedShipment` → `createPackAtomic` | `inventory_create_packed_shipment` |
| 装车出库 | `applyTruckLoadOutbound` → `loadShipmentsAtomic` | `inventory_load_shipments` → 写 `inventory_pkg_tracking`（`in_transit`） |
| 列表/缓存 | `inventoryCloudStore`、`expressDetailsVisibility` | `inventory_store_items`、`inventory_packed_shipments` |

**A 的常见坑（已踩过）**

- App 内存缓存与 Supabase 不一致：PKG **只在缓存、不在云端** → 装车报 `packed shipment not found`；打包/装车前必须 **校验云端已有 PKG**。
- `hubCode` scope 不一致（`resolveStoreHubCode` vs `store.region`）→ 列表空白。
- 发站账号用 **店码归一化 RLS**（`inventory_owner_code_matches`）；相关 migration 见 `ml-express-inventory-app/docs/DEPLOYMENT.md`。

```mermaid
flowchart LR
  subgraph A ["A 发站出库（基本完成）"]
    A1[入库 / 多个入库] --> A2[快递明细]
    A2 --> A3[打包]
    A3 --> A4[装车出库]
    A4 --> A5[(PKG in_transit)]
  end
```

#### B — 到站签收（到货 → 车费 → 中转 → 客户签收）

**用户路径（屏幕）**

| 顺序 | 屏幕 | 说明 |
|------|------|------|
| 1 | `HubReceiveScreen` **到站收货** | 扫 PKG/订单；打开分拨弹窗前 `ensureHubReceiveCloudReady({ forWrite: true })` 预热 JWT |
| 2 | `HubReceiveOrdersModal` | **三步向导**（`resolveHubReceiveStep`）：①确认到站 ②本站入库 / 其它站释放中转 ③支付车费 |
| 3 | `ItemsScreen` + `CustomerSignFlowModal` | 目的站 **客户签收**（本人/代收 + 签名）；快递明细也可 **批量签收** |
| 辅 | `CrossBorderFinanceScreen` **跨境财务** | 站点账本、待入账、车费 |
| 辅 | `TrackExpressScreen` **追踪快递** | 单笔查询 |

弹窗步骤由包状态推导，**不要做成可乱跳的 Tab**：

| Step | 条件 | 操作 |
|------|------|------|
| **1** | `inventory_pkg_tracking.status = in_transit` | `confirmPkgHubReceived` → RPC `inventory_confirm_pkg_hub_received` |
| **2** | 已到站，且仍有待入库本站单或未释放中转单 | 确认入库 / 释放中转 |
| **3** | 包内订单已处理完 | 支付车费（`hubTransportFeeService`） |

确认到站成功后 UI **以 RPC 返回为准**（`preferConfirmedHubReceivePack`）：`/__sb` GET 可能短暂仍报 `in_transit`，不能因此卡在第 1 步。导入失败 **不阻断**进入第 2 步（`ensurePackHubReceivedAtStation`）。

**核心服务 / RPC（只改 B 时动这些）**

| 环节 | 关键代码 | Supabase RPC / 表 |
|------|----------|-------------------|
| 到站收包 | `trackingService.confirmPkgHubReceived` | `inventory_confirm_pkg_hub_received` |
| 到站收单 | `confirmOrderHubReceived` / `confirmOrderInPackById` | 订单追踪更新 |
| 释放中转 | `releaseTransitOrdersAtHub`、`releaseHubTransitOrders` | `inventory_order_tracking` |
| 到站入库 | `importInboundPackToLocal`（历史命名，实际写 Supabase） | `inventoryHubOps` |
| 客户签收 | `markCustomerSigned`、`CustomerSignFlowModal` | `customer_signed_at`、`sign_receipt_json` 等 |
| 车费 | `hubTransportFeeService` | `inventory_hub_transport_fee_payments` |
| 追踪读写 | `trackingService.ts` 全文件 | `inventory_pkg_tracking`、`inventory_order_tracking` |

**B 的测试重点（待验证）**

- MDY 到站：PKG 分拨、**付车费**、MDY 订单入库 vs YGN 订单 **释放中转**。
- YGN 目的站：仅见 YGN 订单/PKG（`expressDetailsVisibility`）；**批量签收**、签收留痕上传。
- 释放中转后能否再走 A（再打包、再装车）闭环。
- RLS：到站 custody、`hub_arrived_at`、店码归一化（`20260622120000`、`20260708120000` 等）。

```mermaid
flowchart LR
  subgraph B ["B 到站签收"]
    B0[(PKG in_transit)] --> B1[步骤1 确认到站]
    B1 --> B2[步骤2 入库或释放中转]
    B2 --> B3[步骤3 支付车费]
    B2 -->|本站入库后| B4[客户签收]
    B2 -->|释放中转| B5[再打包装车 → 回到 A]
  end
```

#### A / B 分工原则（给 AI / 维护者）

1. **先问属于 A 还是 B**，再打开对应屏幕与服务文件；不要把「打包缓存」和「到站追踪」混在一个函数里修。
2. **A 的数据主表**：`inventory_store_items`、`inventory_packed_shipments`、`inventory_stock_movements`；装车成功后写入 **`inventory_pkg_tracking`**。
3. **B 的数据主表**：`inventory_pkg_tracking`、`inventory_order_tracking`、`inventory_hub_transport_fee_payments`；到站后才会大量改 `hub_arrived_at`、释放/签收字段。
4. **区域可见性**（§10.7）对 A、B **都生效**，但发站与中继/目的站看到的列表不同——改列表过滤时说明是 A 侧还是 B 侧账号场景。
5. **完整链路**见 §12（MUSE → MDY → YGN）；§12 是 A+B 串联，本节是 **职责切开**。

### 10.3 目录结构

```
ml-express-inventory-app/src/
├── screens/           # 业务页（见 10.4；A/B 划分见 10.2）
├── components/        # HubReceiveOrdersModal、CustomerSignFlowModal、SignaturePad、PackExpressModal…
├── hooks/             # useHubReceiveFlow、useCrossBorderCustomerLookup
├── contexts/          # AuthContext、LanguageContext
├── i18n/              # translations.ts、format.ts、types.ts、serviceErrorTexts.ts
├── navigation/        # AppNavigator（Stack）
├── constants/         # branding.ts、xprinterP203a.ts、destinationOptions.ts、labelBarcodeLayout.ts
├── services/
│   ├── nativeSupabaseUrl.ts     # 缅甸 /__sb 基址；shouldAttachInventoryUserJwt
│   ├── supabase.ts              # 自定义 fetch：REST/Functions 强制店铺 JWT
│   ├── database.ts              # 历史本地兼容层（非权威数据源）
│   ├── inventoryService.ts      # 核心业务入口（入库/打包/装车/到站/列表）
│   ├── trackingService.ts       # inventory_pkg/order_tracking 云端
│   ├── inventoryCloudApi.ts     # Supabase inventory_* CRUD（写走 withInventoryCloudWrite）
│   ├── authService.ts           # bind/refresh JWT；validateStoreStillAllowed
│   ├── cloudWriteGuard.ts       # 写前绑定会话；RLS 则 force refresh 再试
│   ├── hubReceiveGate.ts        # 到站写前预热
│   ├── hubTransportFeeService.ts
│   ├── financeLedgerService.ts
│   ├── printerService.ts / bleLabelPrinter.ts / tsplLabelBuilder.ts
│   └── …
├── utils/
│   ├── expressDetailsVisibility.ts
│   ├── packDisplayStatus.ts
│   ├── hubReceivePack.ts        # resolveHubReceiveStep、preferConfirmedHubReceivePack
│   ├── cloudAuthErrors.ts       # interpretInventoryStoreAccess（空行 ≠ 停用）
│   ├── crossBorderPricing.ts    # 入库按客户编码取专属单价
│   └── …
└── types/             # inventory.ts, tracking.ts
```

### 10.4 屏幕与导航（`AppNavigator.tsx`）

> **A / B 归属**：见 §10.2。下表「链路」列标注该屏幕 primarily 属于 A（发站）还是 B（到站）。

| Screen | 标题 | 链路 | 职责 |
|--------|------|------|------|
| `HomeScreen` | ML Inventory | — | 入口、统计、快捷入口 |
| `StockInScreen` | 入库 | **A** | 登记订单、生成入库条码；成功后自动弹 Barcode 打印（可取消） |
| `PackagingStockInScreen` | 多个入库 | **A** | 批量入库并直接生成已打包 PKG |
| `ItemsScreen` | **快递明细** | **A**（B 亦用） | 订单列表、打包快递、多选打印；目的站 **批量签收**（B） |
| `PkgScreen` | **打包** | **A** | 已打包 PKG 列表、编辑/拆包/打印 |
| `StockOutScreen` | **装车出库** | **A** | 选 PKG、选本段目的地、发车 |
| `HubReceiveScreen` | **到站收货** | **B** | 扫 PKG/订单、确认到站、分拨、付车费 |
| `ShipmentTrackScreen` | 在途追踪 | A/B | 发站/在途视角看在途包 |
| `TrackExpressScreen` | 追踪快递 | B | 单笔查询 |
| `MovementsScreen` | 流水 | A | 出入库流水 |
| `CrossBorderFinanceScreen` | **跨境财务** | B | 站点账本/待入账/车费 |
| `CameraScanScreen` | 通用扫码 | A/B | 系统相机权限 |
| `SettingsScreen` | 设置 | — | 站点连接、语言、P203A 打印测试、版本支持、改密/退出 |
| `ItemFormScreen` | 商品 | A | 编辑订单字段 |

### 10.5 核心业务流程（A + B 串联）

```mermaid
flowchart LR
  A[入库 StockIn] --> B[快递明细 Items]
  B --> C[打包快递 PackExpressModal]
  C --> D[打包列表 Pkg]
  D --> E[装车出库 StockOut]
  E --> F[云端 inventory_pkg_tracking]
  F --> G[到站收货 HubReceive]
  G --> H{订单目的地}
  H -->|本站| I[确认入库 / 客户签收 CustomerSignFlow]
  H -->|其它站| J[释放中转 → 再打包 → 再装车]
```

| 步骤 | 链路 | 关键函数 / 文件 |
|------|------|-----------------|
| 入库 | A | `inventoryService.applyStockMovement`（type=in） |
| 多个入库 | A | `submitPackagingStockIn` → `inventory_packaging_stock_in_batch` |
| 打包 | A | `createPackedShipment` → `inventory_create_packed_shipment` |
| 装车 | A | `applyTruckLoadOutbound` → `inventory_load_shipments` |
| 到站收包 | B | `trackingService.confirmPkgHubReceived` |
| 到站收单 | B | `confirmOrderHubReceived` / `confirmOrderInPackById` |
| 释放中转 | B | `releaseTransitOrdersAtHub` + `inventoryService.releaseHubTransitOrders` |
| 列表读取 | A/B | `inventoryCloudStore` 45 秒内存缓存 → `inventoryCloudApi` |
| 到站入库 | B | `importInboundPackToLocal`（历史命名，实际直接写 Supabase） |

**核心写入事务**：
1. `ensureInventoryCloudAuth()` 校验 JWT 与当前单设备 session
2. App 生成稳定 `operation_id`，调用 PostgreSQL RPC
3. RPC 在单事务内更新库存、流水、PKG/订单追踪；重复请求返回同一结果
4. 成功后清理 45 秒内存缓存，失败不保留半完成状态

### 10.6 在线数据架构

```
Inventory 页面 / 业务操作
  ↓ 必须联网；REST 带店铺 JWT（§10.12）
inventoryService.ts / trackingService.ts
  → withInventoryCloudWrite → inventoryCloudApi.ts → /__sb → inventory_*
  ↓ 成功后刷新 UI；失败则明确报错并保留当前画面
```

**单设备会话**：基础字段来自 `20260621120000_inventory_single_device_session`，强制 JWT session 绑定与密码哈希见 `20260716180000_inventory_auth_security_hardening`；`InventorySessionMonitor` 检测被踢下线。

### 10.7 区域可见性（重要）

逻辑集中在 **`src/utils/expressDetailsVisibility.ts`** + **`packDisplayStatus.ts`**：

| 账号类型 | 快递明细 | 打包列表 PKG |
|----------|----------|--------------|
| **发站（MUSE）** | 本店登记的全部目的地订单 | 本店全部 PKG |
| **中转站（MDY）** | 本站 MDY 订单 + 经本站中转的订单 | 本站 PKG + 经本站 inbound 的中转 PKG |
| **目的站（YGN）** | **仅**最终目的地 YGN 的订单 | **仅**YGN 目的地且本站持有的 PKG |

相关 API：
- `isVisibleInExpressDetailsList` → `listItems` 过滤
- `isVisibleInPackedList` → `listPackedShipments` 过滤
- `canSelectPackedShipmentForTruckLoad` → `listOutboundPackages`
- `shouldMergeCloudItemToLocal` / `shouldMergeCloudPackToLocal` → 云端拉取过滤

**目的站集合**（仅最终目的地、非中转）：`YGN`、`TGI`（见 `DESTINATION_ONLY_HUBS`）。

### 10.8 打包列表状态（`packDisplayStatus.ts`）

| display_status | 中文 | 条件概要 |
|----------------|------|----------|
| `pending_load` | 未装车 | 未出库 |
| `loaded` | 已装车 | 本地已出库，云端仍 `in_transit` |
| `arrived` | 已到站 | 云端 `hub_received` 且本地未同步出库等边缘情况 |
| `completed` | 已完成 | 云端 `hub_received`/`split_at_hub`/`completed` 且已装车 |

云端追踪状态：`inventory_pkg_tracking.status` → `in_transit` | `hub_received` | `completed` | `split_at_hub` | `cancelled`。

### 10.9 蓝牙标签打印（Xprinter P203A）

| 文件 | 职责 |
|------|------|
| `constants/xprinterP203a.ts` | 纸张尺寸、DPI |
| `tsplLabelBuilder.ts` | TSPL 指令（条码、文字布局） |
| `bluetoothThermalPrinter.ts` | 蓝牙直连发送 |
| `printerService.ts` | 统一打印入口（预览 / 蓝牙） |
| `LabelPrintPreviewCard.tsx` | 打印预览 UI |

Settings 可选「蓝牙直连」模式；入库成功后可弹 `OrderBarcodeModal` 打印标签。

### 10.10 目的站客户签收（v1.6+，**B 链路**）

目的站将订单标记「已签收」前，弹出 **`CustomerSignFlowModal`** 采集签收留痕：

| 模式 | 采集字段 |
|------|----------|
| **本人签收** | SVG 签名；电话沿用订单收件人电话 |
| **代收** | 代收人电话 + 姓名 + 签名 |

**批量签收**：`ItemsScreen`「✓ 批量签收」模式 → 选一单自动选中同客户可签收订单 → 一次签名写多单（`customerBatchSign.ts`）。

**关键文件**：

| 文件 | 职责 |
|------|------|
| `CustomerSignFlowModal.tsx` | 签收弹窗流程 |
| `SignaturePad.tsx` | SVG 平滑签名（`react-native-svg`） |
| `customerSignReceipt.ts` | 类型与校验 |
| `customerBatchSign.ts` | 同客户批量逻辑 |
| `inventoryService.markCustomerSigned()` | 写入 Supabase |
| `InboundInvoiceView.tsx` | 订单详情展示签收留痕 |

**Migration**：`20260720140000_inventory_customer_sign_receipt.sql` — 字段含 `customer_signed_at`、`sign_receipt_json` 等。

**入口**：列表操作菜单、批量签收、TrackExpress、CameraScan（**不含** Invoice 详情页单独按钮）。

### 10.11 运行、EAS 与 App Store

```bash
cd ml-express-inventory-app
cp .env.example .env          # 本地开发可选
npm install
npx expo start

# Edge Functions（仓库根）
supabase functions deploy inventory-store-login
supabase functions deploy inventory-change-password

# DB migrations
supabase db push

# iOS 生产包
eas build --platform ios --profile production
eas submit --platform ios --profile production

# Android APK（内测）
eas build --platform android --profile apk
```

- **`app.config.js`**：合并 `app.json`，注入 `extra.supabaseUrl/AnonKey`。
- **`eas.json`** profiles：`development`、`preview`（APK）、`apk`、`production`（AAB/iOS）。
- **B2B 说明**：登录页注明账号由 Admin 分配；无公开注册（App Store Guideline 3.2）。

账号须在 Admin **跨境物流 → 跨境账号管理** 创建（`transit_station`）。

> **不要擅自 `supabase db push`**，除非用户明确要求；生产库由维护者在 Dashboard 或约定流程执行。

### 10.12 JWT 写入守卫与到站三步

Inventory 是移动端里 **唯一** 用 Supabase Auth JWT 写业务表的端。RLS 认 `inventory_session_active()` + JWT claims，**anon 写会被拒**。

#### 写路径（所有云端写必须套上）

```
业务函数
  → withInventoryCloudWrite()          # cloudWriteGuard.ts
      bindInventoryCloudSession()      # 不要每次 setSession（会轮转 refresh token，批量写会死）
      fn()
      若 RLS/会话可重试 → refreshInventoryCloudSession({ force: true })
         force 刷新不得与非 force 的 in-flight 合流
      再 bind + fn()
  → supabase-js fetch
      REST / functions/v1：Authorization = 店铺 access_token
      auth/v1：不要覆盖（登录/refresh 仍走 anon）
```

| 文件 | 职责 |
|------|------|
| `cloudWriteGuard.ts` | 写前绑定；可重试错误则 force refresh 再试一次 |
| `authService.ts` | `bindInventoryCloudSession`、`refreshInventoryCloudSession`、`validateStoreStillAllowed` |
| `supabase.ts` + `nativeSupabaseUrl.ts` | `/__sb/` 基址 + JWT 拦截器 |
| `inventoryCloudApi.ts` / `trackingService.ts` | CRUD/RPC 外包一层 `withInventoryCloudWrite`（含 `upsertCloudStoreItem`） |

**店铺是否停用**（`interpretInventoryStoreAccess`）：

| 读到的 `delivery_stores` | 判定 | 用户文案 |
|--------------------------|------|----------|
| `store_type=transit_station` 且 status 空或 `active` | `allowed` | — |
| 读到行但非中转 / 非 active | `disabled` | `storeDisabled`「店铺账号已停用或非中转站类型」 |
| **读不到行**（空/RLS/网络） | `unknown` | `authSessionExpired`（可重试），**不是**停用 |

成功校验可缓存约 60s。批量签收勾多单时，第一次写失败不要误报停用。

#### 到站三步（B）首次点击失败的根因

红字 key 常为 `syncRlsBlocked`：第一次 REST 仍带 **anon**，或 force refresh 被非 force in-flight 吞掉。

处理要点（已落地，改 B 时勿回退）：

1. 打开在途包：`ensureHubReceiveCloudReady({ forWrite: true })` 预热。
2. `confirmPkgHubReceived` 必须走 `withInventoryCloudWrite`。
3. RPC 成功后 `preferConfirmedHubReceivePack`：忽略过期 GET 的 `in_transit`。
4. 确认失败等约 400ms 再拉包；已到站则进第 2 步，导入失败后台再试。
5. `/__sb` 响应必须 `Cache-Control: no-store`。

#### 入库 UI 隐藏 vs 数据层

`StockInStepFee.tsx` / `PackagingStockInScreen.tsx` 的 `SHOW_TOTAL_FEE_FIELD = false`：费用页可隐藏总费用和详细地址，**金额仍按跨境单价×重量写入**。订单详情 / invoice 仍显示。财务 note 协议中文：`总费用` / `到付` / `预付`。不要为了藏 UI 拆数据层。

费用页目的地可跟客户编码区域（`destinationFromCustomerCode`）。

---

## 11. Admin 跨境物流控制台

页面：`CrossBorderLogisticsPage.tsx`（独立全屏深色 UI）。

**只对接 Inventory 中转站 App**（`inventory_*` 表 + `inventory-admin-*` Functions）。不要接到会员/商家/骑手会话或 City `packages` 主链路。Admin 控制台认证仍是 **Admin HMAC**（`verify-admin`），用 Service Role 读 Inventory 表；中转站员工登录仍走 Inventory App 自己的 `inventory-store-login` JWT，两套会话不要合并。

### 11.1 功能区块

| 区块 | 数据来源 | 说明 |
|------|----------|------|
| 概览统计 | `inventory-admin-data?scope=overview` + RPC `inventory_admin_overview_stats` | 8 项计数 + 车费合计 |
| 收入/支出卡片 | overview + 客户懒加载 | 客户总费用 vs 车费 |
| **跨境财务** | `scope=finance` 分页 | 系统自动汇总 + 手工「其它开销」 |
| 中转站表格 | finance 内 `transitStores` | 流水/待入账/车费/对账 |
| 客户信息 | `inventory-admin-customers` | IntersectionObserver 懒加载 |
| 最近包裹 | `scope=packs` | 可筛选状态 |

### 11.2 性能策略

- P0：overview / finance / packs 并行加载；finance 聚合缓存。
- P1：8 项 count 并行；finance 服务端分页；`transport_fee_total` migration。
- P2：客户列表懒加载。
- P3：overview 单次 RPC `inventory_admin_overview_stats()`。

### 11.3 账号与定价

- **跨境账号管理**弹窗：列表 + 创建/编辑（`inventory-admin-create/update-account`）。
- **跨境客户登记**：`CreateCrossBorderCustomerModal` → `inventory-admin-cross-border-customers` → 表 `cross_border_customers`。
- **跨境定价**：`CrossBorderPricingModal` → `system_settings`：
  - 默认路线：`pricing.cross_border.route.{origin}.{dest}.per_kg`
  - 客户专属：`pricing.cross_border.customer.{CODE}.route.{origin}.{dest}.per_kg`
  - 区域旧键：`pricing.{region}.cross_border.*`（仍可能存在，读价时需兼容）
- **其它开销**：`cross_border_manual_entries` 表 + `inventory-admin-cross-border-entry`。

### 11.4 跨境客户编码与按客户计费

**编码格式**（`src/utils/crossBorderCustomerCode.ts` 与 `netlify/functions/utils/crossBorderCustomerCode.js` 必须保持一致）：

```
区域 + 申请日 YYMMDD + 当日客量（不补零）+ 推销员序号 3 位
例：MDY2608241001 = MDY + 260824 + 1 + 001
```

旧码可能没有「当日客量」（日期后仅 3 位推销员序号）。解析时用 `dailySeqFromCustomerCode`；同日下一位用 `nextDailyCustomerSeq`（行数与已解析序号取较大值 + 1）。

Inventory 入库：`crossBorderPricing.ts` 先按客户编码取专属 `per_kg`，没有则回退默认路线价。Admin 计费弹窗用客户编码下拉框保存。

**Lookup**：RPC `lookup_cross_border_customer`；App `useCrossBorderCustomerLookup.ts`。

---

## 12. 中转物流业务流（MUSE → MDY → YGN）

> **A / B 切开**：§10.2 — **A** 负责木姐入库→打包→装车发出；**B** 负责曼德勒到站分拨/车费→再装车，以及仰光到站签收。本节是 **A+B 串联** 的完整故事线。

典型场景：木姐 **MUSE** 发站入库 → 打包 → 装车；经 **MDY** 中转 → 最终 **YGN** 目的。

1. **MUSE 装车出库**：可选多个 PKG（如 `PKG*MDY*` + `PKG*YGN*`），**本段目的地**选 MDY（与包装号最终目的地可不同）。
2. **MDY 到站收货**：扫 PKG → **步骤 1 确认到站** → **步骤 2** 分拨订单 → **步骤 3 支付车费**：
   - MDY 目的地订单 → 「确认入库」
   - YGN 等中转订单 → 「释放中转」→ 回到快递明细可再打包
3. **MDY 再装车**：将释放后的 YGN 订单重新打包，装车发往 YGN。
4. **YGN 到站**：仅看到 YGN 目的地订单/PKG；确认后客户签收。

**包装号规则**（`utils/packageNumber.ts`）：`PKG` + 年后两位 + **目的地码** + 件数 + 流水，例 `PKG26YGN10001`。

**本段运达站**：`packed_shipments.truck_leg_destination` / `inventory_pkg_tracking.leg_destination_code`（装车所选目的地，可与 `destination_code` 不同）。

---

## 13. 共享代码层 `/shared`

为减少 6 份 `supabase.ts` 重复，**纯逻辑**放在 `/shared/src`，经 `sync.mjs` 复制到各 app 的 `_shared/`（带 `AUTO-GENERATED` 头，**已提交 git**）。

| 文件 | 作用 | 消费方 |
|------|------|--------|
| `pricing.ts` | 计费规则合并 `buildPricingSettings`、领区解析 | admin、client、client-web、merchant、mobile |
| `productReview.ts` | 商品审核辅助 | merchant-web、merchant-app |
| `rechargeQr.ts` | 充值 QR 档位 | client、client-web |
| `merchantLoginGuard.ts` | 拦截 transit_station 登录商家端 | merchant-web、merchant-app |
| `merchantStoreTypes.ts` | 门店类型常量 | 多端 |
| `domainTypes.ts` | 共享类型 | 多端 |
| `services.ts` | banner/tutorial 工厂 | 多端 |

各 app `_shared` 目标目录：

| App | 目标目录 |
|-----|----------|
| 根 admin | `src/services/_shared/` |
| ml-express-client-web | `src/services/_shared/` |
| ml-express-merchant-web | `src/services/_shared/` |
| ml-express-client | `src/services/_shared/` |
| ml-express-merchant-app | `src/services/_shared/` |
| ml-express-mobile-app | `services/_shared/` |

- ❌ 不要改各 app 内 `_shared/` 副本。
- ✅ 只改 `/shared/src`，再 `npm run sync:shared`（根目录 `prestart`/`prebuild` 会自动跑）。
- **Inventory App 不使用 `/shared`**。

---

## 14. Supabase 与数据模型

所有前后端共享 **同一 Supabase 项目**（`uopkyuluxnrewvlmutam`）。

### 14.1 City 配送（会员/商家/骑手/后台）

| 域 | 表 |
|----|-----|
| 快递核心 | `packages`、`tracking_events`、`courier_locations`、`couriers` |
| 用户/门店 | `users`、`delivery_stores`、`address_book` |
| 商城 | `products`、`product_images`、`product_variants`、`store_reviews`、`pending_orders` |
| 运营 | `admin_accounts`、`finances`、`system_settings`、`notifications`、`banners`、`audit_logs` |
| 充值/告警 | `recharge_requests`、`delivery_alerts` |
| 骑手薪资 | `courier_salaries`、`courier_salary_details`、`courier_payment_records` |
| 商家入驻 | `merchant_applications` |

计费：`system_settings` 中 `pricing.{field}` 与 `pricing.{region}.{field}`。

**Realtime 订阅**：仅本地开发或未走 `/__sb` 时可用。生产 Admin / 缅甸浏览器 **轮询**（`isBrowserRealtimeAvailable() === false`），见 §2.1。

### 14.2 Inventory 中转站（Inventory App + Admin 跨境）

| 表 | 用途 |
|----|------|
| `inventory_store_items` | 订单/商品主数据（条码、目的地、打包状态、qty、**签收留痕**） |
| `inventory_stock_movements` | 入库/出库流水（含 `customer_code`） |
| `inventory_packed_shipments` | 快递包头 |
| `inventory_packed_shipment_items` | 包内订单行 |
| `inventory_pkg_tracking` | 装车后在途 PKG 追踪 |
| `inventory_order_tracking` | 包内订单追踪（到站/释放） |
| `inventory_hub_transport_fee_payments` | 到站车费支付状态 |
| `cross_border_manual_entries` | Admin 手工跨境收支 |
| `cross_border_customers` | Admin 登记客户（编码、电话、推销员、申请日） |

**登录账号**：`delivery_stores`（`store_type = transit_station`），与 City 合伙店铺同表不同业务。

### 14.3 指标 / 财务 / 代购

| 表 | 用途 |
|----|------|
| `import_metric_drafts` | 进口指标草稿 |
| `personal_ledger_entries` | 个人开销 |
| `proxy_purchase_workspaces` | 代购清单（按 workspace 隔离） |

### 14.4 RLS 要点（Inventory）

| 机制 | 说明 |
|------|------|
| JWT metadata | `inventory_store_code`、`inventory_hub_code` 来自 `inventory-store-login` |
| `inventory_session_active()` | 单设备会话校验 |
| `inventory_owner_code_matches()` | 店码归一化（MUSE ↔ MUSE001） |
| 按 hub 读写 | 发站写 origin；目的站读 leg_destination / destination |

**关键 migrations**：

| 文件 | 说明 |
|------|------|
| `20260617120000_inventory_rls_by_delivery_store.sql` | 初始 RLS + JWT |
| `20260621120000_inventory_single_device_session.sql` | 单设备会话 |
| `20260622120000_inventory_store_items_hub_custody_rls.sql` | 目的站托管 RLS |
| `20260623120000_inventory_owner_code_normalize_rls.sql` | store_items / packed_shipments 店码归一化 |
| `20260708120000_inventory_pkg_tracking_owner_rls.sql` | **pkg/order tracking 店码归一化**（装车同步修复） |
| `20260716180000_inventory_auth_security_hardening.sql` | 中转站密码哈希、登录冷却、JWT session 绑定、站点财务 RLS |
| `20260716185000_inventory_atomic_operations.sql` | 入库、打包、装车、到站幂等事务 RPC |
| `20260716190000_inventory_authenticate_store_ambiguity_fix.sql` | 修复登录 RPC `store_code` 歧义 |
| `20260610120000_inventory_shipment_tracking.sql` | PKG/订单追踪表 |
| `20260615120000_inventory_platform_store_data.sql` | 库存主表 |
| `20260621130000_inventory_admin_overview_stats.sql` | Admin overview RPC |
| `20260707120000_proxy_purchase_workspace.sql` | 代购清单表 |
| `20260720140000_inventory_customer_sign_receipt.sql` | 目的站客户签收留痕字段 |
| `20260803120000_cross_border_customer_lookup.sql` | `cross_border_customers` + `lookup_cross_border_customer` + movements.customer_code |
| `20260802160000_inventory_confirm_hub_received_dest_orders.sql` | 到站确认 RPC 与目的站订单 |

**Migrations 总数**：**64** 个文件（`supabase/migrations/`；以目录为准）。

> 不要在对话里擅自 `supabase db push`。需要上库时由维护者执行 Dashboard SQL 或明确授权的 CLI。

```bash
# 推送全部 migration
supabase db push

# 或 Supabase Dashboard SQL Editor 手工执行单个文件

# Edge Functions
supabase functions deploy inventory-store-login
supabase functions deploy inventory-change-password
supabase functions deploy inventory-clear-test-data
supabase functions deploy ensure-courier-auth
```

### 14.5 Edge Functions（`supabase/functions/`）

| 函数 | 用途 |
|------|------|
| `inventory-store-login` | 中转站登录 + Auth JWT + 虚拟邮箱 `inventory+{code}@inventory.mlexpress.internal` |
| `inventory-change-password` | 改密 |
| `inventory-clear-test-data` | 测试清空 |
| `ensure-courier-auth` | 骑手 Auth provisioning（City） |

---

## 15. Netlify 与 EAS 部署

### 15.1 Netlify 站点

| 应用 | 配置文件 | Base directory | Publish | 站点 ID |
|------|----------|----------------|---------|---------|
| 管理后台 | `/netlify.toml` | 仓库根 | `build/` | `ed9c2173-…` |
| 会员 Web | `ml-express-client-web/netlify.toml` | 子目录 | `build/` | `52f5f573-…` |
| 商家 Web | `ml-express-merchant-web/netlify.toml` | 子目录 | `build/` | `126af2b9-…` |

构建：`npm install --legacy-peer-deps && CI=false npm run build`（触发 `prebuild` → `sync:shared`）。

Admin 部署：`npm run deploy:netlify`（根 package.json）。

三站均配置 `/__sb/*` → supabase.co（Edge BFF 优先，rewrite 兜底）。会员/商家 Web 的 `netlify.toml` 同样有 `/__sb`。

Cloudflare Worker 备份：仓库根 `npm run deploy:supabase-proxy`（`cloudflare/supabase-proxy/wrangler.toml`）。

### 15.2 EAS 移动端

| App | Bundle ID | 主要 Profile |
|-----|-----------|--------------|
| client | `com.mlexpress.client` | production AAB / testflight |
| merchant-app | `com.mlexpress.merchants` | 同上 |
| mobile-app (staff) | `com.mlexpress.courier` | production AAB |
| inventory | `com.mlexpress.inventory` | production + **apk**（内测） |

Inventory EAS project 与 Supabase ref 配置见 `ml-express-inventory-app/eas.json`；`appVersionSource: local`（版本以 `app.json` 为准）。

---

## 16. 环境变量

| 环境 | 前缀 | 示例 |
|------|------|------|
| CRA（admin/client-web/merchant-web） | `REACT_APP_*` | `REACT_APP_SUPABASE_URL`、`REACT_APP_SUPABASE_ANON_KEY` |
| Expo（含 Inventory） | `EXPO_PUBLIC_*` + `app.config.js` `extra` | 会员/商家 Maps Key；Inventory 生产默认走 `/__sb`；`EXPO_PUBLIC_SUPABASE_DIRECT=1` 仅 VPN |
| Netlify Functions / Edge | Dashboard | `SUPABASE_SERVICE_ROLE_KEY`、`JWT_SECRET` 等；Edge 转发不需要把 service role 暴露给浏览器 |

**注意**：CRA 的 `REACT_APP_*` 与 Expo 的 `EXPO_PUBLIC_*` **不互通**，各 app 独立配置。

---

## 17. 常见问题与排障

### 17.1 Inventory「云端权限校验失败」/「同步快递包追踪失败」

**现象**：在线装车提交失败，或目的站无法扫码。

**常见根因**（非数据库损坏）：
1. **RLS 策略拒绝** — JWT 店码与数据行 `origin_store_code` 格式不一致（如 `MUSE` vs `MUSE001`）；需执行 `20260708120000` migration。
2. **JWT 过期** — 云端写入失败；需退出重新登录。
3. **Migration 未在生产执行** — 本地代码新但 Supabase 仍是旧 RLS。

**处理步骤**：
1. Supabase SQL Editor 执行缺失 migrations（尤其 `20260623120000`、`20260708120000`）。
2. App：**设置 → 退出 → 重新登录**。
3. 恢复网络后先核对云端 PKG 状态，再重新执行未完成的业务操作。

**代码路径**：`authService.ensureInventoryCloudAuth` → `inventoryService.applyTruckLoadOutbound` → `inventoryCloudApi.loadCloudShipmentsAtomic` → `inventory_load_shipments` RPC；RLS 错误映射见 `cloudAuthErrors.ts`。写操作须包 `withInventoryCloudWrite`（§10.12）。

### 17.2 指标管理换电脑看不到数据

- **进口指标草稿**：存 Supabase `import_metric_drafts`，非 localStorage。
- **代购清单**：需 migration `20260707120000`；原电脑打开一次完成云端上传。
- **个人开销**：按 `admin_accounts.username` 隔离，需同一账号登录。

### 17.3 Admin Console CSS 警告

`-moz-osx-font-smoothing` 等 vendor 前缀警告可忽略，不影响功能。

### 17.4 商家无法登录 Inventory / 商家端

`transit_station` 类型门店只能登录 **Inventory App**，不能登录商家 Web/App（`merchantLoginGuard`）。

### 17.5 到站签收首次点击失败 / 卡在第 1 步

**现象**：扫在途包点确认，红字权限失败（`syncRlsBlocked`），或 RPC 已成功但弹窗不进第 2 步。

**根因**：REST 第一次仍是 anon；force refresh 被非 force 请求吞掉；`/__sb` GET 缓存仍返回 `in_transit`。

**处理**：确认已发布带 JWT 拦截器的 Inventory JS；热更或重装 App；检查 Edge `supabase-bff` 的 `Cache-Control: no-store`。逻辑见 `useHubReceiveFlow.ts`、`preferConfirmedHubReceivePack`。

### 17.6 快递明细批量签收误报「店铺账号已停用」

**现象**：勾多单签收立刻 `storeDisabled`。

**根因**：`delivery_stores` SELECT 空/错曾被当成停用；且 `upsertCloudStoreItem` 未走写入守卫，第一单失败即中断。

**正确语义**：读不到行 → `unknown` / 会话过期（可重试）；读到非中转或非 active 才是停用。见 `interpretInventoryStoreAccess`。`bindInventoryCloudSession` 不要每次 `setSession`。

### 17.7 缅甸打不开后台 / App 连不上云

直连 `*.supabase.co` TLS reset。生产必须走对应域名的 `/__sb/`（尾斜杠）。Admin 不要把 Realtime 指到 `*.workers.dev`。本地可用 VPN + `EXPO_PUBLIC_SUPABASE_DIRECT=1` 直连调试。

---

## 18. 给 AI / 维护者的改代码提示

1. **先确认业务线**：`inventory_*`/装车/到站 → Inventory App 或 Admin 跨境；跑腿单 → City + `packages`。
2. **Inventory 先分 A / B（§10.2）**：**A** = 入库/多个入库/快递明细/打包/装车；**B** = 到站收货/付车费/释放中转/客户签收/跨境财务。改 A 勿动 B 的 `trackingService`，改 B 勿动 A 的 `createPackedShipment` / `applyTruckLoadOutbound`，除非明确跨边界 Bug。
3. **改路由**：后台 Router **v6**（`/admin/*`）；会员/商家 Web Router **v7**。
4. **改 Inventory 区域可见性**：`expressDetailsVisibility.ts` → `listItems` / `listPackedShipments`。
5. **改 Inventory 状态**：`packDisplayStatus.ts` + `trackingService`。
6. **改 Inventory A 侧读写（入库/打包/装车）**：`inventoryService.ts` + `inventoryCloudApi.ts` + `inventoryCloudStore.ts`，写操作包 `withInventoryCloudWrite`，并检查 RLS migration（`DEPLOYMENT.md`）。
7. **改 Inventory B 侧读写（到站/追踪/签收）**：`trackingService.ts` + `useHubReceiveFlow.ts` + `hubReceivePack.ts` + `HubReceiveOrdersModal.tsx`，并检查 `inventory_pkg_tracking` / `inventory_order_tracking` RLS。
8. **改 Admin 跨境 UI/API**：`CrossBorderLogisticsPage.tsx` + `inventoryConsoleService.ts` + `netlify/functions/inventory-admin-*`。
9. **改中转站账号**：Admin 跨境账号管理（**不要**在合伙店铺页创建 `transit_station`）。
10. **改计费/商品审核/充值 QR**：City 计费只改 `/shared/src`；**跨境路线/客户单价**改 `crossBorderRoutePricing.ts` + Inventory `crossBorderPricing.ts`（不走 `/shared`）。
11. **改 Supabase schema**：新增 migration，同步 §14.4；**不要擅自 `supabase db push`**。
12. **Inventory EAS 发布**：改 `app.json` version/buildNumber + `eas build`；Support URL 保持可访问。改完 Inventory JS 须用户 **重载 Expo / 重装 IPA**，热更未带上拦截器会再现 RLS。
13. **改打印**：`tsplLabelBuilder.ts` + `bleLabelPrinter.ts` / `bluetoothThermalPrinter.ts` + `printerService.ts`。
14. **勿提交** `.env`、keystore、`.temp/`、`upload-release.keystore`；仅用户要求时 commit。
15. **改 Google Play 媒体权限**：client / **商家 App** 的 `app.json blockedPermissions` + `utils/mediaAccess.ts` + `AndroidManifest.xml tools:node="remove"`。
16. **改 Inventory B 签收**：`CustomerSignFlowModal` + migration `20260720140000` + `markCustomerSigned`。
17. **改 STAFF 骑手端**：保留双工作区与 `admin_accounts` 登录；登录改 `staffApi/adminAccountService`；工作区改 `staffWorkspace.ts`；扫码改 `scanCodeHelpers` + `findPackageByScanCode`；提示走 `feedbackService`；日志走 `LoggerService`（见 §9、§22）。
18. **会员 App 勿恢复商家运营入口**；密钥勿写进客户端明文。
19. **改商家 App 提示/日志**：非确认走 `feedbackService`；生产门禁 `installProductionConsoleGate`；勿擅自加 Sentry。
20. **商家 App 勿恢复会员注册/商城/购物车**；**保留**首页「立即下单」（电话订餐代客下单）与地址簿。
21. **商家 App 登录**走 `merchant-password`，勿恢复客户端明文密码比对；Maps Key 只放 `.env` / EAS Secrets。
22. **改商家 App 业务 API**：改 `merchantApi/*`；`supabase.ts` 只做 barrel（与会员 `clientApi`、骑手 `staffApi` 同一手法）。
23. **改会员/商家 Web 提示/日志**：非确认走 `feedbackService`；生产门禁 `installProductionConsoleGate`；确认/破坏性继续 `window.confirm`。会员 Web 已有 Sentry 可保留；**勿给商家 Web 加 Sentry**。
24. **改 Admin Web 提示/日志**：非确认走 `feedbackService`；生产门禁 `installProductionConsoleGate`；确认/破坏性继续 `window.confirm`；**勿给 Admin 加 Sentry / 粒子背景 / 改 Router v6**。
25. **改缅甸可达网络**：`nativeSupabaseUrl.ts` / `supabaseBrowserUrl.ts` / `netlify/edge-functions/supabase-bff.js`；基址必须 `/__sb/` 尾斜杠；生产 Admin 勿拨 Worker Realtime WS。
26. **改跨境客户编码**：同步改 `src/utils/crossBorderCustomerCode.ts` 与 `netlify/functions/utils/crossBorderCustomerCode.js`，并跑两边测试。
27. **藏入库费用 UI**：只用 `SHOW_TOTAL_FEE_FIELD` 一类开关，仍写入金额；勿拆数据层。

---

## 19. 常用文件速查

| 我想… | 先看 |
|--------|------|
| **全仓架构一页恢复记忆** | **§22** |
| **商家 App 产品边界** | **§8.2**（保留代客下单；无注册/商城/购物车） |
| 商家 App 登录 / Maps Key | `merchantAuthService.ts`、`netlify/functions/merchant-password.js`、`app.config.js` |
| 商家 App 业务 API | `services/supabase.ts`（barrel）+ `services/merchantApi/` |
| **STAFF 工作区 / 双角色** | `utils/staffWorkspace.ts`、`App.tsx` MainTabs、`ProfileScreen` |
| STAFF 登录 / 密码校验 | `services/staffApi/adminAccountService.ts`、`LoginScreen.tsx` |
| STAFF 扫码取件送达 | `utils/scanCodeHelpers.ts`、`PackageDetailScreen`、`supabase.ts` `findPackageByScanCode` |
| STAFF 我的任务列表 | `MyTasksScreen.tsx`、`MyTaskPackageCard.tsx` |
| STAFF Toast / 生产日志 | `feedbackService.ts`、`GlobalToast.tsx`、`LoggerService.ts`、`index.ts` |
| 商家 App Toast / 生产日志 | `FeedbackService.ts`、`GlobalToast.tsx`、`LoggerService.ts`、`index.js` |
| 会员 Web Toast / 生产日志 | `FeedbackService.ts`、`GlobalToast.tsx`、`LoggerService.ts`、`index.tsx`（Sentry：`sentryInit`） |
| 商家 Web Toast / 生产日志 | `FeedbackService.ts`、`GlobalToast.tsx`、`LoggerService.ts`、`index.tsx`（**无 Sentry**） |
| Admin Web Toast / 生产日志 | `src/services/FeedbackService.ts`、`src/components/GlobalToast.tsx`、`src/services/LoggerService.ts`、`src/index.tsx`（**无 Sentry**） |
| STAFF 定位省电 | `locationService.ts`、`MapScreen.tsx`、`InAppNavigationModal.tsx` |
| **缅甸 `/__sb` 代理** | **§2.1**；`supabaseBrowserUrl.ts`、`nativeSupabaseUrl.ts`、`supabase-bff.js` |
| **Inventory JWT 写入守卫** | **§10.12**；`cloudWriteGuard.ts`、`authService.ts`、`supabase.ts` fetch |
| Inventory B：到站收货 UI | `HubReceiveScreen.tsx`、`HubReceiveOrdersModal.tsx`、`useHubReceiveFlow.ts` |
| Inventory B：到站步骤推导 | `hubReceivePack.ts`（`resolveHubReceiveStep`、`preferConfirmedHubReceivePack`） |
| Inventory B：追踪 / 到站 RPC | `trackingService.ts` → `inventory_confirm_pkg_hub_received` |
| Inventory 店铺停用判定 | `cloudAuthErrors.interpretInventoryStoreAccess`（空行 ≠ `storeDisabled`） |
| 跨境客户编码 | `crossBorderCustomerCode.ts`、`CreateCrossBorderCustomerModal.tsx` |
| 跨境按客户计费 | `crossBorderRoutePricing.ts`、`CrossBorderPricingModal.tsx`、Inventory `crossBorderPricing.ts` |
| 跨境登记客户 API | `inventory-admin-cross-border-customers.js`、`cross_border_customers` |
| Inventory B：车费 | `hubTransportFeeService.ts` |
| Inventory 云端 RLS 错误识别 | `cloudAuthErrors.ts` → `trackingService.throwTrackingCloudWriteError` |
| Inventory 云端 CRUD | `inventoryCloudApi.ts` |
| Inventory 内存缓存 | `inventoryCloudStore.ts` |
| 蓝牙标签打印 | `printerService.ts`、`tsplLabelBuilder.ts` |
| Admin 跨境控制台 | `CrossBorderLogisticsPage.tsx`、`inventoryConsoleService.ts` |
| 跨境账号 CRUD | `CrossBorderAccountManagementModal.tsx`、`inventory-admin-update-account.js` |
| 代购清单 | `ProxyPurchasePage.tsx`、`proxy_purchase_workspaces` |
| 进口指标草稿 | `ImportMetricDraftsPage.tsx`、`import_metric_drafts` |
| Admin 跨境性能 | `inventory-admin-data.js`、`inventory_admin_overview_stats` RPC |
| Inventory App Store | `app.config.js`、`eas.json`、`LoginScreen.tsx` |
| Support 页 | `ml-express-client-web/.../SupportPage.tsx` |
| 目的站客户签收 | `CustomerSignFlowModal.tsx`、`customerBatchSign.ts`、`markCustomerSigned` |
| 合伙店铺（不含中转站） | `DeliveryStoreManagement.tsx` |
| 会员 App 应用内更新 | `appUpdateService.ts`、`docs/sql/client_android_latest_release.sql` |
| 会员 App 媒体权限 / 选图 | `ml-express-client/src/utils/mediaAccess.ts`、`app.json blockedPermissions` |
| 商家 App 媒体权限 / 选图 | `ml-express-merchant-app/src/utils/mediaAccess.ts`、`app.json blockedPermissions` |
| 代购报价表 | `ProxyQuotePage.tsx`、`utils/proxyQuoteExcel.ts` |
| 商家下单弹窗 | `merchant-web/.../OrderModal.tsx` |
| 会员/商家计费 | `/shared/src/pricing.ts` |
| 管理后台权限菜单 | `App.tsx`、`AccountManagement.tsx`、`AdminShellLayout.tsx` |
| Supabase migrations | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |

---

## 20. 版本与分支

| 项目 | 版本 | Build / Code | 备注 |
|------|------|--------------|------|
| 管理后台（根） | **2.2.4** | — | `package.json`；生产域 `admin-market-link-express.com` |
| ml-express-client | **2.8.0** | **74** | `app.json` / `package.json` |
| ml-express-merchant-app | **2.5.4** | **24** | 以 `app.json` 为准（`package.json` 可能滞后） |
| ml-express-mobile-app | **2.4.3** | **81** | STAFF 骑手端 |
| ml-express-inventory-app | **2.0.0** | **34** | JWT + `/__sb`；到站三步；客户编码计费 |
| ml-express-client-web | **0.1.0** | — | `market-link-express.com` |
| ml-express-merchant-web | **0.1.0** | — | `mlexpress-merchants.com` |

各 Expo App 各自 `eas.json`；Inventory 使用 `appVersionSource: local`。

功能分支示例：`cursor/client-merchant-order-and-web`。

---

## 21. CI 与质量门禁

### 21.1 GitHub Actions

- 工作流：`.github/workflows/typecheck.yml`
- 触发：`pull_request`、推送到 `main`
- 矩阵：**7 个子项目** 并行跑 `tsc --noEmit`

| 项目路径 | 说明 |
|----------|------|
| `.` | 管理后台 CRA |
| `ml-express-client-web` | 会员 Web |
| `ml-express-merchant-web` | 商家 Web |
| `ml-express-client` | 会员 App |
| `ml-express-merchant-app` | 商家 App |
| `ml-express-mobile-app` | STAFF App |
| `ml-express-inventory-app` | Inventory App |

### 21.2 基线门禁

- 脚本：`scripts/ci-typecheck.mjs` + `scripts/typecheck-baselines.json`
- **Clean 项目**：必须 0 类型错误。
- **RN 项目**：以现有错误数为基线（不允许变多）；修复后下调基线。

### 21.3 Inventory 单元测试

```bash
cd ml-express-inventory-app && npm test    # vitest
cd ml-express-inventory-app && npm run typecheck
```

---

## 22. 架构记忆恢复卡（全仓速记）

> 忘记项目时先读本节，再按业务跳到对应章节。细节以代码为准。

### 22.1 一句话地图

| 包 | 给谁用 | 数据边界 | 部署 |
|----|--------|----------|------|
| 根 `src/` | 运营 Admin | City + 跨境控制台 | Netlify + `/__sb` |
| `ml-express-client-web` | 会员浏览器 | City `users`/`packages`/`orders` | Netlify + `/__sb` |
| `ml-express-merchant-web` | 商家浏览器 | `delivery_stores` | Netlify + `/__sb` |
| `ml-express-client` | 会员手机 | City；**仅 customer** | EAS；REST → `market-link-express.com/__sb/` |
| `ml-express-merchant-app` | 商家手机 | `delivery_stores` | EAS；REST → `mlexpress-merchants.com/__sb/` |
| `ml-express-mobile-app` | 骑手/员工 STAFF | City + `admin_accounts` | EAS；REST → Admin 域 `/__sb/` |
| `ml-express-inventory-app` | 中转站 | **仅** `inventory_*` + 店铺 JWT | EAS；REST → Admin 域 `/__sb/` |
| `/shared` | 跨端纯逻辑 | 同步到各端 `_shared`（Inventory 除外） | sync 脚本 |
| `netlify/edge-functions` | `/__sb` BFF | 转发 supabase.co、剥 `__cf_bm`、禁缓存 | Netlify Edge |
| `cloudflare/supabase-proxy` | 备份代理 | 诊断用；生产 Admin 勿拨其 WS | Wrangler |

**两条业务线永不混表**：City（`packages`…）≠ Inventory（`inventory_*`）。

### 22.2 认证红线（勿改错）

```
会员     → users（customer）自定义会话
商家     → delivery_stores + merchant-password（App；无客户端明文兜底）
STAFF    → admin_accounts + admin-password + ensure-courier-auth（非纯 Supabase Auth）
Admin Web→ admin-password 登录 + verify-admin HMAC Cookie（无客户端自签 / 无 admin/admin / 无明文密码回退）
Inventory→ inventory-store-login → Supabase Auth JWT（移动端唯一 JWT 主路径）
```

- **指标管理**：Admin 内部独立模块，不链会员/商家/骑手/Inventory。
- **跨境物流**：只链 Inventory App 的数据与中转站账号；Admin 控制台用 HMAC，Inventory App 用自己的 JWT。

### 22.3 STAFF 决策快照（2026-08）

1. **双工作区** `admin` | `courier`，双岗可切换；**不删管理员**。
2. **登录**只信服务端密码校验；无客户端明文兜底。
3. **扫码主路径**：取件扫包裹码，送达扫 `STORE_`；地图 → 详情 `openScan`。
4. **体验**：Toast 统一非确认提示；`MyTasks` SectionList；地图离屏停定位。
5. **生产**：console 门禁 + `LoggerService` + Sentry。
6. 版本锚点：**2.4.3 (81)**；详述见 **§9**。

### 22.4 Inventory 决策快照

- **A 发站**：入库 →（客户编码可选）货物 → 打包 → 装车（基本完成）。费用可藏 UI，数据仍写。
- **B 到站**：弹窗三步 确认到站 → 入库/释放中转 → 车费；再客户签收。
- 生产 REST 必须店铺 JWT + `/__sb/`；写走 `withInventoryCloudWrite`。
- 读不到 `delivery_stores` 行 ≠ 店铺停用。
- 在线专用、不写 `/shared`；详述见 **§10.2**、**§10.12**。

### 22.5 改代码入口（最短路径）

| 目标 | 入口 |
|------|------|
| 计费/审核/充值 QR | `/shared/src` → `npm run sync:shared` |
| Admin 菜单/权限 | 根 `src/App.tsx`、`AccountManagement` |
| Admin City 包裹列表 | `CityPackages.tsx` + `packageService.listCityPackagesPage`（勿改财务 `getAllPackages`） |
| Admin Toast / 生产日志 | `FeedbackService`、`GlobalToast`、`LoggerService`、`src/index.tsx`（无 Sentry） |
| Admin 认证 | `src/services/authService.ts`、`netlify/functions/admin-password.js`、`verify-admin.js` |
| Admin 跨境 | `CrossBorderLogisticsPage` + `inventory-admin-*` Functions（只链 Inventory，Admin HMAC ≠ Inventory JWT） |
| 会员 App | `ml-express-client/src/`（clientApi / screens） |
| 会员 Web | §5 + FeedbackService / LoggerService（保留既有 Sentry） |
| 商家 App | §8 + `merchantApi/` + `merchantAuthService` + FeedbackService / LoggerService |
| 商家 Web | §6 + FeedbackService / LoggerService（无 Sentry） |
| STAFF | §9 + `staffApi/` + `staffWorkspace` + `scanCodeHelpers` |
| Inventory A/B | §10.2 + `inventoryService` / `trackingService` |
| Inventory JWT / 到站三步 | §10.12 + `cloudWriteGuard` + `hubReceivePack` |
| 跨境客户编码 / 专属单价 | §11.4 + `crossBorderCustomerCode` + `crossBorderRoutePricing` |
| 缅甸网络 | §2.1 + `supabase-bff.js` |
| Schema | `supabase/migrations/` + 更新 §14（64 个文件；勿擅自 db push） |
| 类型门禁 | `.github/workflows/typecheck.yml` + `scripts/ci-typecheck.mjs` |

### 22.6 勿做清单

- 勿让 Inventory REST 用 **anon** 写 `inventory_*`（必须店铺 JWT）。
- 勿去掉 `/__sb` 基址尾斜杠；勿让缅甸原生默认直连 `*.supabase.co`。
- 勿把生产 Admin Realtime 指到 `*.workers.dev`。
- 勿把 `delivery_stores` SELECT 空当成 `storeDisabled`。
- 勿擅自 `supabase db push` / 改登录与访客校验（除非用户明确要求）。
- 勿把 Inventory 表当 City 包裹用（或反向）。
- 勿把 **指标管理** 接到会员/商家/骑手/Inventory 登录或业务流。
- 勿把 **跨境物流** 接到 City 会员/商家/骑手会话；只链 Inventory App。
- 勿在 Admin Web 客户端自签 HMAC，勿恢复 `admin`/`admin` 或明文密码登录回退。
- 勿在合伙店铺流创建 `transit_station`（走跨境账号）。
- 勿手改各端 `_shared/` 副本。
- 勿提交 `.env`、keystore、`.cursor/` 计划垃圾。
- STAFF：勿删管理端；勿改回明文密码登录。
- 会员 App：勿恢复商家运营能力入口。
- 商家 App：非确认提示走 `feedbackService`；勿擅自加 `@sentry/react-native`。
- 会员/商家 Web：非确认提示走 `feedbackService`；勿各页再挂本地 Toast。
- 商家 Web：勿擅自加 `@sentry/react`。
- Admin Web：非确认提示走 `feedbackService`；勿各页再挂本地 Toast；勿擅自加 Sentry / 粒子背景 / 改 Router v6。
- 商家 App：勿恢复会员注册/商城/购物车；**保留**电话订餐「立即下单」。
- 商家 App：勿改回客户端明文密码登录；勿把 Maps Key 写回 `app.json`。
- 商家 App：勿在 Android 选图时申请 `READ_MEDIA_*` / `READ_EXTERNAL_STORAGE`（走 Photo Picker，见 §8.7）。

---

*最后更新：2026-08-25 — 全仓架构对齐：缅甸 `/__sb` BFF、Inventory JWT 写入守卫与到站三步、跨境客户编码按日计费；版本号与 migrations 数量以仓库为准。*
