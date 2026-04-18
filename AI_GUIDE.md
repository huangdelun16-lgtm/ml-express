# MARKET LINK EXPRESS - AI 开发指南

本文档供 AI 与开发者快速理解**单仓多应用**的布局、技术栈、构建命令与 Netlify 部署约定。

**最后更新：2026 年 4 月 2 日**

---

## 1. 仓库总览（单仓多包）

| 路径 | 应用 | 技术栈 | 典型用途 |
|------|------|--------|----------|
| **仓库根目录** (`src/`) | 后台管理 Web（Admin） | Create React App 5 + React 18 + TypeScript + React Router 6 | 运营、财务、骑手调度、合伙店铺与待审商品等 |
| `ml-express-client-web/` | 客户端 Web（C 端） | CRA 5 + React 18 + TypeScript + React Router 7 | 会员下单、商场逛店、追踪、法律页等 |
| `ml-express-merchant-web/` | 商家端 Web（B 端） | 同上 | 商家登录后的经营台、订单、商品 |
| `ml-express-client/` | 客户端 App | Expo ~54 + React Native | 会员移动端 |
| `ml-express-merchant-app/` | 商家端 App | Expo ~54 + React Native | 商家移动端 |
| `ml-express-mobile-app/` | 骑手端 App（package名 `market-link-express-mobile`） | Expo 54 + React Native | 骑手作业端 |

**共享后端**：各端通过 **Supabase**（`@supabase/supabase-js`）访问数据库与存储；部分敏感能力经 **Netlify Functions**（Node）暴露，前端用 `REACT_APP_*` 或运行时配置调用。

---

## 2. 五端联动架构（概念图）

```
+-----------------------------------------------------------------+
|              MARKET LINK EXPRESS 五端与后端关系（概念）            |
+-----------------------------------------------------------------+
|  客户端 Web (ml-express-client-web)     -> Netlify（C 端站点）   |
|  商家端 Web (ml-express-merchant-web)   -> Netlify（商家站点）   |
|  后台管理 Web（仓库根目录 src/）         -> Netlify（Admin 站点） |
|  客户端 / 商家 / 骑手 App               -> Expo / 应用商店构建   |
|  数据与文件：Supabase；短信/邮件等敏感能力：各站点 Netlify Fn   |
+-----------------------------------------------------------------+
```

---

## 3. 构建命令与本地开发（npm scripts）

以下命令均在**对应目录**执行（根目录与各子项目各自有独立的 `package.json`）。

### 3.1 后台 Admin（仓库根目录）

| 脚本 | 说明 |
|------|------|
| `npm start` | `react-scripts start`，开发服务器 |
| `npm run build` | `CI=false react-scripts build`，产物目录 **`build/`** |
| `npm test` | Jest（`react-scripts test`） |
| `npm run deploy:netlify` | `netlify deploy --prod --build`（需在根目录已 `netlify link` 到 Admin 站点） |
| `npm run build:netlify` | `netlify build` |

依赖特点：`recharts`、`react-window`、`bcryptjs`、`sharp` 等偏后台与报表。

### 3.2 客户端 Web（`ml-express-client-web`）

| 脚本 | 说明 |
|------|------|
| `npm start` / `npm run build` / `npm test` | 同 CRA 惯例，`build/` 为发布目录 |
| `npm run deploy:netlify` | `netlify deploy --prod --build --site <client-site-id>`（具体 ID 见该目录 `package.json`） |

额外依赖示例：`@sentry/react`、Google Maps、`jspdf`、`xlsx`、`qrcode`、`twilio`、`nodemailer`（与 Functions 配合时由服务端持有密钥）。

### 3.3 商家端 Web（`ml-express-merchant-web`）

与客户端 Web 相同模式：`start` / `build` / `test` / `deploy:netlify`（站点 ID 见该目录 `package.json`）。

### 3.4 Expo 应用（`ml-express-client`、`ml-express-merchant-app`）

| 脚本 | 说明 |
|------|------|
| `npm start` | `expo start` |
| `npm run start:offline` | `EXPO_OFFLINE=1 expo start --offline` |
| `npm run android` / `npm run ios` | `expo run:android` / `expo run:ios` |
| `npm run web` | `expo start --web` |
| `npm run build:web` | `npx expo export --platform web` |

版本参考（以仓库内 `package.json` 为准）：客户端 App `2.3.6`，商家 App `2.1.1`，Expo SDK `~54`，React `19.1.x`，RN `0.81.x`。

### 3.5 骑手端（`ml-express-mobile-app`）

| 脚本 | 说明 |
|------|------|
| `npm start` | `expo start` |
| `npm run android` / `npm run ios` | `expo run:android` / `expo run:ios` |
| `npm run android:setup` | `./run-android.sh`（本地 Android 环境辅助） |

---

## 4. Netlify：构建、发布目录与 Base directory

三个 Web 站点**各自独立**：根目录与各子项目下均有 `netlify.toml`，**不要混用 Base directory**。

### 4.1 通用约定（三个 Web 共性）

- **构建命令**（`netlify.toml`）：`npm install --legacy-peer-deps && CI=false npm run build`
- **发布目录**：`build`
- **Functions 目录**：各站点使用**自己目录下**的 `netlify/functions`（见下节）
- **环境变量**（示例）：`NODE_VERSION=18`、`NETLIFY_SKIP_PLUGINS=true`；前端常用 `REACT_APP_SUPABASE_URL`、`REACT_APP_SUPABASE_ANON_KEY`、`REACT_APP_GOOGLE_MAPS_API_KEY`；Functions 另需 Twilio、邮件、管理密钥等（按函数实现配置）
- **SPA**：`/*` → `/index.html`（200），保证 React Router 刷新可用

### 4.2 三站点对照

| 站点 | Base directory | Publish | Functions |
|------|----------------|---------|-----------|
| **Admin后台** | **仓库根**（留空，勿选子文件夹） | `build` | `netlify/functions` |
| **客户端 Web** | `ml-express-client-web` | `build` | `ml-express-client-web/netlify/functions` |
| **商家端 Web** | `ml-express-merchant-web` | `build` | `ml-express-merchant-web/netlify/functions` |

**CLI 部署注意**：若在子目录执行 `netlify` 总连错站点，可在根目录 `netlify unlink` 后重新 `netlify link` 选择正确站点；或使用各包 `package.json` 里带 `--site <id>` 的 `deploy:netlify`。

**下载重定向**：客户端/商家 `netlify.toml` 中 `/download` 可重定向到 GitHub Release 的 APK；商家端注释说明勿用 `releases/latest` 除非保证附件存在，否则 404。

---

## 5. Netlify Functions 文件分布

### 5.1 Admin（根目录 `netlify/functions`）

`send-sms.js`、`verify-sms.js`、`send-email-code.js`、`verify-email-code.js`、`send-order-confirmation.js`、`upload-banner.js`、`admin-password.js`、`verify-admin.js`、`ensure-courier-auth.js`、以及 `utils/cors.js`。

### 5.2 客户端 Web / 商家端 Web（各自 `netlify/functions`）

两站点均包含：`send-sms.js`、`verify-sms.js`、`send-email-code.js`、`verify-email-code.js`、`send-statement.js`、`utils/cors.js`。

**说明**：Admin 与 C/B 端的短信校验、万能测试码策略等以根目录与各 `netlify.toml` 注释及 `verify-sms` 实现为准（生产环境默认限制测试码等）。

---

## 6. 路由与前端结构索引

### 6.1 Admin（`src/App.tsx`）

- 公开：`/` → 重定向 `/admin/login`，`/admin/login`
- 受 `ProtectedRoute` 保护（角色如 `admin` / `manager` / `operator` / `finance`，部分带 `permissionId`）：
  - `/admin/dashboard`
  - `/admin/city-packages`（`city_packages`）
  - `/admin/users`（`users`）
  - `/admin/finance`（`finance`）
  - `/admin/tracking`、`/admin/realtime-tracking`（`tracking`）
  - `/admin/settings`、`/admin/system-settings`（`settings`）
  - `/admin/accounts`（`settings`）
  - `/admin/banners`（`banners`）
  - `/admin/delivery-stores`（`merchant_stores`，含合伙店铺与待审商品相关能力）
  - `/admin/supervision`
  - `/admin/delivery-alerts`（`delivery_alerts`）
  - `/admin/recharges`（`recharges`）

主要页面文件位于 `src/pages/`（如 `AdminDashboard.tsx`、`DeliveryStoreManagement.tsx`、`FinanceManagement.tsx` 等）。

### 6.2 客户端 Web（`ml-express-client-web/src/App.tsx`）

- 首页同步加载；其余多路由 **`React.lazy` + `Suspense`**
- 路由示例：`/`（`HomePage`）、`/login` → `Navigate` 回 `/`、`/services`、`/tracking`、`/contact`、`/privacy-policy`、`/terms-of-service`、`/profile`、`/delete-account`、`/mall`、`/mall/:storeId`、`/cart`
- **`ClientWebMerchantSessionGuard`**：若本地会话为商家 `user_type === 'merchant'`，清除并刷新，**避免 C 端与商家端会话混用**

### 6.3 商家端 Web（`ml-express-merchant-web/src/App.tsx`）

- `/login`（`LoginPage`）
- `/`（`ProfilePage`）、`/products`（`StoreProductsPage`）、`/orders`（`TrackingPage`），均由 `ProtectedRoute` + `MerchantLayout` 包裹；认证信息来自 `localStorage`（`ml-express-customer` + `userType === 'merchant'`）

---

## 7. 核心页面与业务逻辑（摘要）

### 7.1 商家端 Web 重点文件

- `ProfilePage.tsx`：经营统计、营业时间/休假、对账导出等
- `TrackingPage.tsx`：订单列表与详情
- `StoreProductsPage.tsx`：商品与库存
- `components/Logo.tsx`：品牌展示规范

### 7.2 客户端 Web

- `PrivacyPolicyPage.tsx`、`TermsOfServicePage.tsx`：合规页面
- 多语言：`contexts/LanguageContext.tsx`（中/英/缅等）

### 7.3 跨端业务概念（与数据库字段相关）

- **商家营业时间覆盖**：`manual_override_status` 等与 `operating_hours` 的配合
- **休假**：`vacation_dates` 等，下单侧按日期禁用
- **状态归一化**：现金/余额等展示与骑手、商家、客户一致
- **财务**：订单完成产生对账记录；写入前过滤空字段以提高 Supabase 稳定性

---

## 8. 开发与部署注意事项

1. **大文件 JSX**：修改 `ProfilePage.tsx` 等巨型组件后，建议格式化并检查标签闭合，避免构建失败。
2. **ESLint**：CRA 在开发时可能将部分规则打成 **warning**；若需临时跳过插件可用 `DISABLE_ESLINT_PLUGIN=true`（仅作权宜，长期应修警告）。
3. **Netlify 插件**：`NETLIFY_SKIP_PLUGINS=true` 用于规避部分托管环境插件问题（以各 `netlify.toml` 为准）。
4. **移动端**：发版前核对 `app.json` / `app.config` 与原生目录版本号；骑手端另有 `run-android.sh` 辅助流程。
5. **上架与合规**：隐私政策与客户站点路径一致（如 `https://market-link-express.com/privacy-policy`）；向商店提供可登录的测试账号说明。
6. **可观测性（客户端 Web）**：可选 `REACT_APP_SENTRY_DSN`；`LoggerService` 在生产且存在 DSN 时可上报 WARN/ERROR 摘要。
7. **Git安全**：远程 URL **不要**嵌入个人访问令牌；使用 SSH、`gh` 或系统凭据管理。
8. **GitHub Release 与 `/download`**：确保重定向指向的 Release **确实包含**对应 APK 文件名。

---

*文档维护：随仓库结构变更请同步更新「构建命令」「Netlify 对照」「Functions 列表」三节。*
