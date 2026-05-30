# /shared — 多端共享单一源

本目录是各 app 之间**共享纯逻辑**的唯一真源，用于减少 6 份 `supabase.ts` 的重复维护。

## 内容（Phase 1）

| 文件 | 作用 | 消费方 |
|------|------|--------|
| `src/productReview.ts` | 商品类型 + 上架审核辅助函数 | merchant-web、merchant-app |
| `src/pricing.ts` | 计费规则合并算法 + 领区解析 | admin(根)、client、client-web、merchant-web、merchant-app、mobile-app |
| `src/rechargeQr.ts` | 充值 QR key/档位/合并逻辑 | client、client-web |

只放**与运行环境无关的纯逻辑**。`createClient(...)`、`REACT_APP_*` / `EXPO_PUBLIC_*` 读取、retry/错误处理、各端默认值对象等**保留在各 app 本地**，通过参数注入。

## 工作机制

由于这是 monorepo 但**没有 npm workspaces**，且 3 个 CRA app 禁止 import `src/` 外部文件、3 个 Expo app 各自独立部署，采用「**单一源 + 同步脚本**」：

1. 在 `/shared/src` 维护源文件；
2. 各 app 的 `prestart` / `prebuild` 会运行 `npm run sync:shared`，把 `/shared/src/*` 复制到该 app 的 `_shared` 目录；
3. 复制产物**已提交到 git**，Netlify / EAS 构建即使不跑脚本也能拿到。

各 app 的 `_shared` 目标目录：

| App | 目标目录 |
|-----|----------|
| 根 admin | `src/services/_shared/` |
| ml-express-client-web | `src/services/_shared/` |
| ml-express-merchant-web | `src/services/_shared/` |
| ml-express-client | `src/services/_shared/` |
| ml-express-merchant-app | `src/services/_shared/` |
| ml-express-mobile-app | `services/_shared/` |

## 规则

- ❌ 不要修改任何 app 里 `_shared/` 下的文件（有 AUTO-GENERATED 头注释，会被覆盖）。
- ✅ 改动只在 `/shared/src` 进行，然后在任一 app 运行 `npm run sync:shared`（或直接 `npm start` / `npm run build` 触发）。
- 手动全量同步：在各 app 目录运行 `npm run sync:shared`。
