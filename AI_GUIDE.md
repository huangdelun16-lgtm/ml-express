# MARKET LINK EXPRESS - AI 开发指南

## 🚀 最新架构更新 (2025年1月17日)

### 📐 完整系统架构

MARKET LINK EXPRESS 现在是一个**完全分离的、企业级的快递管理系统**，包含以下组件：

```
┌─────────────────────────────────────────────────────────────────┐
│                  MARKET LINK EXPRESS 完整架构                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 客户端 Web (ml-express-client-web)                        │
│     ├── 域名: market-link-express.com                          │
│     ├── 部署: Netlify (client-ml-express 项目)                │
│     ├── 技术栈: React + TypeScript + Supabase                 │
│     ├── 功能:                                                  │
│     │   ├── 首页（下单）                                       │
│     │   ├── 服务介绍                                           │
│     │   ├── 包裹跟踪                                           │
│     │   └── 联系我们                                           │
│     └── 特点: 完全独立，无后台管理入口                          │
│                                                                 │
│  🔐 后台管理 Web (原项目根目录)                                 │
│     ├── 域名: admin-market-link-express.com                    │
│     ├── 部署: Netlify (market-link-express 项目)              │
│     ├── 技术栈: React + TypeScript + Supabase                 │
│     ├── 功能:                                                  │
│     │   ├── 管理员登录（受保护路由）                           │
│     │   ├── 管理仪表板                                          │
│     │   ├── 同城包裹管理                                       │
│     │   ├── 实时跟踪                                           │
│     │   ├── 快递员管理                                         │
│     │   ├── 财务管理                                           │
│     │   ├── 用户管理                                           │
│     │   ├── 系统设置                                           │
│     │   ├── 账号管理                                           │
│     │   └── 员工监督                                           │
│     └── 特点: 完全受保护，需要登录验证                          │
│                                                                 │
│  📱 骑手 App (ml-express-mobile-app)                           │
│     ├── 平台: Android + iOS                                    │
│     ├── 技术栈: React Native + Expo                           │
│     ├── 部署: Expo EAS Build                                    │
│     ├── 功能:                                                  │
│     │   ├── 骑手登录                                           │
│     │   ├── 任务管理                                           │
│     │   ├── 地图导航（智能路线优化）                           │
│     │   ├── 包裹扫描                                           │
│     │   ├── 违规检测系统                                       │
│     │   └── 性能分析                                           │
│     └── 状态: ✅ 已上线 (Android APK)                          │
│                                                                 │
│  📱 客户端 App (ml-express-client)                             │
│     ├── 平台: Android + iOS                                    │
│     ├── 技术栈: React Native + Expo                           │
│     ├── 部署: Expo EAS Build                                    │
│     ├── 功能:                                                  │
│     │   ├── 客户下单                                           │
│     │   ├── 包裹跟踪                                           │
│     │   └── 订单管理                                           │
│     └── 状态: ✅ 已上线 (Android APK)                          │
│                                                                 │
│  🗄️ 数据库 (Supabase PostgreSQL)                              │
│     ├── 项目: ML Express Production                            │
│     ├── URL: https://uopkyuluxnrewvlmutam.supabase.co         │
│     ├── 共享: 所有组件共享同一个数据库                          │
│     ├── 主要表:                                                │
│     │   ├── packages (包裹表)                                 │
│     │   ├── couriers (快递员表)                               │
│     │   ├── users (用户表)                                    │
│     │   ├── admin_accounts (管理员账号表)                      │
│     │   ├── courier_locations (快递员位置表)                  │
│     │   ├── finance_records (财务记录表)                      │
│     │   ├── courier_salaries (骑手工资表)                     │
│     │   └── audit_logs (审计日志表)                           │
│     └── 实时同步: Web ↔ Mobile Apps                            │
│                                                                 │
│  🗺️ 地图服务 (Google Maps API)                                │
│     ├── API Key: AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c      │
│     ├── 服务: Maps JavaScript API, Places API, Geocoding      │
│     └── 限制: HTTP referer (域名限制)                          │
│                                                                 │
│  🔒 安全服务 (Netlify Functions)                              │
│     ├── verify-admin.js (Token 验证)                           │
│     ├── admin-password.js (密码哈希)                           │
│     └── 部署: Netlify Functions                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 🔗 系统连接方式

#### 1. 数据同步机制

**所有组件共享同一个 Supabase 数据库**：

```typescript
// 所有组件使用相同的配置
const supabaseUrl = 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**数据流转**：
```
客户端 Web (market-link-express.com)
    ↓ 创建订单
Supabase 数据库
    ↑ 查看订单
后台管理 (admin-market-link-express.com)
    ↓ 分配包裹
Supabase 数据库
    ↑ 接收任务
骑手 App
    ↓ 更新状态
Supabase 数据库
    ↑ 查看状态
客户端 Web / 客户端 App
```

#### 2. 域名配置

**客户端 Web**:
- **项目名称**: `client-ml-express`
- **域名**: `market-link-express.com`
- **Netlify 项目**: https://app.netlify.com/projects/client-ml-express
- **访问地址**: https://market-link-express.com

**后台管理**:
- **项目名称**: `market-link-express`
- **域名**: `admin-market-link-express.com`
- **Netlify 项目**: https://app.netlify.com/projects/market-link-express
- **访问地址**: https://admin-market-link-express.com

#### 3. 路由保护

**客户端 Web** (`ml-express-client-web/src/App.tsx`):
```typescript
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/services" element={<ServicesPage />} />
  <Route path="/tracking" element={<TrackingPage />} />
  <Route path="/contact" element={<ContactPage />} />
</Routes>
```

**后台管理** (`src/App.tsx`):
```typescript
<Routes>
  <Route path="/" element={<Navigate to="/admin/login" replace />} />
  <Route path="/admin/login" element={<AdminLogin />} />
  
  {/* 受保护的路由 */}
  <Route 
    path="/admin/dashboard" 
    element={
      <ProtectedRoute requiredRoles={['admin', 'manager', 'operator', 'finance']}>
        <AdminDashboard />
      </ProtectedRoute>
    } 
  />
  {/* ... 其他受保护的路由 ... */}
</Routes>
```

### 🔐 安全架构

#### 1. 认证系统

**后台管理登录流程**:
```
用户输入用户名/密码
    ↓
AdminLogin.tsx → adminAccountService.login()
    ↓
Netlify Function: admin-password.js (密码验证)
    ↓
authService.saveToken() (生成 JWT Token)
    ↓
localStorage 存储 Token
    ↓
ProtectedRoute 验证 Token
    ↓
Netlify Function: verify-admin.js (服务器端验证)
    ↓
允许访问受保护的路由
```

**Token 验证流程**:
```typescript
// ProtectedRoute.tsx
useEffect(() => {
  const checkAuthStatus = async () => {
    const token = getToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    
    // 服务器端验证
    const result = await verifyToken(requiredRoles);
    if (result.valid) {
      setIsAuthenticated(true);
    } else {
      clearToken();
      navigate('/admin/login');
    }
  };
  checkAuthStatus();
}, []);
```

#### 2. 密码安全

**密码哈希** (Netlify Function: `admin-password.js`):
```javascript
const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}
```

**数据库存储**:
- 密码使用 bcrypt 哈希存储
- 不再使用明文密码
- 所有密码操作通过 Netlify Function 处理

#### 3. 环境变量配置

**客户端 Web** (Netlify Dashboard):
```
REACT_APP_SUPABASE_URL = https://uopkyuluxnrewvlmutam.supabase.co
REACT_APP_SUPABASE_ANON_KEY = YOUR_SUPABASE_ANON_KEY_HERE
REACT_APP_GOOGLE_MAPS_API_KEY = AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c
```

**后台管理** (Netlify Dashboard):
```
REACT_APP_SUPABASE_URL = https://uopkyuluxnrewvlmutam.supabase.co
REACT_APP_SUPABASE_ANON_KEY = YOUR_SUPABASE_ANON_KEY_HERE
REACT_APP_GOOGLE_MAPS_API_KEY = AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c
```

### 📁 项目结构

```
ml-express/
├── ml-express-client-web/          # 客户端 Web
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.tsx       # 首页（下单）- 包含订单ID生成、地图选择
│   │   │   ├── ServicesPage.tsx   # 服务介绍
│   │   │   ├── TrackingPage.tsx   # 包裹跟踪
│   │   │   └── ContactPage.tsx    # 联系我们
│   │   ├── services/
│   │   │   └── supabase.ts        # Supabase 服务（包含pendingOrderService）
│   │   ├── contexts/
│   │   │   └── LanguageContext.tsx # 多语言支持
│   │   └── styles/
│   │       ├── variables.css      # CSS 变量系统
│   │       └── global.css         # 全局样式
│   ├── netlify.toml               # Netlify 配置
│   └── package.json
│
├── src/                            # 后台管理 Web
│   ├── pages/
│   │   ├── AdminLogin.tsx         # 管理员登录
│   │   ├── AdminDashboard.tsx     # 管理仪表板
│   │   ├── HomePage.tsx           # 包裹管理（包含订单ID生成）
│   │   ├── RealTimeTracking.tsx   # 实时跟踪管理（地图显示）
│   │   ├── FinanceManagement.tsx  # 财务管理
│   │   ├── AccountManagement.tsx  # 账号管理
│   │   ├── CourierManagement.tsx  # 快递员管理
│   │   ├── DeliveryStoreManagement.tsx # 配送点管理
│   │   ├── TrackingPage.tsx       # 包裹跟踪
│   │   └── ...                     # 其他管理页面
│   ├── components/
│   │   └── ProtectedRoute.tsx     # 路由保护组件
│   ├── services/
│   │   ├── supabase.ts            # Supabase 服务（完整版）
│   │   └── authService.ts         # 认证服务
│   └── App.tsx                    # 路由配置
│
├── ml-express-mobile-app/          # 骑手 App
│   ├── screens/
│   │   ├── LoginScreen.tsx        # 登录页面
│   │   ├── MapScreen.tsx          # 地图页面（智能路线优化）
│   │   └── ...                     # 其他页面
│   ├── services/
│   │   └── supabase.ts            # Supabase 服务
│   ├── app.config.js              # Expo 动态配置（包含Google Maps API Key）
│   ├── app.json                   # Expo 基础配置
│   ├── eas.json                   # EAS Build 配置
│   └── package.json
│
├── ml-express-client/             # 客户端 App
│   ├── src/
│   │   ├── screens/
│   │   │   ├── PlaceOrderScreen.tsx # 下单页面（包含订单ID生成）
│   │   │   ├── PlaceOrderScreenOptimized.tsx # 下单页面优化版
│   │   │   ├── TrackPackageScreen.tsx # 跟踪页面
│   │   │   └── ...                  # 其他页面
│   │   ├── contexts/
│   │   │   ├── AppContext.tsx      # 应用上下文（语言设置等）
│   │   │   └── LoadingContext.tsx  # 加载状态上下文
│   │   └── services/
│   │       └── supabase.ts         # Supabase 服务
│   ├── app.json                   # Expo 配置
│   └── package.json
│
├── netlify/
│   └── functions/
│       ├── verify-admin.js         # Token 验证函数
│       └── admin-password.js       # 密码哈希函数
│
└── 文档文件/
    ├── AI_GUIDE.md                # AI 开发指南（本文件）
    ├── ORDER_ID_TIME_FIX.md       # 订单ID时间修复文档
    ├── PACKAGE_ID_GENERATION_LOGIC.md # 订单ID生成逻辑文档
    ├── CLIENT_WEB_MAPS_TROUBLESHOOTING.md # 客户端Web地图问题排查
    ├── GOOGLE_CLOUD_API_KEY_SETUP.md # Google Cloud API Key 设置指南
    └── ...                         # 其他文档
```

### 🚀 部署配置

#### 客户端 Web 部署 (Netlify)

**项目设置**:
- **Base directory**: `ml-express-client-web`
- **Build command**: `npm install && npm run build`
- **Publish directory**: `ml-express-client-web/build`

**环境变量** (Netlify Dashboard):
```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_GOOGLE_MAPS_API_KEY
```

**域名配置**:
- 添加自定义域名: `market-link-express.com`
- 配置 DNS CNAME 记录指向 Netlify

#### 后台管理部署 (Netlify)

**项目设置**:
- **Base directory**: `.` (根目录)
- **Build command**: `npm install && npm run build`
- **Publish directory**: `build`

**环境变量** (Netlify Dashboard):
```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_GOOGLE_MAPS_API_KEY
```

**域名配置**:
- 添加自定义域名: `admin-market-link-express.com`
- 配置 DNS CNAME 记录指向 Netlify

**Netlify Functions**:
- `netlify/functions/verify-admin.js` - Token 验证
- `netlify/functions/admin-password.js` - 密码哈希

### 🔄 数据流转示例

#### 客户下单流程

```
1. 客户访问 market-link-express.com
   ↓
2. 填写订单信息（寄件人、收件人、包裹类型等）
   ↓
3. 选择地图位置（获取经纬度坐标）
   ↓
4. 提交订单 → packageService.createPackage()
   ↓
5. 数据保存到 Supabase packages 表
   ↓
6. 后台管理 (admin-market-link-express.com) 实时显示新订单
   ↓
7. 管理员分配包裹给骑手
   ↓
8. 骑手 App 接收任务通知
   ↓
9. 骑手取件 → 更新状态为 "已取件"
   ↓
10. 骑手配送 → 更新状态为 "配送中"
   ↓
11. 骑手送达 → 更新状态为 "已送达"
   ↓
12. 客户在客户端 Web/App 查看订单状态
```

### 🎯 关键功能

#### 客户端 Web 功能

1. **首页下单** (`HomePage.tsx`):
   - 寄件人信息（姓名、电话、地址、地图选择）
   - 收件人信息（姓名、电话、地址、地图选择）
   - 包裹类型选择（标准件、超规件、易碎品、食品和饮料）
   - 重量输入
   - 配送速度选择（普通配送、加急配送、准时达）
   - 价格估算（实时计算）
   - 订单提交和支付二维码生成

2. **包裹跟踪** (`TrackingPage.tsx`):
   - 输入订单号查询
   - 显示订单状态和详细信息

3. **服务介绍** (`ServicesPage.tsx`):
   - 服务特色展示
   - 价格说明

4. **联系我们** (`ContactPage.tsx`):
   - 公司地址：ChanMyaThaZi Mandalay
   - 联系电话
   - 联系表单

#### 后台管理功能

1. **财务管理** (`FinanceManagement.tsx`):
   - 数据可视化（折线图、柱状图、饼图）
   - 工资记录管理（按月分页）
   - 生成本月工资（防重复生成）
   - 基本工资从账号管理读取
   - **现金收款管理**（新增）:
     - 显示所有快递员的现金收款情况
     - 按快递员查看现金收款详情
     - 日期筛选功能（全部、最近7天、30天、90天、自定义）
     - 包裹选择功能（复选框、全选、全部结清）
     - 结清后包裹自动消失

2. **账号管理** (`AccountManagement.tsx`):
   - 员工账号列表
   - 编辑账号信息（工资、职位等）
   - 最后登录时间格式化（YYYY/MM/DD HH:mm:ss）

3. **路由保护** (`ProtectedRoute.tsx`):
   - 客户端 Token 验证
   - 服务器端 Token 验证
   - 角色权限检查

### 📊 数据库表结构

#### packages (包裹表)
```sql
CREATE TABLE packages (
  id TEXT PRIMARY KEY,
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  sender_latitude DECIMAL(10,8),
  sender_longitude DECIMAL(11,8),
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  receiver_latitude DECIMAL(10,8),
  receiver_longitude DECIMAL(11,8),
  package_type TEXT NOT NULL,
  weight DECIMAL(5,2),
  description TEXT,
  delivery_speed TEXT NOT NULL,
  scheduled_delivery_time TEXT,
  status TEXT NOT NULL DEFAULT '待取件',
  courier TEXT,
  pickup_time TEXT,
  delivery_time TEXT,
  payment_method TEXT DEFAULT 'qr', -- 支付方式：'qr'=二维码支付，'cash'=现金支付
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### admin_accounts (管理员账号表)
```sql
CREATE TABLE admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- bcrypt 哈希
  employee_name TEXT NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  department TEXT,
  position TEXT,
  role TEXT NOT NULL,
  salary DECIMAL(10,2), -- 基本工资
  status TEXT DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 🔧 最新功能更新 (2025年1月16日)

#### 1. 订单ID生成时间修复 ✅

**问题**:
- 订单ID生成时间与实际下单时间不匹配
- 年份显示错误（2025而不是2024）
- 时间相差约6小时30分钟

**修复方案**:
- ✅ 使用 Intl API 获取准确的缅甸时间（Asia/Yangon时区）
- ✅ 修复客户端Web (`ml-express-client-web/src/pages/HomePage.tsx`)
- ✅ 修复客户端App (`ml-express-client/src/screens/PlaceOrderScreen.tsx`)
- ✅ 修复客户端App优化版 (`ml-express-client/src/screens/PlaceOrderScreenOptimized.tsx`)
- ✅ 修复后台管理Web (`src/pages/HomePage.tsx`)

**实现代码**:
```javascript
// 使用Intl API获取缅甸时间（Asia/Yangon时区），确保年份和时间准确
const now = new Date();
const myanmarTimeParts = {
  year: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', year: 'numeric' }),
  month: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', month: '2-digit' }),
  day: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', day: '2-digit' }),
  hour: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', hour: '2-digit', hour12: false }),
  minute: now.toLocaleString('en-US', { timeZone: 'Asia/Yangon', minute: '2-digit' })
};
```

**文档**:
- `ORDER_ID_TIME_FIX.md` - 订单ID时间修复指南
- `TIME_CALCULATION_DEBUG.md` - 时间计算调试指南

#### 2. 地图坐标标注功能优化 ✅

**问题**:
- 地图中点击店铺位置无法正确标注坐标
- 只能通过右键点击选择位置

**修复方案**:
- ✅ 地图点击事件同时支持POI（店铺、地点）点击和普通位置点击
- ✅ 点击POI时自动获取店铺详细信息（名称、地址、坐标）
- ✅ 点击普通位置时使用Geocoding API获取地址和坐标
- ✅ 自动填充地址到输入框并显示标记

**实现位置**:
- `ml-express-client-web/src/pages/HomePage.tsx` - 地图点击事件处理

**文档**:
- `CLIENT_WEB_MAPS_TROUBLESHOOTING.md` - 地图问题排查指南

#### 3. 临时订单存储优化 ✅

**改进**:
- ✅ 临时订单从 `localStorage` 迁移到 Supabase 数据库
- ✅ 创建 `pending_orders` 表存储临时订单
- ✅ 实现 `pendingOrderService` 服务
- ✅ 保留 `localStorage` 作为回退机制

**数据库表**:
```sql
CREATE TABLE pending_orders (
  id TEXT PRIMARY KEY,
  temp_order_id TEXT UNIQUE NOT NULL,
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  sender_latitude DECIMAL(10,8),
  sender_longitude DECIMAL(11,8),
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  receiver_latitude DECIMAL(10,8),
  receiver_longitude DECIMAL(11,8),
  package_type TEXT NOT NULL,
  weight TEXT NOT NULL,
  delivery_speed TEXT,
  scheduled_delivery_time TEXT,
  price DECIMAL(10,2) NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

**文档**:
- `ORDER_GENERATION_IMPROVEMENTS.md` - 订单生成改进文档
- `supabase-pending-orders-setup.sql` - 数据库表创建脚本

#### 4. 城市前缀映射更新 ✅

**更新内容**:
- ✅ 更新城市前缀映射，以曼德勒为中心
- ✅ 支持的城市：曼德勒(MDY)、彬乌伦(POL)、仰光(YGN)、内比都(NPW)、东枝(TGI)、腊戌(LSO)、木姐(MSE)
- ✅ 客户端Web根据寄件地址自动识别城市前缀
- ✅ 客户端App和后台管理Web使用城市选择

**文档**:
- `PACKAGE_ID_GENERATION_LOGIC.md` - 订单ID生成逻辑文档

### 🔧 历史功能更新 (2025年1月30日)

#### 1. 客户端 Web UI/UX 优化

**统一设计系统**:
- 创建 `src/styles/variables.css` - CSS 变量系统
- 创建 `src/styles/global.css` - 全局样式
- 统一字体、颜色、间距、圆角、阴影

**订单表单优化**:
- 缩短窗口宽度（500px → 420px）
- 统一所有输入框样式
- 使用 CSS 变量确保一致性
- 优化字体对齐和排版

#### 2. 构建错误修复

**修复内容**:
- ✅ 字符串拼接错误（使用模板字符串）
- ✅ 未使用变量警告（添加 eslint-disable 注释）
- ✅ React Hook useEffect 依赖项警告

**构建验证**:
```bash
CI=true npm run build
# ✅ 构建成功，无错误
```

### 📋 开发检查清单

#### 更新 API Key 时
- [ ] 更新客户端 Web 环境变量
- [ ] 更新后台管理环境变量
- [ ] 更新移动应用 `app.json`
- [ ] 测试所有地图功能

#### 部署前检查
- [ ] 所有环境变量配置正确
- [ ] 数据库连接正常
- [ ] 构建无错误
- [ ] 功能测试通过
- [ ] 域名 DNS 配置正确

#### 修复构建错误时
- [ ] 检查 ESLint 错误
- [ ] 检查 TypeScript 错误
- [ ] 检查未使用变量
- [ ] 验证 CI 构建（`CI=true npm run build`）

---

## 🚀 历史功能更新

### 📱 移动应用部署准备 (2025年1月29日)

#### Google Play Store 上架准备
- ✅ `ml-express-mobile-app/eas.json` - 配置 `app-bundle` 构建类型
- ✅ `ml-express-mobile-app/app.json` - 添加 `versionCode: 1`
- ✅ 创建 `GOOGLE_PLAY_STORE_GUIDE.md` - 完整的上架流程文档

#### iOS TestFlight 部署准备
- ✅ `ml-express-client/eas.json` - 添加 `testflight` 构建配置
- ✅ 创建 `TESTFLIGHT_GUIDE.md` - 详细的 TestFlight 部署指南

### 🎨 用户体验优化 (2024年10月29日)

- ✅ 创建用户体验组件 (`EmptyState`, `Toast`, `LoadingSpinner`, `ErrorMessage`)
- ✅ 骨架屏优化
- ✅ 统一导出 (`src/components/ui/index.ts`)
- ✅ 视觉反馈（悬停效果、平滑过渡动画）

### 🔒 类型安全优化 (2024年10月29日)

- ✅ 创建统一类型定义 (`src/types/index.ts`)
- ✅ 消除 any 类型
- ✅ 智能类型推断

### 🎯 代码优化与性能提升 (2024年10月29日)

- ✅ 清理调试代码（移除 86+ 个 console.log）
- ✅ 删除备份文件（减少 6,577 行代码）
- ✅ 性能优化（API 轮询、防抖、节流）
- ✅ 代码复用（通用 Select、FormField 组件）

### 🔧 统一错误处理 (2024年10月29日)

- ✅ 创建错误处理服务
- ✅ 错误分类（网络、数据库、验证、授权）
- ✅ 用户友好提示

---

## 📞 联系信息

如有问题，请提供以下信息：
1. 具体的错误信息
2. 出现问题的页面/功能
3. 浏览器/设备信息
4. 控制台错误日志
5. 相关的配置文件内容

---

### 🔧 最新功能更新 (2025年1月17日)

#### 1. 客户端 Web UI/UX 优化 ✅

**Header 统一优化**:
- ✅ 统一所有页面的公司名称显示（单行显示 "MARKET LINK EXPRESS"）
- ✅ 在"服务"、"包裹跟踪"、"联系我们"页面添加用户登录状态卡片
- ✅ 调整"服务"页面 header 布局，与"包裹跟踪"页面一致
- ✅ 用户登录状态卡片显示"欢迎，[用户名]"和"退出"按钮

**修改文件**:
- `ml-express-client-web/src/pages/HomePage.tsx` - Logo组件改为单行显示
- `ml-express-client-web/src/pages/ServicesPage.tsx` - 添加用户认证，调整header布局
- `ml-express-client-web/src/pages/TrackingPage.tsx` - 添加用户认证
- `ml-express-client-web/src/pages/ContactPage.tsx` - 添加用户认证

#### 2. 支付方式功能完善 ✅

**数据库更新**:
- ✅ 添加 `payment_method` 字段到 `packages` 表（支持 'qr' | 'cash'）
- ✅ 移除 'transfer' 支付方式，仅保留 'qr' 和 'cash'

**客户端 Web 更新**:
- ✅ 订单页面移除"转账"支付选项
- ✅ 现金支付订单状态设置为"待收款"
- ✅ 二维码支付订单状态设置为"待取件"

**客户端 App 更新**:
- ✅ 订单页面移除"转账"支付选项
- ✅ 应用与客户端Web相同的支付逻辑

**后台管理 Web 更新**:
- ✅ "实时跟踪管理"页面显示支付方式标识
- ✅ "包裹管理"页面显示支付方式标识
- ✅ 将"待收款"状态显示为"待取件"（UI显示优化）

**骑手 App 更新**:
- ✅ "我的任务"页面显示支付方式标识
- ✅ "地图"页面"配送顺序"中显示支付方式标识
- ✅ "配送历史"页面移除"已送达"状态，显示支付方式标识
- ✅ 添加"确认支付"功能（现金支付待收款订单）

**修改文件**:
- `add-payment-method-field.sql` - 数据库迁移脚本
- `ml-express-client-web/src/pages/HomePage.tsx` - 移除转账选项
- `ml-express-client-web/src/pages/TrackingPage.tsx` - 显示支付方式
- `ml-express-client/src/screens/PlaceOrderScreen.tsx` - 移除转账选项
- `src/pages/RealTimeTracking.tsx` - 显示支付方式，待收款状态处理
- `src/pages/CityPackages.tsx` - 显示支付方式，待收款状态处理
- `ml-express-mobile-app/screens/MyTasksScreen.tsx` - 支付方式显示和确认支付
- `ml-express-mobile-app/screens/MapScreen.tsx` - 支付方式显示
- `ml-express-mobile-app/screens/DeliveryHistoryScreen.tsx` - 支付方式显示
- 所有 `services/supabase.ts` 文件 - 更新 Package 接口

#### 3. 财务管理 - 现金收款管理功能 ✅

**新增功能**:
- ✅ 添加"现金收款管理"标签页到财务管理页面
- ✅ 自动从快递员管理页面加载所有快递员（名称和工作号）
- ✅ 显示每个快递员的现金收款总额和包裹数量
- ✅ 每个快递员旁边添加"详情"按钮

**详情弹窗功能**:
- ✅ 显示该快递员的所有现金收款包裹
- ✅ 日期筛选功能（全部、最近7天、30天、90天、自定义日期范围）
- ✅ 包裹卡片左上角添加白色复选框
- ✅ 全选/取消全选功能（带图标按钮）
- ✅ "全部结清"按钮（显示选中数量）
- ✅ 点击"全部结清"后，选中的包裹自动消失
- ✅ 统计信息实时更新

**实现逻辑**:
- 使用 `Set<string>` 管理选中包裹ID
- 使用 `Set<string>` 管理已结清包裹ID
- 已结清的包裹从列表中过滤掉
- 统计信息基于可见包裹计算

**修改文件**:
- `src/pages/FinanceManagement.tsx` - 添加现金收款管理功能

**数据库字段**:
- `packages.payment_method` - 支付方式字段（'qr' | 'cash'）

### 🔧 历史功能更新 (2025年1月16日)

---

### 🔧 最新功能更新 (2025年1月31日)

#### 1. 二维码支付功能暂停 ✅

**变更内容**:
- ✅ 客户端Web：二维码支付选项显示"开发中"，默认使用现金支付
- ✅ 客户端App：二维码支付选项显示"开发中"，默认使用现金支付
- ✅ 注释掉未使用的 `generatePaymentQRCode` 函数，修复Netlify部署错误
- ✅ 保留包裹二维码功能：现金支付下单后仍显示包裹二维码（供快递员扫描取件）

**修改文件**:
- `ml-express-client-web/src/pages/HomePage.tsx` - 禁用二维码支付选项，注释支付二维码生成函数
- `ml-express-client/src/screens/PlaceOrderScreen.tsx` - 禁用二维码支付选项，保留包裹二维码显示

**功能说明**:
- **支付二维码**（已暂停）：用于客户扫码支付费用，显示"开发中"
- **包裹二维码**（正常）：用于快递员扫描取件，无论支付方式都会显示

#### 2. 客户端App UI/UX优化 ✅

**登录页面优化**:
- ✅ 支持手机号和邮箱登录（输入框提示更新）
- ✅ 优化布局：缩小padding、logo尺寸、字体大小
- ✅ 输入框键盘类型改为 `default` 以支持手机号输入

**联系我们卡片优化**:
- ✅ "客服热线"和"商务合作"卡片改为长方形（高度140→180）
- ✅ 优化字体大小和行高，防止文字被截断
- ✅ 图标和文字大小调整

**整体布局优化**:
- ✅ 所有页面（HomeScreen、LoginScreen、RegisterScreen）布局更紧凑
- ✅ 缩小padding、margins、字体大小
- ✅ 优化卡片尺寸和间距

**图标缩小**:
- ✅ 所有图标缩小2号（fontSize减少2-4px）
- ✅ Icon组件默认size从20改为18
- ✅ 包括服务图标、功能图标、联系图标、快速操作图标等

**修改文件**:
- `ml-express-client/src/screens/LoginScreen.tsx` - 登录页面优化
- `ml-express-client/src/screens/HomeScreen.tsx` - 首页优化，联系卡片改为长方形
- `ml-express-client/src/screens/RegisterScreen.tsx` - 注册页面优化
- `ml-express-client/src/components/Icon.tsx` - Icon组件默认size调整
- `ml-express-client/src/screens/MyOrdersScreen.tsx` - 订单列表页面图标优化
- `ml-express-client/src/screens/OrderDetailScreen.tsx` - 订单详情页面图标优化
- `ml-express-client/src/screens/TrackOrderScreen.tsx` - 跟踪页面图标优化

#### 3. 通知服务优化 ✅

**Expo Go兼容性**:
- ✅ 实现条件导入 `expo-notifications`，避免在Expo Go中报错
- ✅ 添加 `isExpoGo` 检查，动态加载通知模块
- ✅ 在Expo Go中跳过通知服务初始化

**修改文件**:
- `ml-express-client/src/services/notificationService.ts` - 条件导入通知模块
- `ml-express-client/App.tsx` - 条件初始化通知服务

#### 4. 错误修复 ✅

**语法错误修复**:
- ✅ 修复 `PlaceOrderScreen.tsx` 中Alert.alert代码注释不完整导致的语法错误
- ✅ 修复 `HomePage.tsx` 中未使用的 `generatePaymentQRCode` 函数导致的ESLint错误

**部署错误修复**:
- ✅ 修复Netlify部署失败（ESLint未使用变量错误）
- ✅ 修复客户端App构建错误（语法错误）

**修改文件**:
- `ml-express-client/src/screens/PlaceOrderScreen.tsx` - 完整注释Alert.alert代码
- `ml-express-client-web/src/pages/HomePage.tsx` - 注释未使用的函数

---

### 🔧 最新功能更新 (2025年12月29日) ✅

#### 1. 精准里程计费架构优化 (全链路)
**核心逻辑变更**:
- **逻辑分离**: 实现了“对客计费”与“对骑手结算”的逻辑分离。
  - **对客计费**: 维持 `Math.ceil` (向上取整) 逻辑（如 6.1km 按 7km 算），保护运营利润。
  - **对骑手结算**: 采用**精准小数**逻辑（如 3.4km 即按 3.4km 计算），取消四舍五入，确保薪资统计公平透明。
- **数据存储**: 订单创建时，`delivery_distance` 字段统一存储最原始的物理距离（保留小数）。
- **显示精度**: 全平台（Admin Web, 骑手 App, 客户端 App）统一采用 **1 位小数**显示精度（如 `3.4 KM`）。

**修改范围**:
- `ml-express-client`: `PlaceOrderScreen` 存储逻辑更新。
- `ml-express-client-web`: `HomePage` 价格估算与距离计算同步。
- `src/pages/FinanceManagement.tsx`: 骑手工资生成算法改为精准距离。
- `ml-express-mobile-app`: `PerformanceAnalytics` 与 `DeliveryHistory` 里程精度更新。

#### 2. 客户端实时追踪系统增强 ✅
**功能改进**:
- **多订单支持**: 在“追踪订单”页面顶部新增“进行中配送”横向滚动列表。
- **快捷切换**: 客户无需手动输入单号，可直接点击列表中的订单卡片一键开启实时追踪。
- **状态同步**: 正在追踪的订单在列表中会有“金色边框”高亮提示，并显示 `👀 正在追踪`。
- **自动清理**: 订单一旦变为“已送达”，刷新列表后会自动消失。
- **体验优化**: 追踪页面添加“下拉刷新”功能，地图随骑手位置实时平滑平移动画。

#### 3. 跨端价格估算逻辑对齐 ✅
**修复内容**:
- **Web 端明细修复**: 修复了 `OrderModal.tsx` 中特殊包裹费（超规、易碎、食品）不显示的逻辑 Bug。
- **多语言适配**: 统一了中/英/缅三语环境下包裹类型与配送速度的判定字符串，确保计费 100% 准确。

---

### 🔧 最新功能更新 (2026年1月10日) ✅

#### 1. 商家商品与购物车系统优化 (全端同步)
**功能改进**:
- **单店模式购物车**: 购物车限制只能存储同一个店铺的商品。尝试添加跨店商品时，系统会弹出确认提示并自动抹除旧商品，确保配送逻辑清晰。
- **下单自动清空**: 在客户端 App/Web 下单成功后，系统会自动清空对应的购物车，防止重复购买。
- **商场入口控制**: 针对 "Partner" 账号，在主页自动隐藏“同城商场”和“购物车”入口，避免商户在自家店铺产生误操作。

#### 2. “付给商家”货款管理系统
**核心逻辑**:
- **货款记录**: 会员账号下单时，系统自动在订单描述中记录 `[付给商家: XXX MMK]` 标签。
- **货款展示**: 
  - **客户端**: 下单窗口及订单详情中新增“付给商家”项，方便用户核对。
  - **骑手端**: 在任务列表、地图规划及包裹详情中全面展示该货款，确保骑手清楚需代付或代收的商品钱。
  - **骑手统计**: 骑手“账号”页面新增“今日付商家”和“累计货款”统计，采用纵向排列布局，适配长金额显示。

#### 3. 下单身份识别系统 (Partner vs Member)
**功能改进**:
- **身份自动标记**: 订单创建时自动识别下单人类型，并在全平台订单卡片顶部显示 `合伙人` (蓝色) 或 `会员` (橙色) 标签。
- **位置优化**: 身份标签统一移至“配送选项”（如：准时达）的右侧，方便骑手一眼分辨大客户。
- **表单自动填充**: 会员下单时，收件人姓名和电话自动读取个人资料，实现“一键下单”。

#### 4. 骑手端实时语音呼叫系统
**功能改进**:
- **语音播报**: 引入 `expo-speech` 引擎。当后台分配订单时，App 会自动播放“您有新的订单”语音提示（支持中、英、缅三语）。
- **实时感应**: 针对 Expo Go 环境优化，采用 Supabase Realtime 监听。即使系统推送受限，只要 App 在前台运行即可触发语音和震动提醒。

#### 5. 管理端 (Admin Web) 深度优化
**功能改进**:
- **店铺商品透视**: “合伙店铺”列表新增“🛍️ 进入店铺”功能，管理员可直接弹窗查看该商户在 App 端添加的所有商品。
- **交互升级**: 
  - **类型重排**: 重新整理 12 种店铺类型并优化下拉菜单，固定显示 6 条记录并支持自定义滚动条。
  - **界面精简**: 移除了所有操作按钮的 Emoji 图标，使管理界面更加商务、简洁。

#### 6. 客户端 Web 功能对齐
**功能改进**:
- **商户管理中心**: Web 端同步上线了“我的商品”管理功能。合伙人可直接在 Web 浏览器中添加商品、修改价格、管理库存及上传图片。
- **下单流程同步**: 实现了与 App 完全一致的“选货卡片”和“代收(COD)开关”逻辑。

#### 7. 会员“同城商场”与“购物车”功能 ✅
**功能改进**:
- **全端体验一致**: 客户端 Web 为“会员”账号同步上线了“同城商场”和“购物车”功能，操作逻辑与客户端 App 保持高度一致。
- **商场页面**: 支持搜索商户、按类型查看店铺、查看营业时间及联系方式。
- **商品选购**: 实时查看店铺商品、管理选购数量、加入购物车。
- **购物车管理**: 支持修改商品数量、移除商品、清空购物车，并自动计算总价。
- **一键下单**: 购物车直接跳转至首页“立即下单”窗口，自动填充已选商品、代收款金额及寄件人（店铺）信息，实现“从选货到下单”的闭环体验。
- **首页入口**: 会员登录后，首页“立即下单”按钮旁新增“同城商场”和“购物车”快捷入口。

#### 8. 管理端 (Admin Web) 身份显示增强 ✅
**功能改进**:
- **身份实时识别**: 在“同城订单管理”和“实时追踪管理”页面的订单卡片中，新增了下单身份标识。
- **视觉区分**: 系统自动解析订单描述，通过蓝色标签标记 `合伙人 (Partner)`，通过橙色标签标记 `会员 (Member)`，方便管理员快速区分客户优先级。
- **详情展示**: 在包裹详情弹窗中同步增加了“下单身份”字段。

#### 9. 客户端 App 代收款逻辑修复 ✅
**功能改进**:
- **状态同步修复**: 修复了 `PlaceOrderScreen.tsx` 中切换代收开关时金额不实时更新的 Bug。
- **自动联动**: 现在当用户手动修改商品数量或切换代收开关时，代收金额会立即根据当前购物车总计重新计算，确保订单数据准确无误。

---

## 📋 版本信息

*最后更新：2026年1月10日*  
*版本：5.0.0*  
*状态：生产环境运行中*
*架构：商户选货系统 + 骑手语音实时呼叫 + 全端身份识别系统 + 会员全端购物系统 + 管理端身份增强*  

