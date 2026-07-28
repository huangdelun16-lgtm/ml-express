# ML Inventory App — 部署清单

面向 **生产 Supabase 项目**（与 Admin Web / 商户端共用：`uopkyuluxnrewvlmutam`）。  
每次发布 Inventory App 新功能前，按本清单逐项勾选。

当前客户端版本：**v1.8.3 (17)**。Inventory App 为在线专用，Supabase 是唯一业务数据源。

---

## 一、部署前检查

- [ ] 本地 `ml-express-inventory-app/.env` 中 `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` 与生产一致
- [ ] Admin Web 已部署且可登录
- [ ] 合伙店铺在 Admin 中类型为 **中转站**（`transit_station`）
- [ ] 测试设备可稳定访问生产 Supabase；不以离线缓存或待同步队列作为验收路径
- [ ] 已安装 Supabase CLI 并已登录：`supabase login`
- [ ] 项目已 link（仓库内 `supabase/.temp/project-ref` 应为 `uopkyuluxnrewvlmutam`）

---

## 二、数据库 Migration（必做）

### 方式 A：`supabase db push`（推荐）

在 **仓库根目录** `ml-express/` 执行：

```bash
cd /path/to/ml-express
supabase link --project-ref uopkyuluxnrewvlmutam   # 若尚未 link
supabase db push
```

若报错 `Remote migration versions not found in local migrations directory`：

1. 先与团队确认远程 migration 历史，**不要**随意 `repair`
2. 对 **本次 Inventory 必需** 的 SQL，改用 **方式 B** 在 Dashboard 手动执行
3. 或按 CLI 提示执行 `supabase migration repair`（需 DBA 判断）

### 方式 B：Supabase Dashboard → SQL Editor（兜底）

至少执行以下与 Inventory 相关的 migration 文件（按时间顺序，已执行过的可跳过）：

| 文件 | 用途 |
|------|------|
| `20260610120000_inventory_shipment_tracking.sql` | 在途 PKG / 订单追踪表 |
| `20260615120000_inventory_platform_store_data.sql` | `inventory_store_*` 平台表 |
| `20260617120000_inventory_rls_by_delivery_store.sql` | P4 RLS + JWT 辅助函数 |
| `20260618120000_inventory_store_items_pack_state.sql` | 打包状态字段 |
| `20260619120000_inventory_store_items_insert_hub.sql` | 入库 hub 策略 |
| `20260622120000_inventory_store_items_hub_custody_rls.sql` | **到站 custody**（hub_arrived_at 读写） |
| `20260623120000_inventory_owner_code_normalize_rls.sql` | **归属码归一化 RLS**（MUSE↔MUSE001，修复 upsert USING） |
| `20260620120000_cross_border_manual_entries.sql` | 跨境手工账目 |
| `20260621120000_inventory_single_device_session.sql` | **单设备登录** `current_session_id` |
| `20260716180000_inventory_auth_security_hardening.sql` | **必须先执行**：密码哈希、登录冷却、JWT session 绑定、站点财务 RLS |
| `20260716185000_inventory_atomic_operations.sql` | **随后执行**：入库/打包/装车/到站幂等事务 RPC |
| `20260716190000_inventory_authenticate_store_ambiguity_fix.sql` | 修复登录 RPC 的 `store_code` 列名歧义 |
| `20260717103000_inventory_truck_trip_number.sql` | 装车车次 `trip_number` + `inventory_load_shipments` 扩展 |
| `20260717113000_inventory_trip_sequences_rls_fix.sql` | **装车必跑**：车次序号表 SECURITY DEFINER，修复 RLS 装车失败 |

**单设备登录（最小 SQL）：**

```sql
ALTER TABLE delivery_stores
  ADD COLUMN IF NOT EXISTS current_session_id TEXT;

COMMENT ON COLUMN delivery_stores.current_session_id IS
  '最近一次登录会话 ID；Inventory / 商家 App 用于单设备登录校验';
```

### 验证 migration

在 SQL Editor 执行：

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'delivery_stores'
  AND column_name = 'current_session_id';
```

应返回一行。再确认 RLS 与事务函数存在：

```sql
SELECT proname FROM pg_proc
WHERE proname IN (
  'inventory_jwt_hub_code',
  'inventory_session_active',
  'inventory_apply_stock_movement',
  'inventory_create_packed_shipment',
  'inventory_load_shipments',
  'inventory_confirm_pkg_hub_received'
);
```

---

## 三、Edge Functions（必做）

在 **仓库根目录** 执行：

```bash
cd ml-express-inventory-app
npm run deploy:inventory-functions
```

或手动：

```bash
cd /path/to/ml-express
supabase functions deploy inventory-store-login --project-ref uopkyuluxnrewvlmutam
supabase functions deploy inventory-change-password --project-ref uopkyuluxnrewvlmutam
```

| Function | 用途 |
|----------|------|
| `inventory-store-login` | 店铺密码校验、创建 Auth 用户、写入 JWT metadata、**单设备 sessionId** |
| `inventory-change-password` | App 内修改店铺密码 |

可选（仅测试环境「清空全部订单」）：

```bash
supabase functions deploy inventory-clear-test-data --project-ref uopkyuluxnrewvlmutam
```

### 验证 Edge Function

Dashboard → Edge Functions → 确认 `inventory-store-login` / `inventory-change-password` 更新时间戳为本次部署时间。

用测试中转站账号在 App 登录；Settings 改密码应成功。**P4 / 单设备上线后，所有站点需重新登录一次。**

---

## 四、Expo / App Store 构建

### 环境变量

| 渠道 | 配置位置 |
|------|----------|
| 本地 `expo start` | `ml-express-inventory-app/.env` |
| EAS production | `eas.json` → `build.production.env` |
| EAS preview/dev | 建议在 [expo.dev](https://expo.dev) → Project → Environment variables 添加同名变量 |
| 兜底 | `app.config.js` 内默认 Supabase URL（与生产相同） |

必需变量：

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 构建命令

**App Store / TestFlight（production IPA）：**

```bash
cd ml-express-inventory-app
npm install
eas login          # 首次或 token 过期时
npm run build:ios  # 等价于 eas build --platform ios --profile production
npm run download:ios
```

**内测直装（preview IPA，需 EAS 设备 UDID 注册）：**

```bash
cd ml-express-inventory-app
npm run build:ios:preview
npm run download:ios
```

**本机 Mac 本地打 IPA（需 Xcode + Fastlane）：**

```bash
cd ml-express-inventory-app
npm run build:ios:local
```

提交 App Store：

```bash
eas submit --platform ios --profile production
```

当前 Bundle ID：`com.mlexpress.inventory`（见 `app.json`）。

### Android APK 应用内更新（设置 → 更新最新版本）

1. 将 APK 上传到可公网访问的地址（Supabase Storage 公开桶、CDN 等）
2. 在 Supabase SQL Editor 执行 `docs/sql/inventory_android_latest_release.sql`，填入真实 `apkUrl`，并确保 `versionCode` **大于** 用户已安装版本
3. 用户点击设置中的 **「更新最新版本」** → 若有新版本则打开下载链接；下载完成后在系统「下载」中安装 APK

每次发布新 APK 后只需更新 `system_settings` 中 `inventory.android.latest_release` 一条记录，**无需**重新发版 App 即可让旧版用户看到更新提示（旧版 App 需已包含此功能，自 v1.6.0 起；当前 **v1.8.3 (17)**）。

---

## 五、发布后 smoke test（约 10 分钟）

用 **两个不同中转站** 或 **同一账号两台手机** 验证：

| # | 步骤 | 预期 |
|---|------|------|
| 1 | 中转站账号登录 | 成功进入首页 |
| 2 | 入库 → 打包 → 装车出库 | 每一步均在线写入 Supabase 并成功 |
| 3 | 目的/中转站 **到站签收** 扫 PKG | 能打开包内订单 |
| 4 | 同一账号在 **手机 B** 再登录 | **手机 A** 提示已在其它设备登录并退出 |
| 5 | 设置 → 修改密码 | 成功，下次用新密码登录 |
| 6 | 断网后读取或提交 | 明确提示联网失败，不显示“已保存本机/稍后同步” |
| 7 | 在途追踪 | 装车后的 PKG 出现在对应 Tab |
| 8 | MDY 释放中转 → 再打包 → 再装车 | 订单不重复，装车后不再显示“待转出” |
| 9 | 跨境财务新增/删除手工收支 | 仅当前站点可见，汇总即时更新 |

---

## 六、常见问题

### 到站扫 PKG 提示「云端未找到该快递包追踪记录」

1. 发站装车是否成功完成在线写入？若失败，请恢复网络后重新确认当前云端状态再操作
2. 发站与本站 **Supabase 项目** 是否一致（`.env` URL 相同）
3. 装车所选 **本段目的地** 是否为当前扫描站（中转需先到 MDY 再到 YGN 等）
4. 表 `inventory_pkg_tracking` 是否存在该 `pack_barcode`（Dashboard Table Editor）

### `supabase db push` 失败

远程 migration 版本与本地目录不一致。对 **新功能** 用本文 **方式 B** 手动 SQL，勿在未备份情况下批量 `repair`。

### Expo 与上架 App 快递明细不一致

先确认两端均为 **v1.8.3 (17)**、连接同一 Supabase 项目且使用同一站点账号，然后在列表下拉刷新。列表应以 Supabase 查询结果为准；若仍不一致，检查 RLS、hub/store claims 与查询范围。

---

## 七、一键命令摘要

```bash
# 1. 数据库（成功则跳过方式 B）
cd ml-express && supabase db push

# 2. Edge Functions
cd ml-express-inventory-app && npm run deploy:inventory-functions

# 3. 类型检查
npm run typecheck

# 4. iOS 生产包
eas build --platform ios --profile production
```

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-21 | 初版：P4 RLS、单设备登录、改密 Function、EAS 环境说明 |
