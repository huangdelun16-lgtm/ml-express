# MARKET LINK EXPRESS — AI 与维护者架构指南

本文档概括本仓库（**market-link-express / ml-express**）内所有产品形态、目录职责、数据边界、关键业务流程与部署关系，便于后续改需求或让 AI 快速建立上下文。**若本指南与代码不一致，以仓库当前文件为准，并请同步更新本文件。**

---

## 目录

1. [仓库总览](#1-仓库总览)
2. [生产域名与部署矩阵](#2-生产域名与部署矩阵)
3. [子项目一览](#3-子项目一览)
4. [管理后台（仓库根 `src/`）](#4-管理后台仓库根-src)
5. [会员端网站 `ml-express-client-web`](#5-会员端网站-ml-express-client-web)
6. [商家端网站 `ml-express-merchant-web`](#6-商家端网站-ml-express-merchant-web)
7. [会员 App `ml-express-client`](#7-会员-app-ml-express-client)
8. [商家 App `ml-express-merchant-app`](#8-商家-app-ml-express-merchant-app)
9. [骑手/员工 App `ml-express-mobile-app`](#9-骑手员工-app-ml-express-mobile-app)
10. [Inventory 中转站 App `ml-express-inventory-app`](#10-inventory-中转站-app-ml-express-inventory-app)
11. [Admin 跨境物流控制台](#11-admin-跨境物流控制台)
12. [中转物流业务流（MUSE → MDY → YGN）](#12-中转物流业务流muse--mdy--ygn)
13. [共享代码层 `/shared`](#13-共享代码层-shared)
14. [Supabase 与数据模型](#14-supabase-与数据模型)
15. [Netlify 与 EAS 部署](#15-netlify-与-eas-部署)
16. [环境变量](#16-环境变量)
17. [常见问题与排障](#17-常见问题与排障)
18. [给 AI / 维护者的改代码提示](#18-给-ai--维护者的改代码提示)
19. [常用文件速查](#19-常用文件速查)
20. [版本与分支](#20-版本与分支)

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
  NF[Netlify\n静态站 + Functions]
  CW --> SB
  CA --> SB
  MW --> SB
  MA --> SB
  ADM --> SB
  RIDER --> SB
  INV --> SB
  SH -. sync .-> CW
  SH -. sync .-> CA
  SH -. sync .-> MW
  SH -. sync .-> MA
  SH -. sync .-> ADM
  SH -. sync .-> RIDER
  CW --> NF
  MW --> NF
  ADM --> NF
  INV -. 独立 EAS .-> SB
```

### 两条业务线（勿混表）

| 业务线 | 典型表 | 典型 App / 模块 |
|--------|--------|-----------------|
| **City 配送 / 商城 / 跑腿** | `packages`、`orders`、`products`、`couriers`… | 会员/商家/骑手 App + 管理后台 City 模块 |
| **中转站库存 / 跨境包裹** | `inventory_*`、`cross_border_manual_entries` | `ml-express-inventory-app` + Admin **跨境物流** |

### 认证体系概览

| 端 | 登录方式 | 会话存储 |
|----|----------|----------|
| 会员 Web/App | `users` 表（customer）邮箱/手机 + 密码 | `localStorage` / `AsyncStorage` |
| 商家 Web/App | `delivery_stores` 店铺码 + 密码 | `localStorage` / `AsyncStorage` |
| 骑手 App | `admin_accounts` + `ensure-courier-auth` Edge Function | `AsyncStorage` |
| 管理后台 | `verify-admin` Netlify Function + HMAC JWT Cookie | session/localStorage |
| Inventory App | `inventory-store-login` Edge Function → Supabase Auth JWT | SecureStore + Supabase Auth |

---

## 2. 生产域名与部署矩阵

| 产品 | 典型域名 / 渠道 | 说明 |
|------|-----------------|------|
| 会员 Web | `market-link-express.com` | `ml-express-client-web` Netlify |
| 管理后台 | `admin-market-link-express.netlify.app` 或自定义 admin 域 | 仓库根 CRA + Functions |
| 商家 Web | 独立 Netlify 站点 | `ml-express-merchant-web` |
| Inventory App Support | `https://market-link-express.com/support` | App Store Support URL |
| Inventory iOS | App Store `com.mlexpress.inventory` | EAS Build，当前 **1.4.1 (10)** |
| Supabase | `uopkyuluxnrewvlmutam.supabase.co` | 全端共用同一项目 |

> ⚠️ 勿在 App Store 使用无效域名（如 `linkexpress.com/support`）；Support URL 必须可访问。

---

## 3. 子项目一览

| 目录 | 类型 | 角色 | 技术栈 | 当前版本 | 部署 |
|------|------|------|--------|----------|------|
| **`/`（仓库根）** | Web | **管理后台**：订单、用户、财务、跟踪、告警、合伙店铺、报表、跨境物流 | CRA + TS + React Router **v6** | **2.2.4** | Netlify（根目录） |
| **`ml-express-client-web/`** | Web | **会员端网站**：首页、商城、购物车、账户、Support | CRA + TS + React Router **v7** | **0.1.0** | Netlify |
| **`ml-express-merchant-web/`** | Web | **商家端网站**：门店订单/商品/对账 | CRA + TS + React Router **v7** | **0.1.0** | Netlify |
| **`ml-express-client/`** | Mobile | **会员 App** `com.mlexpress.client` | Expo SDK 54 / RN 0.81 | **2.5.0** | EAS |
| **`ml-express-merchant-app/`** | Mobile | **商家 App** `com.mlexpress.merchants` | Expo SDK 54 / RN 0.81 | **2.4.0** | EAS |
| **`ml-express-mobile-app/`** | Mobile | **骑手/员工端** `com.mlexpress.courier` | Expo SDK 54 / RN 0.81 | **2.3.7** | EAS |
| **`ml-express-inventory-app/`** | Mobile | **中转站库存 App** `com.mlexpress.inventory` | Expo SDK 54 + SQLite + 蓝牙打印 | **1.4.1 (10)** | EAS |
| **`shared/`** | 共享源 | 跨端纯逻辑单一源 | TS | — | sync 进各 app |
| **`netlify/`** | 服务端 | 管理后台 Netlify Functions | Node | — | — |
| **`supabase/`** | 数据 | SQL migrations + Edge Functions | SQL / Deno | — | Supabase Cloud |
| **`design/` `specs/` `scripts/` `docs/`** | 资源 | 设计、规格、CI 脚本、归档文档 | — | — | — |

> 根 `package.json` 的 `name` 为 `market-link-express`，**代码职责是管理后台**；勿与 `ml-express-client-web` 站点混用 Base directory。

> 历史排障文档已归档至 `docs/archive/`；构建产物（apk/aab/zip）不入库（见 `.gitignore`）。

---

## 4. 管理后台（仓库根 `src/`）

### 4.1 目录结构

| 路径 | 职责 |
|------|------|
| `src/index.tsx` → `src/App.tsx` | 入口与路由表 |
| `src/pages/` | 页面（见 §4.2） |
| `src/components/` | 通用与跨境组件（`CrossBorder*`、`CblTablePagination`） |
| `src/layouts/AdminShellLayout.tsx` | 侧栏+顶栏；`STANDALONE_ADMIN_MODULE_PATHS` |
| `src/contexts/` | 含 `AdminTodoContext` |
| `src/services/supabase.ts` | Supabase 客户端 + 各业务 service |
| `src/services/inventoryConsoleService.ts` | 跨境 Admin API 客户端 |
| `src/utils/crossBorderHubs.ts` | MUSE/MDY/YGN 枢纽与账号草稿 |
| `src/styles/crossBorderLogistics.css` | 跨境独立页样式 |
| `src/services/_shared/` | `/shared` 同步副本（**勿手改**） |
| `netlify/functions/` | 服务端（§4.6） |

### 4.2 路由与页面（`src/App.tsx`）

根 `/` → `/admin/login`；`**/admin/**` + `ProtectedRoute`（角色 + `permissionId`）。

| 路径 | 页面 | 权限 |
|------|------|------|
| `/admin/login` | `AdminLogin` | — |
| `/admin/dashboard` | 仪表盘 | 默认 |
| `/admin/city-packages` | City 包裹 | `city_packages` |
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
| `/admin/metric-management` | 指标管理（**全屏独立**，4 Tab 见 §4.7） | `metric_management` |
| `/admin/proxy-purchase` | 代购清单（独立页，也可从指标管理 Tab 进入） | `metric_management` |
| `/admin/product-price` | 商品价格 | — |
| `/admin/personal-expenses` | 个人开销 | — |
| `/admin/cross-border-logistics` | 跨境物流（**全屏独立**） | `cross_border_logistics` |

### 4.3 独立全屏模块

`STANDALONE_ADMIN_MODULE_PATHS`：`/admin/metric-management`、`/admin/cross-border-logistics`。无通用侧栏/全局搜索/待办条。

### 4.4 合伙店铺 vs 中转站

- **合伙店铺**：City 配送门店；列表过滤 `transit_station`。
- **跨境物流**：中转站账号、财务、包裹；**跨境账号管理** 创建/编辑 `transit_station`。

### 4.5 跨境物流前端关键文件

| 文件 | 职责 |
|------|------|
| `CrossBorderLogisticsPage.tsx` | 主控制台 |
| `CrossBorderAccountManagementModal.tsx` | 账号列表/编辑 |
| `CreateCrossBorderAccountModal.tsx` | 创建/编辑表单+地图 |
| `CrossBorderManualEntryModal.tsx` | 其它开销 |
| `CrossBorderPricingModal.tsx` | 跨境定价 |
| `StationReconciliationModal.tsx` | 对账 |
| `inventoryConsoleService.ts` | Admin API |

### 4.6 Netlify Functions（根 `netlify/functions/`）

**通用 Admin**

| 函数 | 用途 |
|------|------|
| `verify-admin` | 校验 Admin JWT |
| `admin-password` | 改密 |
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
| `inventory-admin-finance.js` | 财务明细 |
| `inventory-admin-clear-test-data.js` | 清空测试数据 |

**Utils**：`inventoryTransitAccount.js`、`inventoryFinanceAggregate.js`、`inventoryCustomerAggregate.js`、`packDisplayStatus.js`、`cors.js`。

生产 Netlify 站点 ID：`ed9c2173-4031-4f10-a466-5b041dfe3511`。

### 4.7 指标管理 Hub（`ImportMetricDraftsPage.tsx`）

全屏独立模块，内含 4 个 Tab（换电脑需 Supabase 云端数据，勿只依赖 localStorage）：

| Tab | 页面/组件 | 数据存储 |
|-----|-----------|----------|
| 进口指标草稿 | 本页表格 + 编辑弹窗 | `import_metric_drafts`（Supabase） |
| 商品价格 | 嵌入商品价格区块 | `products` / 定价设置 |
| 个人开销 | `PersonalExpensePage` | `personal_ledger_entries`（按 username 隔离） |
| 代购清单 | `ProxyPurchasePage` | `proxy_purchase_workspaces`（Supabase，migration `20260707120000`） |

---

## 5. 会员端网站 `ml-express-client-web/`

- 仅服务会员（`localStorage`：`ml-express-customer`）。
- 目录：`src/{pages,components,contexts,services,constants,styles,utils}` + `src/services/_shared/`。
- 路由（`src/App.tsx`）：
  - `/` 着陆页（内嵌服务/追踪/联系区块）
  - `/profile`、`/mall`、`/mall/:storeId`、`/cart`
  - `/privacy-policy`、`/terms-of-service`、`/delete-account`
  - **`/support`** — ML Inventory App Store 支持页（`SupportPage.tsx`）
- Netlify Functions：`merchant-apply`、`merchant-apply-upload`、`send-sms`、`verify-sms`、`send-email-code` 等。
- Netlify 站点 ID：`52f5f573-ca0a-4769-a8c7-e5f675764056`。
- `/download`、`/download-rider` → GitHub Releases APK 重定向。

```bash
cd ml-express-client-web && npm install && npm start
```

---

## 6. 商家端网站 `ml-express-merchant-web/`

- 目录：`src/{pages,components,contexts,hooks,services,…}` + `_shared/`。
- **下单弹窗**：`src/components/home/OrderModal.tsx` + `orderModalWizard.ts`（4 步向导）。
- 多规格：`ProductVariantPicker.tsx` + `utils/productVariants.ts`。
- Auth：`delivery_stores.store_code` + 密码 → `localStorage`；拒绝 `transit_station`（`merchantLoginGuard`）。
- 路由：`/login` → `/`（Profile）、`/products`、`/orders`。
- Netlify 站点 ID：`126af2b9-244f-47fd-9be9-58fb45b6e7a2`。

```bash
cd ml-express-merchant-web && npm install && npm start
```

---

## 7. 会员 App `ml-express-client`

| 项 | 值 |
|----|-----|
| 包名 | `com.mlexpress.client` |
| 版本 | **2.5.0**（iOS build 64 / Android versionCode 64） |
| 技术 | Expo 54 + RN 0.81 + React Navigation |
| Deep link | `ml-express-client://`、`https://mlexpress.com` |

**目录**：`src/{screens,components,contexts,services,utils}` + `src/services/_shared/`。

**核心屏幕**：Welcome → Login/Register → Main(Home tabs) → PlaceOrder、MyOrders、TrackOrder、CityMall、Cart、Profile、OrderDetail…

**Auth**：`users` 表 `user_type='customer'`，非 Supabase Auth JWT；会话 `AsyncStorage`（`currentUser`）；支持游客模式。

**Supabase 表**：`users`、`packages`、`address_book`、`delivery_stores`、`products`、`user_notifications`、`banners` 等。

**构建**：

```bash
cd ml-express-client
npm install && npx expo start
eas build --platform ios --profile production   # 或 android / apk
```

---

## 8. 商家 App `ml-express-merchant-app`

| 项 | 值 |
|----|-----|
| 包名 | `com.mlexpress.merchants` |
| 版本 | **2.4.0** |
| Scheme | `ml-express-merchants://` |

与会员 App 架构相同，额外 `expo-image-manipulator`（商品图）。

**Auth**：`delivery_stores` 店铺码 + 密码；`merchantLoginGuard` 拦截 `transit_station`。

**核心屏幕**：Welcome → Login → Main → MyOrders、MerchantProducts、PlaceOrder、Cart、Profile…

---

## 9. 骑手/员工 App `ml-express-mobile-app`

| 项 | 值 |
|----|-----|
| 包名 | `com.mlexpress.courier` |
| 显示名 | MARKET LINK STAFF |
| 版本 | **2.3.7** |
| Scheme | `ml-express-staff://` |

**目录结构（无 `src/` 前缀）**：`screens/`、`services/`、`navigation/`（lazyScreens）、`components/`、`contexts/`、`database/`（本地 SQLite）、`services/_shared/`。

**Auth**：`admin_accounts` 登录；骑手 provisioning 走 `ensure-courier-auth` Edge Function；Supabase client `persistSession: false`。

**核心屏幕**：Login → LocationDisclosure → Main tabs（Dashboard/MyTasks/Map/Scan/Profile）→ PackageDetail、DeliveryHistory、PackageManagement、CourierManagement、FinanceManagement…

**特性**：`@sentry/react-native`、后台定位（`expo-location` + `expo-task-manager`）、角色守卫（管理员可见财务/骑手管理）。

```bash
cd ml-express-mobile-app && npm install && npx expo start
npm run build:aab   # Android AAB 生产包
```

---

## 10. Inventory 中转站 App `ml-express-inventory-app`

独立 Expo 应用，供 Admin 创建的 **中转站合伙店铺**（`delivery_stores.store_type = transit_station`）使用。详细云端设计见 **`ml-express-inventory-app/docs/CLOUD_DATA_ARCHITECTURE.md`**（若存在）。

### 10.1 定位与数据策略

| 项 | 值 |
|----|-----|
| 包名 | iOS/Android `com.mlexpress.inventory` |
| App Store 名 | **ML Inventory** |
| 版本 | **1.4.1**（iOS build **10** / Android versionCode **10**） |
| 登录 | Edge Function `inventory-store-login` → Supabase Auth JWT |
| JWT claims | `inventory_store_code`、`inventory_hub_code` 等 |
| 本地 | SQLite + 离线队列 `cloud_sync_queue` |
| 云端 | `inventory_*` 表；与 City **`packages`/`orders` 隔离** |
| 多语言 | `src/i18n/`（中/英/缅）+ `LanguageContext` |
| Support URL | `src/constants/support.ts` → `https://market-link-express.com/support` |

**Supabase 配置**：`app.config.js` 将 URL/anon key 写入 `extra`；EAS production 见 `eas.json` env；本地 `.env` 可覆盖。

**不参与 `/shared` sync**（独立业务线）。

### 10.2 目录结构

```
ml-express-inventory-app/src/
├── screens/           # 业务页（见 10.3）
├── components/        # HubReceiveOrdersModal、PackExpressModal、OrderBarcodeModal、LabelPrintPreviewCard…
├── contexts/          # AuthContext、LanguageContext
├── i18n/              # translations.ts、format.ts、types.ts
├── navigation/        # AppNavigator（Stack）
├── constants/         # branding.ts、xprinterP203a.ts
├── services/
│   ├── database.ts              # SQLite schema / migrations
│   ├── inventoryService.ts      # 核心业务（入库/打包/装车/到站/列表）
│   ├── trackingService.ts       # inventory_pkg/order_tracking 云端
│   ├── inventoryCloudSync.ts    # 拉取/推送/合并/装车双写
│   ├── inventoryCloudApi.ts     # Supabase inventory_* CRUD
│   ├── inventoryCloudQueue.ts   # 离线重试队列
│   ├── inventoryCloudRealtime.ts
│   ├── authService.ts           # 中转站登录会话 + ensureInventoryCloudAuth
│   ├── hubTransportFeeService.ts
│   ├── financeLedgerService.ts
│   ├── printerService.ts        # 标签打印编排
│   ├── bluetoothThermalPrinter.ts  # 蓝牙直连 Xprinter P203A
│   └── tsplLabelBuilder.ts      # TSPL 指令生成
├── utils/
│   ├── expressDetailsVisibility.ts  # 区域可见性
│   ├── packDisplayStatus.ts         # 打包列表状态
│   ├── storeOwnership.ts            # MUSE/YGN/MDY 归属与编辑权限
│   ├── storeZone.ts                 # resolveStoreHubCode
│   ├── cloudAuthErrors.ts           # RLS 错误识别
│   ├── labelPrintLayout.ts
│   └── …
└── types/             # inventory.ts, tracking.ts
```

### 10.3 屏幕与导航（`AppNavigator.tsx`）

| Screen | 标题 | 职责 |
|--------|------|------|
| `HomeScreen` | ML Inventory | 入口、统计、快捷入口 |
| `StockInScreen` | 入库 | 登记订单、生成入库条码；成功后自动弹 Barcode 打印（可取消） |
| `ItemsScreen` | **快递明细** | 订单列表、打包快递、多选打印 |
| `PkgScreen` | **打包** | 已打包 PKG 列表、编辑/拆包/打印 |
| `StockOutScreen` | **装车出库** | 选 PKG、选本段目的地、发车 |
| `HubReceiveScreen` | **到站收货** | 扫 PKG/订单、确认到站、分拨、付车费 |
| `ShipmentTrackScreen` | 在途追踪 | 发站视角看在途包 |
| `TrackExpressScreen` | 追踪快递 | 单笔查询 |
| `MovementsScreen` | 流水 | 出入库流水 |
| `CrossBorderFinanceScreen` | **跨境财务** | 站点账本/待入账/车费 |
| `OpsHealthScreen` | 运维健康 | 同步/连接诊断 |
| `CameraScanScreen` | 通用扫码 | 系统相机权限 |
| `SettingsScreen` | 设置 | 店铺信息、同步、打印机、改密、退出 |
| `ItemFormScreen` | 商品 | 编辑订单字段 |

### 10.4 核心业务流程

```mermaid
flowchart LR
  A[入库 StockIn] --> B[快递明细 Items]
  B --> C[打包快递 PackExpressModal]
  C --> D[打包列表 Pkg]
  D --> E[装车出库 StockOut]
  E --> F[云端 inventory_pkg_tracking]
  F --> G[到站收货 HubReceive]
  G --> H{订单目的地}
  H -->|本站| I[确认入库 / 客户签收]
  H -->|其它站| J[释放中转 → 再打包 → 再装车]
```

| 步骤 | 关键函数 / 文件 |
|------|-----------------|
| 入库 | `inventoryService.applyStockMovement`（type=in） |
| 打包 | `createPackedShipment` → 本地 `packed_shipments` + 推 `inventory_packed_shipments` |
| 装车 | `applyTruckLoadOutbound` → `pushTruckLoadToCloud` + `trackingService.pushTruckLoadTracking` |
| 到站收包 | `trackingService.confirmPkgHubReceived` |
| 到站收单 | `confirmOrderHubReceived` / `confirmOrderInPackById` |
| 释放中转 | `releaseTransitOrdersAtHub` + `inventoryService.releaseHubTransitOrders` |
| 列表同步 | `syncPlatformInventoryCloud` → `pullPlatformInventoryFromCloud` |
| 到站写本地 | `importInboundPackToLocal` |

**装车云端双写**（`pushTruckLoadToCloud`）：
1. `ensureInventoryCloudAuth()` 刷新 JWT
2. `pushTruckLoadTracking` → `inventory_pkg_tracking` + `inventory_order_tracking`
3. 更新 `inventory_packed_shipments` + 写出库流水

### 10.5 云端同步架构

```
本地 SQLite
  ├── store_items / packed_shipments / stock_movements
  └── cloud_sync_queue（离线待上传）
         ↓ flush
inventoryCloudQueue.ts → inventoryCloudApi.ts → Supabase inventory_*
         ↓ 合并
inventoryCloudSync.ts（pull + merge + 区域过滤）
         ↓ 实时（可选）
inventoryCloudRealtime.ts
```

**单设备会话**：migration `20260621120000_inventory_single_device_session`；`InventorySessionMonitor` 检测被踢下线。

### 10.6 区域可见性（重要）

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

### 10.7 打包列表状态（`packDisplayStatus.ts`）

| display_status | 中文 | 条件概要 |
|----------------|------|----------|
| `pending_load` | 未装车 | 未出库 |
| `loaded` | 已装车 | 本地已出库，云端仍 `in_transit` |
| `arrived` | 已到站 | 云端 `hub_received` 且本地未同步出库等边缘情况 |
| `completed` | 已完成 | 云端 `hub_received`/`split_at_hub`/`completed` 且已装车 |

云端追踪状态：`inventory_pkg_tracking.status` → `in_transit` | `hub_received` | `completed` | `split_at_hub` | `cancelled`。

### 10.8 蓝牙标签打印（Xprinter P203A）

| 文件 | 职责 |
|------|------|
| `constants/xprinterP203a.ts` | 纸张尺寸、DPI |
| `tsplLabelBuilder.ts` | TSPL 指令（条码、文字布局） |
| `bluetoothThermalPrinter.ts` | 蓝牙直连发送 |
| `printerService.ts` | 统一打印入口（预览 / 蓝牙） |
| `LabelPrintPreviewCard.tsx` | 打印预览 UI |

Settings 可选「蓝牙直连」模式；入库成功后可弹 `OrderBarcodeModal` 打印标签。

### 10.9 运行、EAS 与 App Store

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

---

## 11. Admin 跨境物流控制台

页面：`CrossBorderLogisticsPage.tsx`（独立全屏深色 UI）。

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
- **跨境定价**：`CrossBorderPricingModal` → `system_settings` 键 `pricing.{region}.cross_border.*`。
- **其它开销**：`cross_border_manual_entries` 表 + `inventory-admin-cross-border-entry`。

---

## 12. 中转物流业务流（MUSE → MDY → YGN）

典型场景：木姐 **MUSE** 发站入库 → 打包 → 装车；经 **MDY** 中转 → 最终 **YGN** 目的。

1. **MUSE 装车出库**：可选多个 PKG（如 `PKG*MDY*` + `PKG*YGN*`），**本段目的地**选 MDY（与包装号最终目的地可不同）。
2. **MDY 到站收货**：扫 PKG → 确认到站 → 弹窗分拨订单：
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

**Realtime 订阅**：`packages`、`products`、`recharge_requests`、`delivery_alerts` 等。

### 14.2 Inventory 中转站（Inventory App + Admin 跨境）

| 表 | 用途 |
|----|------|
| `inventory_store_items` | 订单/商品主数据（条码、目的地、打包状态、qty） |
| `inventory_stock_movements` | 入库/出库流水 |
| `inventory_packed_shipments` | 快递包头 |
| `inventory_packed_shipment_items` | 包内订单行 |
| `inventory_pkg_tracking` | 装车后在途 PKG 追踪 |
| `inventory_order_tracking` | 包内订单追踪（到站/释放） |
| `inventory_hub_transport_fee_payments` | 到站车费支付状态 |
| `cross_border_manual_entries` | Admin 手工跨境收支 |

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
| `20260610120000_inventory_shipment_tracking.sql` | PKG/订单追踪表 |
| `20260615120000_inventory_platform_store_data.sql` | 库存主表 |
| `20260621130000_inventory_admin_overview_stats.sql` | Admin overview RPC |
| `20260707120000_proxy_purchase_workspace.sql` | 代购清单表 |

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
| Expo（含 Inventory） | `EXPO_PUBLIC_*` + `app.config.js` `extra` | Inventory 生产默认值在 `app.config.js` |
| Netlify Functions | Dashboard | `SUPABASE_SERVICE_ROLE_KEY`、`JWT_SECRET` 等 |

**注意**：CRA 的 `REACT_APP_*` 与 Expo 的 `EXPO_PUBLIC_*` **不互通**，各 app 独立配置。

---

## 17. 常见问题与排障

### 17.1 Inventory「云端权限校验失败」/「同步快递包追踪失败」

**现象**：装车本地成功但云端未同步；设置页显示待上传；目的站无法扫码。

**常见根因**（非数据库损坏）：
1. **RLS 策略拒绝** — JWT 店码与数据行 `origin_store_code` 格式不一致（如 `MUSE` vs `MUSE001`）；需执行 `20260708120000` migration。
2. **JWT 过期** — 显示「已连接云端」但写入失败；需退出重新登录。
3. **Migration 未在生产执行** — 本地代码新但 Supabase 仍是旧 RLS。

**处理步骤**：
1. Supabase SQL Editor 执行缺失 migrations（尤其 `20260623120000`、`20260708120000`）。
2. App：**设置 → 退出 → 重新登录**。
3. **设置 → 立即同步** 清待上传队列。
4. 装车页 **立即重试同步** 或打包页补传 PKG。

**代码路径**：`authService.ensureInventoryCloudAuth` → `pushTruckLoadToCloud` → `trackingService.pushTruckLoadTracking`；RLS 错误映射见 `cloudAuthErrors.ts`。

### 17.2 指标管理换电脑看不到数据

- **进口指标草稿**：存 Supabase `import_metric_drafts`，非 localStorage。
- **代购清单**：需 migration `20260707120000`；原电脑打开一次完成云端上传。
- **个人开销**：按 `admin_accounts.username` 隔离，需同一账号登录。

### 17.3 Admin Console CSS 警告

`-moz-osx-font-smoothing` 等 vendor 前缀警告可忽略，不影响功能。

### 17.4 商家无法登录 Inventory / 商家端

`transit_station` 类型门店只能登录 **Inventory App**，不能登录商家 Web/App（`merchantLoginGuard`）。

---

## 18. 给 AI / 维护者的改代码提示

1. **先确认业务线**：`inventory_*`/装车/到站 → Inventory App 或 Admin 跨境；跑腿单 → City + `packages`。
2. **改路由**：后台 Router **v6**（`/admin/*`）；会员/商家 Web Router **v7**。
3. **改 Inventory 区域可见性**：`expressDetailsVisibility.ts` → `listItems` / `listPackedShipments` / `inventoryCloudSync`。
4. **改 Inventory 状态**：`packDisplayStatus.ts` + `trackingService`。
5. **改 Inventory 云端同步/装车**：`inventoryCloudSync.ts` + `trackingService.ts` + 检查 RLS migration。
6. **改 Admin 跨境 UI/API**：`CrossBorderLogisticsPage.tsx` + `inventoryConsoleService.ts` + `netlify/functions/inventory-admin-*`。
7. **改中转站账号**：Admin 跨境账号管理（**不要**在合伙店铺页创建 `transit_station`）。
8. **改计费/商品审核/充值 QR**：只改 `/shared/src`，再 `npm run sync:shared`。
9. **改 Supabase schema**：新增 migration，同步 §14.4；Inventory 需考虑 RLS 与离线队列。
10. **Inventory EAS 发布**：改 `app.json` version/buildNumber + `eas build`；Support URL 保持可访问。
11. **改打印**：`tsplLabelBuilder.ts` + `bluetoothThermalPrinter.ts` + `printerService.ts`。
12. **勿提交** `.env`、keystore、`.temp/`、`upload-release.keystore`；仅用户要求时 commit。

---

## 19. 常用文件速查

| 我想… | 先看 |
|--------|------|
| Inventory 订单列表过滤 | `expressDetailsVisibility.ts` → `inventoryService.listItems` |
| Inventory PKG 列表 / 装车候选 | `packDisplayStatus.ts` → `listOutboundPackages` |
| 装车云端双写 | `inventoryCloudSync.pushTruckLoadToCloud` |
| 云端 RLS 错误识别 | `cloudAuthErrors.ts` → `trackingService.throwTrackingCloudWriteError` |
| 到站收货 UI | `HubReceiveScreen.tsx`、`HubReceiveOrdersModal.tsx` |
| 装车出库 UI | `StockOutScreen.tsx`、`applyTruckLoadOutbound` |
| 云端同步/合并 | `inventoryCloudSync.ts` |
| 离线重试队列 | `inventoryCloudQueue.ts` |
| 在途追踪读写 | `trackingService.ts` |
| 蓝牙标签打印 | `printerService.ts`、`tsplLabelBuilder.ts` |
| Admin 跨境控制台 | `CrossBorderLogisticsPage.tsx`、`inventoryConsoleService.ts` |
| 跨境账号 CRUD | `CrossBorderAccountManagementModal.tsx`、`inventory-admin-update-account.js` |
| 代购清单 | `ProxyPurchasePage.tsx`、`proxy_purchase_workspaces` |
| 进口指标草稿 | `ImportMetricDraftsPage.tsx`、`import_metric_drafts` |
| Admin 跨境性能 | `inventory-admin-data.js`、`inventory_admin_overview_stats` RPC |
| Inventory App Store | `app.config.js`、`eas.json`、`LoginScreen.tsx` |
| Support 页 | `ml-express-client-web/.../SupportPage.tsx` |
| 合伙店铺（不含中转站） | `DeliveryStoreManagement.tsx` |
| 商家下单弹窗 | `merchant-web/.../OrderModal.tsx` |
| 会员/商家计费 | `/shared/src/pricing.ts` |
| 管理后台权限菜单 | `App.tsx`、`AccountManagement.tsx`、`AdminShellLayout.tsx` |
| Supabase migrations | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |

---

## 20. 版本与分支

| 项目 | 版本 | 备注 |
|------|------|------|
| 管理后台（根） | **2.2.4** | `package.json` |
| ml-express-client | **2.5.0** | iOS build 64 |
| ml-express-merchant-app | **2.4.0** | |
| ml-express-mobile-app | **2.3.7** | STAFF 骑手端 |
| ml-express-inventory-app | **1.4.1 (10)** | 含 P203A 打印、装车 RLS 修复 |
| ml-express-client-web | **0.1.0** | |
| ml-express-merchant-web | **0.1.0** | |

各 Expo App 各自 `eas.json`；Inventory 使用 `appVersionSource: local`。

功能分支示例：`cursor/client-merchant-order-and-web`。

---

*最后更新：2026-07-08 — 补全 7 个子项目架构、版本号、P203A 打印、代购清单云端、装车 RLS migration、云端同步排障、Netlify Functions 索引、指标管理 4 Tab。*
