# Inventory App 云端数据架构（Google Play / 多设备）

## 原则

1. **所有业务数据以 Supabase 为权威来源**（目标态），手机 SQLite 仅作缓存与离线队列。
2. **与客户端 / 商家端 / 骑手端完全隔离**：不使用 `packages`、`orders`（跑腿单）等表；统一使用 `inventory_*` 命名空间。
3. **登录仍用** `delivery_stores`（`store_type = transit_station`），与合伙店铺体系共用账号，不共用业务表。

## 表职责（Supabase）

| 表名 | 用途 | 对应本机 SQLite |
|------|------|-----------------|
| `inventory_store_items` | 订单/商品主数据 | `inventory_items` |
| `inventory_stock_movements` | 入库/出库流水 | `stock_movements` |
| `inventory_packed_shipments` | 快递包（装车前） | `packed_shipments` |
| `inventory_packed_shipment_items` | 包内订单行 | `packed_shipment_items` |
| `inventory_pkg_tracking` | 装车后在途 PKG | 已有 |
| `inventory_order_tracking` | 在途包内订单 | 已有 |

**不要混用的表**：`packages`、`orders`、`merchant_*`、骑手结算等 — 属于 City 配送业务。

## 多设备同步逻辑（实现阶段）

```
写入：用户操作 → 写云端 → 成功后再更新本机缓存
读取：登录/下拉刷新 → 按 store_code + hub 区域拉取 → 合并本机
冲突：以 updated_at 较新为准；barcode 全局唯一
离线：写入失败入 `cloud_sync_queue`，登录/下拉时按序重试
Realtime：订阅 `inventory_store_items` / `inventory_packed_shipments` 变更后防抖拉取（不推本机）
```

### 可见范围

- **本站入库**：`owner_store_code = 当前店`
- **目的站可见**：`final_destination = 本站 hub`（如 MDY）
- **在途/到站**：`inventory_pkg_tracking` + `inventory_order_tracking`

## 实施阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| P0 | Migration `inventory_store_*` 表 | ✅ migration 已添加 |
| P1 | 入库/打包写云端 + 登录全量拉取 | ✅ 已实现 |
| P2 | 出库/装车与 `inventory_pkg_tracking` 双写统一 | ✅ 已实现 |
| P3 | 离线队列、冲突合并、Realtime 可选 | ✅ 已实现 |
| P4 | RLS 按 `delivery_stores.id` 收紧（Supabase Auth + JWT app_metadata） | ✅ 已实现 |

## Google Play 说明

- 用户数据存于自有 Supabase 项目，需在 Play 控制台「数据安全」中声明：库存/物流数据、店铺标识、客户姓名电话（入库登记）。
- 卸载 App 不丢数据（云端保留）；换机登录同一 `store_code` 应看到相同列表（P1 完成后）。

## 部署

完整步骤见 **`docs/DEPLOYMENT.md`**（数据库 migration、Edge Functions、EAS 构建、发布后 smoke test）。

```bash
# 仓库根目录 — 数据库
supabase db push

# inventory-app 目录 — Edge Functions
npm run deploy:inventory-functions
```

关键 migration / Function：

| 资源 | 文件 / 命令 |
|------|-------------|
| 平台表 | `20260615120000_inventory_platform_store_data.sql` |
| P4 RLS | `20260617120000_inventory_rls_by_delivery_store.sql` |
| 单设备登录 | `20260621120000_inventory_single_device_session.sql` |
| 登录 | `inventory-store-login` |
| 改密 | `inventory-change-password` |

若 `db push` 因 migration 历史不一致失败，在 Dashboard SQL Editor 手动执行上述 SQL（见 DEPLOYMENT.md 方式 B）。

**当前仓库已知情况（2026-06-21）**：远程存在本地无文件的 migration 版本 `20260402`，会导致 `db push` 报错。可选修复（需 DBA 确认后执行）：

```bash
supabase migration repair --status reverted 20260402
supabase db push
```

单设备登录最小 SQL 见：`docs/sql/single_device_session.sql`

### P4 认证说明

1. App 登录调用 `inventory-store-login` 校验 `delivery_stores` 密码（Service Role，不暴露密码给 anon）。
2. 为店铺创建/更新 Supabase Auth 用户（`inventory+{store_code}@inventory.mlexpress.internal`）。
3. JWT `app_metadata` 写入 `inventory_store_id`、`inventory_store_code`、`inventory_hub_code`。
4. 登录时写入 `delivery_stores.current_session_id`，客户端监控单设备踢下线。
5. 所有 `inventory_*` 表 RLS 仅允许 `authenticated` 且 metadata 匹配的读写。
6. **P4 / 单设备上线后需重新登录**；未部署 Edge Function 或 migration 时云端同步将失败。
