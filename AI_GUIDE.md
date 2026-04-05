# MARKET LINK EXPRESS - AI 开发指南

## 🚀 完整系统架构记录 (最后更新：2026年3月31日)

### 📐 核心系统架构图 (5端联动)

MARKET LINK EXPRESS 是一个基于 **React/React Native + Supabase + Netlify** 构建的高级快递与商业生态系统。

```
┌─────────────────────────────────────────────────────────────────┐
│                  MARKET LINK EXPRESS 完整架构 (2026)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 客户端 Web (ml-express-client-web)                        │
│     ├── 部署: Netlify (client-ml-express)                      │
│     ├── 域名: market-link-express.com                          │
│     └── 功能: 首页下单、同城商场、购物车、实时追踪、Unicode 缅甸语适配 │
│                                                                 │
│  🏪 商家端 Web (ml-express-merchant-web) [2026 核心升级]       │
│     ├── 部署: Netlify (mlexpress-merchant)                     │
│     ├── 视觉: 高级玻璃拟态 UI，Montserrat/Roboto 品牌字体       │
│     └── 核心: 经营指挥中心 (ProfilePage)、实时订单处理、对账单导出  │
│                                                                 │
│  🔐 后台管理 Web (根目录项目)                                   │
│     ├── 部署: Netlify (market-link-express admin)              │
│     ├── 域名: admin-market-link-express.com                    │
│     └── 功能: 骑手调度、全系统财务审计、VIP 充值审核、系统设置      │
│                                                                 │
│  📱 骑手端 App (ml-express-mobile-app)                           │
│     ├── 技术: Expo + React Native                              │
│     └── 功能: 智能导航、状态归一化同步、离线照片上传、设备健康预警  │
│                                                                 │
│  📱 商家端 App (ml-express-merchant-app) [v2.0.0]              │
│     ├── 核心: 与 Web 端 100% 功能对齐                           │
│     └── 功能: 营收对比图表、高级日期拨轮、手动补打小票、一键下单    │
│                                                                 │
│  📱 客户端 App (ml-express-client)                             │
│     └── 功能: 会员下单、VIP 充值等级系统、实时地图追踪             │
│                                                                 │
│  🗄️ 共享后端 (Supabase)                                        │
│     └── 实时数据库、存储 (S3)、边缘函数 (Netlify Functions JWT)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 📂 目录结构与核心页面

#### 1. 商家端 Web (`ml-express-merchant-web`)
*   `src/pages/ProfilePage.tsx`: **经营指挥中心**。包含实时统计、营业时间覆盖（延长1h/即刻打烊）、休假预设、对账导出。
*   `src/pages/TrackingPage.tsx`: **订单列表**。支持多状态筛选、分页显示、统一格式的详情模态框。
*   `src/pages/StoreProductsPage.tsx`: **集成商品管理**。支持库存管理、批量操作、图片上传。
*   `src/components/Logo.tsx`: **品牌规范**。确保 Logo 位于最上层，渐变色设计。

#### 2. 商家端 App (`ml-express-merchant-app`)
*   **版本**: `2.0.0 (Build 1)`
*   **标识符**: `com.mlexpress.merchants`
*   **核心特性**:
    *   **首页**: 新增“立即下单”快捷入口、营收对比柱状图（今日 vs 昨日）。
    *   **休假设置**: 引入 `DateWheelPicker` 高级日期拨轮，支持按日期范围一键闭店。
    *   **订单详情**: 增加“重新打印小票”和“标记已结清”商家专属功能。

#### 3. 客户端 Web (`ml-express-client-web`)
*   `src/pages/PrivacyPolicyPage.tsx`: **法律合规**。官方隐私政策页面。
*   `src/pages/TermsOfServicePage.tsx`: **法律合规**。全新的服务条款页面。
*   **多语言**: 翻译字典集中在 `LanguageContext.tsx`，支持中/英/缅三语。

---

### 🔧 关键业务逻辑记录

#### 1. 自动化经营 (Merchant Autopilot)
*   **逻辑**: 商家通过 `manual_override_status` 字段覆盖常规 `operating_hours`。
*   **休假**: `vacation_dates` 字段存储日期数组，下单系统检测到匹配日期时自动禁用“立即下单”。

#### 2. 状态归一化 (Status Normalization)
*   **核心**: 统一处理 `现金支付` ➔ `待收款` ➔ 归类为 `待取件`；`余额支付` ➔ `待取件`。确保骑手、商家和客户三方看到的状态逻辑一致。

#### 3. 财务对账系统 (Finance & COD)
*   **记录生成**: 每次订单完成自动产生 `FinanceRecord`。
*   **数据安全**: 优化了保存逻辑，自动过滤空字段，提高 Supabase 请求稳定性。

---

### 🛠️ 开发与部署注意事项

1.  **代码完整性**: 由于 `ProfilePage.tsx` 等文件行数极多，修改后必须使用 `npx prettier --write` 确保 JSX 标签完全闭合，防止部署崩溃。
2.  **Netlify 插件**: 在 `netlify.toml` 中必须设置 `NETLIFY_SKIP_PLUGINS = "true"` 避开 Neon 等插件的安装错误。
3.  **App 构建**: 移动端构建版本必须在 Git 提交后执行，原生配置（`ios/`, `android/`）需与 `app.json` 保持同步。
4.  **上架要求**:
    *   **Privacy Policy**: `https://market-link-express.com/privacy-policy`
    *   **Terms**: `https://market-link-express.com/terms-of-service`
    *   **测试账号**: 必须在 Google/Apple 审核说明中提供有效的商家测试账号。

5.  **Netlify Functions 目录（勿混淆）**:
    *   **客户端 Web** 站点：使用 [`ml-express-client-web/netlify/functions`](ml-express-client-web/netlify/functions/)（构建时随该子项目发布）。
    *   **商家端 Web** 站点：使用 [`ml-express-merchant-web/netlify/functions`](ml-express-merchant-web/netlify/functions/)。
    *   **后台管理**（根目录 CRA）：使用仓库根目录 [`netlify/functions`](netlify/functions/)，其中 `send-sms` / `verify-sms` 已与客户端 Web 逻辑对齐；短信验证码存 `verification_codes`（手机号键为 `PHONE_` + 数字）。
    *   **verify-sms**：万能测试码 `123456` 在 **Netlify `CONTEXT=production`** 下默认**禁用**；预览/分支部署仍可用。若必须在生产临时启用，仅可设环境变量 `ALLOW_DEV_SMS_CODE=true`（慎用）。

6.  **可观测性（可选）**:
    *   客户端 Web 支持 `REACT_APP_SENTRY_DSN`：配置后在运行时动态加载 Sentry；未配置不增加首包体积。
    *   `LoggerService` 在生产环境且存在 DSN 时，会将 WARN/ERROR 摘要上报至 Sentry。

7.  **GitHub Release 与下载链接**:
    *   使用 `releases/latest/download/<文件名>.apk` 时，**最新 Release 必须附带该文件名**，否则 GitHub 404。
    *   各端 APK 命名与 [`ml-express-merchant-web/netlify.toml`](ml-express-merchant-web/netlify.toml) 等 `/download` 重定向保持一致；发版后核对 Netlify 与 GitHub。

---
*记录人：Cursor AI*
*存档日期：2026年3月31日*
