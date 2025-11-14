# MARKET LINK EXPRESS - AI 开发指南

## 🚀 最新架构更新 (2025年1月30日)

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
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

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
REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_GOOGLE_MAPS_API_KEY = AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c
```

**后台管理** (Netlify Dashboard):
```
REACT_APP_SUPABASE_URL = https://uopkyuluxnrewvlmutam.supabase.co
REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_GOOGLE_MAPS_API_KEY = AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c
```

### 📁 项目结构

```
ml-express/
├── ml-express-client-web/          # 客户端 Web
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.tsx       # 首页（下单）
│   │   │   ├── ServicesPage.tsx   # 服务介绍
│   │   │   ├── TrackingPage.tsx   # 包裹跟踪
│   │   │   └── ContactPage.tsx    # 联系我们
│   │   ├── services/
│   │   │   └── supabase.ts        # Supabase 服务（简化版）
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
│   │   ├── FinanceManagement.tsx  # 财务管理
│   │   ├── AccountManagement.tsx  # 账号管理
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
│   └── app.json                   # Expo 配置
│
├── ml-express-client/             # 客户端 App
│   ├── src/
│   │   ├── screens/
│   │   │   ├── PlaceOrderScreen.tsx # 下单页面
│   │   │   ├── TrackPackageScreen.tsx # 跟踪页面
│   │   │   └── ...                  # 其他页面
│   │   └── services/
│   │       └── supabase.ts         # Supabase 服务
│   └── app.json                   # Expo 配置
│
└── netlify/
    └── functions/
        ├── verify-admin.js         # Token 验证函数
        └── admin-password.js       # 密码哈希函数
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

### 🔧 最新功能更新 (2025年1月30日)

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

*最后更新：2025年1月30日*  
*版本：4.0.0*  
*状态：生产环境运行中*  
*架构：完全分离的客户端和后台管理系统*
