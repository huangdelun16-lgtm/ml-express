# MARKET LINK EXPRESS - AI 开发指南

## 🚀 最新架构更新 (2026年3月30日)

### 📐 完整系统架构 (2026版)

MARKET LINK EXPRESS 已进化为**全链路、多端同步的快递与商业管理系统**。

```
┌─────────────────────────────────────────────────────────────────┐
│                  MARKET LINK EXPRESS 完整架构 (2026)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 客户端 Web (ml-express-client-web)                        │
│     ├── 部署: Netlify (client-ml-express)                      │
│     ├── 功能: 首页下单、同城商场、购物车、实时追踪、多语言支持    │
│     └── 特点: 深度品牌化 UI，Unicode 标准缅甸语适配              │
│                                                                 │
│  🏪 商家端 Web (ml-express-merchant-web) [最新独立项目]        │
│     ├── 部署: Netlify (mlexpress-merchant)                     │
│     ├── 核心: ProfilePage (经营指挥中心)                        │
│     ├── 功能:                                                  │
│     │   ├── 实时订单处理 (接单/打包/取消)                       │
│     │   ├── 自动化经营 (休假预设/状态覆盖)                      │
│     │   ├── 财务对账 (COD 代收款统计/对账单导出)                │
│     │   ├── 商品管理 (库存/上下架/图片上传)                     │
│     │   └── 语音提醒 & 自动票据打印                             │
│     └── 视觉: 高级玻璃拟态 UI，Montserrat/Roboto 品牌字体       │
│                                                                 │
│  🔐 后台管理 Web (原项目根目录)                                 │
│     ├── 部署: Netlify (market-link-express admin)              │
│     ├── 功能: 全系统监督、骑手调度、财务审核、充值审批          │
│     └── 特点: 服务器端 JWT 验证，Netlify Functions 安全保护      │
│                                                                 │
│  📱 骑手端 App (ml-express-mobile-app)                           │
│     ├── 技术: React Native + Expo                              │
│     ├── 功能: 任务领取、智能导航、离线照片同步、设备健康预警    │
│     └── 核心: 状态归一化逻辑，确保全端订单状态 100% 同步         │
│                                                                 │
│  📱 客户端 App (ml-express-client)                             │
│     ├── 功能: 一键下单、VIP 充值系统、平滑地图追踪              │
│     └── 身份: 会员 (Member) ↔ 尊享会员 (VIP) 自动升级系统       │
│                                                                 │
│  🗄️ 数据库 (Supabase PostgreSQL)                              │
│     ├── 核心表: packages, delivery_stores, users, products     │
│     └── 实时性: Supabase Realtime 驱动全端状态变更              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 📁 项目核心目录结构

```
ml-express/
├── ml-express-merchant-web/        # [NEW] 商家端独立 Web 项目
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ProfilePage.tsx     # 经营指挥中心 (仪表板+设置)
│   │   │   ├── TrackingPage.tsx    # 订单管理 (带分页与高级模态框)
│   │   │   ├── LoginPage.tsx       # 品牌化登录页
│   │   │   └── StoreProductsPage.tsx # 集成商品管理中心
│   │   ├── components/
│   │   │   ├── Logo.tsx            # 统一品牌 Logo 组件
│   │   │   └── layout/Sidebar.tsx  # 可折叠状态侧边栏
│   │   └── services/supabase.ts    # 商家专属服务层 (merchantService)
│
├── ml-express-client-web/          # 客户端 Web (market-link-express.com)
├── ml-express-mobile-app/          # 骑手端 App
├── ml-express-client/               # 客户端 App
├── src/                            # 管理端 Admin Web (admin-market-link-express.com)
└── netlify.toml                    # 根目录部署配置 (启用 NETLIFY_SKIP_PLUGINS)
```

---

### 🔧 核心功能架构记录

#### 1. 商家端自动化经营逻辑 (`ProfilePage.tsx`)
*   **状态覆盖系统 (Status Override)**: 商家可一键“延长打烊 1 小时”或“即刻打烊”。系统通过 `delivery_stores` 表的 `manual_override_status` 字段实现临时状态对常规营业时间的覆盖。
*   **高级时间滚轮 (`TimeWheelPicker`)**: 针对桌面端优化的 24 小时制滚动选择器，用于精确设置营业时间。
*   **财务指挥部**: 实时统计“本月已结清”与“待结清金额 (COD)”，支持一键导出 CSV 对账单。

#### 2. 订单处理工作流 (全端同步)
*   **状态归一化**: 解决不同端对“待取件/待收款”描述不一的问题。统一逻辑：`现金支付` ➔ `待收款` ➔ 归类为 `待取件`；`余额支付` ➔ `待取件`。
*   **接单联动**: 商家点击“立即接单” ➔ 状态变更 `打包中` ➔ 自动触发 `handlePrintReceipt` (HTML 格式票据) ➔ 弹出“商品核对清单”。
*   **详情模态框同步**: `ProfilePage` 与 `TrackingPage` 共享一致的 `OrderQRCode` 和商品解析逻辑，确保商家在任何页面看到的订单详情信息高度一致。

#### 3. 视觉与品牌规范
*   **品牌字体**: 全局引入 `Montserrat` (标题) 与 `Roboto` (正文)。
*   **Logo 组件**: 统一使用 `Logo.tsx`，支持 `small`, `medium`, `large` 尺寸，内置渐变色与副标题设计。
*   **侧边栏规范**: 商家端 Web 侧边栏采用 `rgba(15, 23, 42, 0.95)` 深色背景 + 20px 模糊效果，仅保留功能图标，移除冗余 Logo。

#### 4. 部署与环境加固
*   **Netlify 构建优化**: 在所有项目的 `netlify.toml` 中添加 `NETLIFY_SKIP_PLUGINS = "true"`，绕过 Netlify UI 插件（如 Neon）导致的构建失败。
*   **Z-Index 规范**: 全局弹窗 Z-Index 统一设为 `30,000+`，侧边栏为 `1,000`，解决层级穿透问题。

---

### 📋 开发注意事项 (必读)

1.  **Large File 处理**: `ProfilePage.tsx` 和 `TrackingPage.tsx` 逻辑复杂，代码行数已突破 10,000。编辑时必须使用 `StrReplace` 或 `Prettier` 检查语法，防止出现 `Unclosed Tag` 导致的 Netlify 部署崩溃。
2.  **多语言同步**: 翻译文本统一维护在 `LanguageContext.tsx`。商家端新增了大量关于“打包”、“票据”、“财务”的专业词汇。
3.  **支付逻辑**: 目前二维码支付 (QR) 选项处于“开发中/暂停”状态，默认引导用户使用 `balance` (余额) 或 `cash` (现金)。

---
*最后更新：2026年3月30日*
*记录人：Cursor AI*
