# ML Inventory App — 部署清单

面向 **生产 Supabase 项目**（与 Admin Web / 商户端共用：`uopkyuluxnrewvlmutam`）。  
每次发布 Inventory App 新功能前，按本清单逐项勾选。

---

## 一、部署前检查

- [ ] 本地 `ml-express-inventory-app/.env` 中 `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` 与生产一致
- [ ] Admin Web 已部署且可登录
- [ ] 合伙店铺在 Admin 中类型为 **中转站**（`transit_station`）
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

应返回一行。再确认 RLS 函数存在：

```sql
SELECT proname FROM pg_proc
WHERE proname IN ('inventory_jwt_hub_code', 'inventory_session_active');
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

```bash
cd ml-express-inventory-app
eas build --platform ios --profile production
# 或
eas build --platform android --profile production
```

提交 App Store：

```bash
eas submit --platform ios --profile production
```

当前 Bundle ID：`com.mlexpress.inventory`（见 `app.json`）。

---

## 五、发布后 smoke test（约 10 分钟）

用 **两个不同中转站** 或 **同一账号两台手机** 验证：

| # | 步骤 | 预期 |
|---|------|------|
| 1 | 中转站账号登录 | 成功进入首页 |
| 2 | 入库 → 打包 → 装车出库 | 成功提示含「已同步云端」 |
| 3 | 目的/中转站 **到站签收** 扫 PKG | 能打开包内订单 |
| 4 | 同一账号在 **手机 B** 再登录 | **手机 A** 提示已在其它设备登录并退出 |
| 5 | 设置 → 修改密码 | 成功，下次用新密码登录 |
| 6 | 设置 → 云同步 / 待上传 | 无长期积压（或显示明确错误） |
| 7 | 在途追踪 | 装车后的 PKG 出现在对应 Tab |

---

## 六、常见问题

### 到站扫 PKG 提示「云端未找到该快递包追踪记录」

1. 发站装车是否显示 **已同步云端**？若否 → 发站 **打包** 页 **补传云端**
2. 发站与本站 **Supabase 项目** 是否一致（`.env` URL 相同）
3. 装车所选 **本段目的地** 是否为当前扫描站（中转需先到 MDY 再到 YGN 等）
4. 表 `inventory_pkg_tracking` 是否存在该 `pack_barcode`（Dashboard Table Editor）

### `supabase db push` 失败

远程 migration 版本与本地目录不一致。对 **新功能** 用本文 **方式 B** 手动 SQL，勿在未备份情况下批量 `repair`。

### Expo 与上架 App 快递明细不一致

正常：每部手机有 **独立 SQLite**。同账号只保证 **云端** 一致；列表以本机缓存为主。换机或新装需登录后 **设置 → 立即同步**。

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
