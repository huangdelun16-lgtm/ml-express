# MARKET LINK EXPRESS - AI 开发指南

## 📋 项目概览

MARKET LINK EXPRESS 是一个完整的快递管理系统，包含三个主要组件：

### 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    MARKET LINK EXPRESS                      │
├─────────────────────────────────────────────────────────────┤
│  1. Web 管理后台 (React + TypeScript)                      │
│     ├── 客户下单页面                                        │
│     ├── 实时跟踪管理                                        │
│     ├── 快递员管理                                          │
│     └── 包裹管理                                           │
│     🌐 部署: Netlify (主要) + Vercel (备用)                │
├─────────────────────────────────────────────────────────────┤
│  2. 客户端 APP (React Native + Expo)                       │
│     ├── 客户下单                                            │
│     ├── 包裹跟踪                                            │
│     └── 订单管理                                            │
│     📱 部署: Expo EAS Build                                │
├─────────────────────────────────────────────────────────────┤
│  3. 骑手 APP (React Native + Expo)                         │
│     ├── 骑手登录                                            │
│     ├── 任务管理                                            │
│     ├── 地图导航                                            │
│     ├── 包裹扫描                                            │
│     ├── 违规检测系统                                        │
│     └── 性能分析                                            │
│     📱 部署: Expo EAS Build ✅ 已上线                      │
├─────────────────────────────────────────────────────────────┤
│  4. 数据库 (Supabase PostgreSQL)                          │
│     ├── packages (包裹表)                                  │
│     ├── couriers (快递员表)                                │
│     ├── users (用户表)                                     │
│     ├── admin_accounts (管理员账号表)                      │
│     └── courier_locations (快递员位置表)                   │
│     🗄️ 托管: Supabase Cloud                               │
├─────────────────────────────────────────────────────────────┤
│  5. 外部服务集成                                           │
│     ├── Google Maps API (地图服务)                         │
│     ├── Google Cloud Console (API 管理)                   │
│     └── GitHub (代码托管)                                  │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 业务流程架构

```
┌─────────────────────────────────────────────────────────────┐
│                    客户下单流程                              │
├─────────────────────────────────────────────────────────────┤
│  🌐 Web 应用                                                │
│     ↓                                                       │
│  📝 客户注册 → users 表                                     │
│     ↓                                                       │
│  🔐 自动登录 → 身份验证                                     │
│     ↓                                                       │
│  📦 填写订单 → packages 表                                  │
│     ↓                                                       │
│  💳 生成二维码 → 支付确认                                   │
│     ↓                                                       │
│  🆔 自动生成订单号 → 进入系统                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    包裹配送流程                              │
├─────────────────────────────────────────────────────────────┤
│  📋 同城包裹页面 → 显示待分配订单                           │
│     ↓                                                       │
│  👨‍💼 管理员查看 → 实时跟踪页面                             │
│     ↓                                                       │
│  🤖 自动分配 → 选择最佳骑手                                 │
│     ↓                                                       │
│  📱 骑手 APP → 接收任务通知                                 │
│     ↓                                                       │
│  🚚 骑手取件 → 更新状态 "已取件"                           │
│     ↓                                                       │
│  🛣️ 骑手配送 → 更新状态 "配送中"                           │
│     ↓                                                       │
│  ✅ 骑手送达 → 更新状态 "已送达"                           │
│     ↓                                                       │
│  📢 客户通知 → 送达确认                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 系统连接机制

### 1. 完整业务流程

#### 📱 客户下单流程
```
1. 客户访问 Web 应用
   ↓
2. 点击下单 → 跳转注册页面
   ↓
3. 填写注册信息 → 创建用户账号 (users 表)
   ↓
4. 注册成功 → 自动登录
   ↓
5. 填写订单信息 → 提交订单
   ↓
6. 生成付款二维码 → 客户扫码支付
   ↓
7. 支付成功 → 自动生成订单号 → 订单进入系统
```

#### 🚚 包裹配送流程
```
1. 订单进入 "同城包裹" 页面
   ↓
2. 管理员查看 "实时跟踪" 页面
   ↓
3. 点击 "自动分配" → 分配给骑手
   ↓
4. 骑手 APP 收到任务通知
   ↓
5. 骑手取件 → 更新包裹状态为 "已取件"
   ↓
6. 骑手配送 → 更新包裹状态为 "配送中"
   ↓
7. 骑手送达 → 更新包裹状态为 "已送达"
   ↓
8. 客户收到送达通知
```

### 2. 数据库连接

**所有组件共享同一个 Supabase 数据库：**

```typescript
// 配置信息 (所有组件相同)
const supabaseUrl = 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**位置：**
- Web: `src/services/supabase.ts`
- 客户端APP: `ml-express-client/src/services/supabase.ts`
- 员工APP: `ml-express-mobile-app/services/supabase.ts`

### 3. 用户身份系统

#### Web 端用户
- **客户**：通过 `users` 表管理
- **管理员**：通过 `admin_accounts` 表管理

#### 移动端用户
- **客户端APP**：客户通过 `users` 表登录
- **员工APP**：员工通过 `admin_accounts` 表登录

#### 关键身份匹配逻辑
```typescript
// 员工APP登录时 (LoginScreen.tsx)
if (account.position === '骑手' || account.position === '骑手队长') {
  // 查找对应的快递员记录
  const { data: courierData } = await supabase
    .from('couriers')
    .select('id, name')
    .eq('name', account.employee_name)  // 关键：使用 employee_name 匹配
    .single();
  
  // 存储快递员姓名到 currentUserName
  await AsyncStorage.setItem('currentUserName', courierData.name);
}

// 包裹分配时 (RealTimeTracking.tsx)
const success = await packageService.updatePackageStatus(
  packageData.id,
  '已取件',
  new Date().toLocaleString('zh-CN'),
  undefined,
  courier.name  // 使用快递员的 name 字段
);

// 移动端包裹过滤 (MapScreen.tsx)
const myPackages = allPackages.filter(pkg => 
  pkg.courier === currentUser &&  // currentUser = courierData.name
  !['已送达', '已取消'].includes(pkg.status)
);
```

### 4. 数据流转机制

#### 订单创建流程
```typescript
// 1. 客户注册 (Web 应用)
const newUser = await userService.createCustomer({
  name: customerName,
  phone: customerPhone,
  email: customerEmail,
  address: customerAddress,
  password: customerPassword
});

// 2. 客户下单 (Web 应用)
const newPackage = await packageService.createPackage({
  sender_name: senderName,
  sender_phone: senderPhone,
  sender_address: senderAddress,
  receiver_name: receiverName,
  receiver_phone: receiverPhone,
  receiver_address: receiverAddress,
  package_type: packageType,
  weight: weight,
  description: `${description} [客户ID: ${userId}]`, // 关键：包含客户ID
  delivery_speed: deliverySpeed,
  status: '待取件'
});

// 3. 生成订单号和二维码
const orderId = `PKG${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
const qrCodeData = `订单号: ${orderId}\n金额: ${totalAmount}\n时间: ${new Date().toLocaleString()}`;
```

#### 包裹分配流程
```typescript
// 1. Web 端自动分配 (RealTimeTracking.tsx)
const autoAssignPackage = async (packageData: Package) => {
  // 找到在线且包裹最少的骑手
  const availableCouriers = couriers
    .filter(c => c.status === 'online' || c.status === 'active')
    .sort((a, b) => (a.currentPackages || 0) - (b.currentPackages || 0));

  const bestCourier = availableCouriers[0];
  
  // 更新包裹状态
  await packageService.updatePackageStatus(
    packageData.id,
    '已取件',
    new Date().toLocaleString('zh-CN'),
    undefined,
    bestCourier.name
  );
  
  // 发送通知给骑手
  await notificationService.sendPackageAssignedNotification(
    bestCourier.id,
    bestCourier.name,
    packageData.id,
    packageData
  );
};

// 2. 骑手 APP 接收任务 (MapScreen.tsx)
const loadPackages = async () => {
  const currentUser = await AsyncStorage.getItem('currentUserName');
  const allPackages = await packageService.getAllPackages();
  
  // 过滤出分配给当前骑手的包裹
  const myPackages = allPackages.filter(pkg => 
    pkg.courier === currentUser && 
    !['已送达', '已取消'].includes(pkg.status)
  );
  
  setPackages(myPackages);
};
```

#### 包裹状态更新流程
```typescript
// 1. 骑手取件 (员工 APP)
await packageService.updatePackageStatus(
  packageId,
  '已取件',
  new Date().toLocaleString('zh-CN'),
  undefined,
  courierName
);

// 2. 骑手开始配送 (员工 APP)
await packageService.updatePackageStatus(
  packageId,
  '配送中',
  undefined,
  undefined,
  courierName
);

// 3. 骑手送达 (员工 APP)
await packageService.updatePackageStatus(
  packageId,
  '已送达',
  undefined,
  new Date().toLocaleString('zh-CN'),
  courierName
);

// 4. 客户收到通知 (Web 应用)
const notification = await notificationService.createNotification({
  user_id: customerId,
  title: '包裹已送达',
  message: `您的包裹 ${packageId} 已成功送达`,
  type: 'delivery_complete'
});
```

---

## 🗺️ Google Maps 集成

### 1. API Key 配置

#### Web 应用 (React)
```typescript
// 环境变量配置
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c";

// 使用方式
const { isLoaded: isMapLoaded } = useJsApiLoader({
  googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  libraries: ['places']
});
```

**配置文件：**
- `.env`: `REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c`
- `netlify.toml`: 部署环境变量配置

#### 移动应用 (React Native + Expo)
```json
// app.json 配置
{
  "ios": {
    "config": {
      "googleMapsApiKey": "AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c"
    }
  },
  "android": {
    "config": {
      "googleMaps": {
        "apiKey": "AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c"
      }
    }
  }
}
```

**配置文件：**
- `ml-express-client/app.json`
- `ml-express-mobile-app/app.json`

### 2. API Key 管理策略

#### 当前 API Key
```
AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c
```

#### 需要更新的位置
1. **Web 应用**：
   - `.env` 文件
   - `vercel.json` 文件 (Vercel 配置)
   - `netlify.toml` 文件 (Netlify 备用)
   - `src/pages/HomePage.tsx` (fallback)
   - `src/pages/RealTimeTracking.tsx` (fallback)
   - `src/pages/TrackingPage.tsx` (fallback)
   - `src/pages/DeliveryStoreManagement.tsx` (LoadScript)

2. **客户端APP**：
   - `ml-express-client/app.json` (iOS & Android)

3. **员工APP**：
   - `ml-express-mobile-app/app.json` (iOS & Android)

4. **Vercel 部署** (生产环境)：
   - 环境变量设置 (Project Settings → Environment Variables)
   - `vercel.json` 配置文件

5. **Netlify 部署** (备用)：
   - 环境变量设置 (Site settings → Environment variables)

---

## 🚀 部署配置

### 1. Web 应用部署

#### A. Netlify 部署 (备用)

##### 构建配置 (`netlify.toml`)
```toml
[build]
  command = "npm install && npm run build"
  publish = "build"

[build.environment]
  NODE_VERSION = "18"

# 环境变量
[context.production.environment]
  REACT_APP_GOOGLE_MAPS_API_KEY = "AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c"
  REACT_APP_SUPABASE_URL = "YOUR_SUPABASE_URL"
  REACT_APP_SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"

# SPA 重定向
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

##### 部署 URL
- 生产环境: `https://market-link-express.netlify.app/`
- 预览环境: `https://[deploy-id]--market-link-express.netlify.app/`

#### B. Vercel 部署 (生产环境) ⭐

##### 项目配置
- **项目名称**: ML Express Production
- **平台**: Vercel.com
- **框架**: Create React App
- **Node.js 版本**: 18.x

##### 构建配置 (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_GOOGLE_MAPS_API_KEY": "AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c",
    "REACT_APP_SUPABASE_URL": "https://uopkyuluxnrewvlmutam.supabase.co",
    "REACT_APP_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY"
  }
}
```

##### Vercel 环境变量配置
在 Vercel Dashboard → Project Settings → Environment Variables 中设置：

```
REACT_APP_GOOGLE_MAPS_API_KEY = AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c
REACT_APP_SUPABASE_URL = https://uopkyuluxnrewvlmutam.supabase.co
REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY
REACT_APP_APP_NAME = MARKET LINK EXPRESS
REACT_APP_APP_VERSION = 1.0.0
```

##### 部署 URL
- **生产环境**: `https://ml-express-production.vercel.app/`
- **预览环境**: `https://ml-express-production-git-[branch].vercel.app/`
- **自定义域名**: (如果已配置)

##### Vercel 部署优势
- ✅ 更快的全球 CDN
- ✅ 自动 HTTPS
- ✅ 零配置部署
- ✅ 预览分支部署
- ✅ 更好的性能监控

### 2. 移动应用部署

#### 客户端APP (ml-express-client)
```bash
# 开发模式
cd ml-express-client
npm start

# 构建
expo build:android
expo build:ios
```

#### 员工APP (ml-express-mobile-app)
```bash
# 开发模式
cd ml-express-mobile-app
npm start

# 构建
expo build:android
expo build:ios
```

---

## 🔧 常见问题与解决方案

### 1. Google Maps API Key 问题

#### 问题：InvalidKeyMapError
**原因**：API Key 无效或未启用相应服务
**解决**：
1. 检查 Google Cloud Console 中的 API Key 状态
2. 确保启用了以下 API：
   - Maps JavaScript API (Web)
   - Maps SDK for Android (Android)
   - Maps SDK for iOS (iOS)
   - Geocoding API (可选)

#### 问题：RefererNotAllowedMapError
**原因**：HTTP referer 限制配置错误
**解决**：
1. 在 Google Cloud Console 中添加允许的域名：
   - `https://market-link-express.netlify.app/*`
   - `https://*.netlify.app/*` (预览环境)
2. 确保 Netlify 环境变量正确设置

### 2. 包裹分配问题

#### 问题：Web 端分配后，移动端看不到包裹
**原因**：用户身份匹配不一致
**解决**：
1. 确保 `admin_accounts.employee_name` 与 `couriers.name` 一致
2. 检查移动端登录时是否正确存储了快递员姓名
3. 验证包裹的 `courier` 字段是否正确更新

#### 调试步骤：
```typescript
// 1. 检查移动端当前用户
const currentUser = await AsyncStorage.getItem('currentUserName');
console.log('当前用户:', currentUser);

// 2. 检查所有包裹
const allPackages = await packageService.getAllPackages();
console.log('所有包裹:', allPackages);

// 3. 检查包裹分配
const myPackages = allPackages.filter(pkg => 
  pkg.courier === currentUser
);
console.log('我的包裹:', myPackages);
```

### 3. 数据库连接问题

#### 问题：RLS (Row Level Security) 错误
**原因**：行级安全策略配置错误
**解决**：
1. 检查 Supabase RLS 策略
2. 确保用户有正确的权限
3. 验证数据访问模式

---

## 📱 移动应用架构

### 1. 客户端APP (ml-express-client)

#### 主要功能
- 客户下单
- 包裹跟踪
- 订单历史

#### 技术栈
- React Native + Expo
- Supabase 客户端
- React Native Maps
- AsyncStorage

#### 关键文件
- `src/screens/PlaceOrderScreen.tsx` - 下单页面
- `src/screens/TrackPackageScreen.tsx` - 跟踪页面
- `src/services/supabase.ts` - 数据库服务

### 2. 员工APP (ml-express-mobile-app)

#### 主要功能
- 骑手登录
- 任务管理
- 地图导航
- 包裹扫描

#### 技术栈
- React Native + Expo
- Supabase 客户端
- React Native Maps
- Expo Camera
- AsyncStorage

#### 关键文件
- `screens/LoginScreen.tsx` - 登录页面
- `screens/MapScreen.tsx` - 地图页面（包含智能路线优化）
- `screens/MyTasksScreen.tsx` - 任务页面
- `services/supabase.ts` - 数据库服务

#### 🎯 智能配送路线优化功能 (2025-01-18 新增)

**核心算法**：
- **取货点坐标解析** - 优先使用`sender_latitude`和`sender_longitude`
- **送货点坐标解析** - 优先使用`receiver_latitude`和`receiver_longitude`
- **完整路径计算** - 计算从当前位置到取货点，再到送货点的总距离
- **智能优先级排序** - 基于总距离和紧急程度进行优化排序

**地图显示增强**：
- **取货点标记** - 橙色📦标记显示所有取货点位置
- **送货点标记** - 蓝色数字标记显示所有送货点位置
- **分段路线显示** - 三种颜色的路线：
  - 🟢 **绿色粗线** - 从当前位置到第一个取货点
  - 🟠 **橙色中线** - 从取货点到送货点
  - 🔵 **蓝色细线** - 从送货点到下一个取货点

**包裹卡片优化**：
- **分离式信息展示** - 取货点和送货点分别用不同颜色背景显示
- **经纬度独立显示** - 经纬度单独一行，带有标签说明
- **地址独立显示** - 地址信息单独显示，便于阅读
- **距离信息详细** - 分别显示取货距离、送货距离和总距离

---

## 🗄️ 数据库架构

### 核心表结构

#### 数据表关系图
```
┌─────────────────────────────────────────────────────────────┐
│                    数据库表关系                              │
├─────────────────────────────────────────────────────────────┤
│  👥 users (客户表)                                          │
│     ├── id (主键)                                           │
│     ├── name, phone, email, address                        │
│     └── password, created_at                               │
│                                                             │
│  📦 packages (包裹表)                                       │
│     ├── id (主键)                                           │
│     ├── sender_*, receiver_* (发件人/收件人信息)            │
│     ├── sender_latitude, sender_longitude (发件人坐标)      │
│     ├── receiver_latitude, receiver_longitude (收件人坐标)   │
│     ├── description (包含 [客户ID: xxx] 标记)              │
│     ├── courier (关联 couriers.name)                        │
│     ├── status (待取件→已取件→配送中→已送达)                │
│     ├── delivery_speed (配送速度: 急送达/定时达)            │
│     ├── scheduled_delivery_time (定时配送时间)              │
│     └── pickup_time, delivery_time                         │
│                                                             │
│  🚚 couriers (快递员表)                                     │
│     ├── id (主键)                                           │
│     ├── name (关联 admin_accounts.employee_name)           │
│     ├── phone, email, address                              │
│     ├── status (active/inactive)                           │
│     └── last_active, total_deliveries                      │
│                                                             │
│  👨‍💼 admin_accounts (管理员账号表)                        │
│     ├── id (主键)                                           │
│     ├── username, password                                 │
│     ├── employee_name (关联 couriers.name)                 │
│     ├── position (骑手/骑手队长/管理员)                     │
│     └── role, status, last_login                           │
│                                                             │
│  📍 courier_locations (快递员位置表)                       │
│     ├── courier_id (关联 couriers.id)                      │
│     ├── latitude, longitude                                │
│     ├── heading, speed                                     │
│     └── last_update, battery_level                         │
└─────────────────────────────────────────────────────────────┘
```

#### packages (包裹表)
```sql
CREATE TABLE packages (
  id TEXT PRIMARY KEY,
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  sender_latitude DECIMAL(10,8), -- 发件人纬度
  sender_longitude DECIMAL(11,8), -- 发件人经度
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  receiver_latitude DECIMAL(10,8), -- 收件人纬度
  receiver_longitude DECIMAL(11,8), -- 收件人经度
  package_type TEXT NOT NULL,
  weight DECIMAL(5,2),
  description TEXT, -- 包含 [客户ID: xxx] 标记
  delivery_speed TEXT NOT NULL, -- 配送速度: 急送达/定时达
  scheduled_delivery_time TEXT, -- 定时配送时间
  status TEXT NOT NULL DEFAULT '待取件', -- 待取件→已取件→配送中→已送达
  courier TEXT, -- 关联 couriers.name
  pickup_time TEXT,
  delivery_time TEXT,
  transfer_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### couriers (快递员表)
```sql
CREATE TABLE couriers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- 关联 admin_accounts.employee_name
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  vehicle_type TEXT,
  license_number TEXT,
  status TEXT DEFAULT 'active', -- active/inactive
  join_date TEXT,
  last_active TEXT,
  total_deliveries INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### admin_accounts (管理员账号表)
```sql
CREATE TABLE admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  employee_name TEXT NOT NULL, -- 关联 couriers.name
  employee_id TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  department TEXT,
  position TEXT, -- 骑手/骑手队长/管理员
  role TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### users (客户表)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  password TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 安全配置

### 1. API Key 安全
- 使用环境变量存储敏感信息
- 在 Google Cloud Console 中设置适当的限制
- 定期轮换 API Key

### 2. 数据库安全
- 启用 Supabase RLS (Row Level Security)
- 使用适当的权限策略
- 定期备份数据

### 3. 部署安全
- 使用 HTTPS
- 设置适当的 CORS 策略
- 监控异常访问

---

## 📋 开发检查清单

### 更新 API Key 时
- [ ] 更新 `.env` 文件
- [ ] 更新 `vercel.json` 文件 (Vercel 生产环境)
- [ ] 更新 `netlify.toml` 文件 (Netlify 备用)
- [ ] 更新所有 Web 页面的 fallback
- [ ] 更新客户端APP的 `app.json`
- [ ] 更新员工APP的 `app.json`
- [ ] 更新 Vercel 环境变量 (生产环境)
- [ ] 更新 Netlify 环境变量 (备用)
- [ ] 测试所有地图功能
- [ ] 验证 Vercel 部署是否成功
- [ ] 验证 Netlify 部署是否成功

### 修复包裹分配问题时
- [ ] 检查 `admin_accounts.employee_name` 与 `couriers.name` 是否一致
- [ ] 验证移动端登录逻辑
- [ ] 检查包裹状态更新
- [ ] 测试 Web 端分配功能
- [ ] 验证移动端包裹显示

### 部署前检查
- [ ] 所有 API Key 配置正确
- [ ] 数据库连接正常
- [ ] Vercel 环境变量设置完整
- [ ] Netlify 环境变量设置完整 (备用)
- [ ] `vercel.json` 配置文件正确
- [ ] `netlify.toml` 配置文件正确
- [ ] 构建无错误
- [ ] 功能测试通过
- [ ] Vercel 部署成功
- [ ] Netlify 部署成功 (备用)

---

## 🆘 紧急修复指南

### Google Maps 完全失效
1. **立即检查**：
   - Google Cloud Console API Key 状态
   - 计费账户是否启用
   - API 服务是否启用

2. **快速修复**：
   - 更新所有配置文件中的 API Key
   - 重新部署 Web 应用
   - 重新构建移动应用

3. **验证修复**：
   - 访问 Web 应用地图页面
   - 测试移动应用地图功能
   - 检查控制台错误信息

### 包裹分配完全失效
1. **立即检查**：
   - 数据库连接状态
   - 用户身份匹配逻辑
   - 包裹状态更新

2. **快速修复**：
   - 检查 `LoginScreen.tsx` 中的身份存储逻辑
   - 验证 `RealTimeTracking.tsx` 中的分配逻辑
   - 测试移动端包裹过滤

3. **验证修复**：
   - Web 端分配包裹
   - 移动端查看任务列表
   - 检查数据库中的包裹状态

---

## 📞 联系信息

如有问题，请提供以下信息：
1. 具体的错误信息
2. 出现问题的页面/功能
3. 浏览器/设备信息
4. 控制台错误日志
5. 相关的配置文件内容

---

## 🏗️ 当前系统架构与连接方式 (2025年1月更新)

### 📍 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                    MARKET LINK EXPRESS                      │
│                    当前生产环境架构                          │
├─────────────────────────────────────────────────────────────┤
│  🌐 Web 管理后台 (React + TypeScript)                      │
│     ├── 主要部署: Netlify                                   │
│     │   └── URL: https://market-link-express.netlify.app   │
│     ├── 备用部署: Vercel                                    │
│     │   └── URL: https://ml-express.vercel.app             │
│     └── 代码仓库: GitHub (自动部署)                         │
├─────────────────────────────────────────────────────────────┤
│  📱 客户端 APP (React Native + Expo)                       │
│     ├── 开发状态: 开发中                                    │
│     ├── 部署方式: Expo EAS Build                           │
│     └── 包名: com.marketlinkexpress.client                 │
├─────────────────────────────────────────────────────────────┤
│  🚚 员工 APP (React Native + Expo)                         │
│     ├── 开发状态: 开发中                                    │
│     ├── 部署方式: Expo EAS Build                           │
│     └── 包名: com.marketlinkexpress.staff                  │
├─────────────────────────────────────────────────────────────┤
│  🗄️ 数据库 (Supabase PostgreSQL)                          │
│     ├── 项目: ML Express Production                        │
│     ├── URL: https://uopkyuluxnrewvlmutam.supabase.co     │
│     ├── 主要表: packages, couriers, users, admin_accounts  │
│     └── 实时同步: Web ↔ Mobile Apps                        │
├─────────────────────────────────────────────────────────────┤
│  🗺️ 地图服务 (Google Maps API)                            │
│     ├── API Key: AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c  │
│     ├── 服务: Maps JavaScript API, Places API, Geocoding   │
│     └── 限制: HTTP referer (Netlify/Vercel domains)        │
└─────────────────────────────────────────────────────────────┘
```

### 🔗 系统连接方式

#### 1. Web ↔ 数据库连接
```typescript
// src/services/supabase.ts
const supabaseUrl = 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

#### 2. Mobile Apps ↔ 数据库连接
```typescript
// ml-express-mobile-app/services/supabase.ts
// 使用相同的 Supabase 配置
```

#### 3. Web ↔ Google Maps 集成
```typescript
// src/pages/HomePage.tsx
const GOOGLE_MAPS_API_KEY = 'AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c';

// 地图坐标保存逻辑 (已修复)
const finalCoords = selectedLocation 
  ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
  : mapClickPosition;

if (finalCoords) {
  if (mapSelectionType === 'sender') {
    setSelectedSenderLocation(finalCoords);
  } else if (mapSelectionType === 'receiver') {
    setSelectedReceiverLocation(finalCoords);
  }
}
```

#### 4. Mobile Apps ↔ Google Maps 集成
```typescript
// ml-express-mobile-app/screens/MapScreen.tsx
// 使用相同的 API Key，通过环境变量配置
```

### 🚀 部署流程

#### Web 应用部署 (Netlify)
1. **自动部署**：
   ```bash
   git push origin main
   # Netlify 自动检测 GitHub 推送，触发构建
   ```

2. **手动部署**：
   ```bash
   npm run build
   # 将 build/ 目录上传到 Netlify
   ```

3. **环境变量配置**：
   ```toml
   # netlify.toml
   [context.production.environment]
   REACT_APP_GOOGLE_MAPS_API_KEY = "AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c"
   REACT_APP_SUPABASE_URL = "https://uopkyuluxnrewvlmutam.supabase.co"
   REACT_APP_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

#### Mobile Apps 部署 (Expo EAS Build)
1. **Android 部署**：
   ```bash
   cd ml-express-mobile-app
   eas build --platform android --profile production
   ```

2. **iOS 部署**：
   ```bash
   cd ml-express-mobile-app
   eas build --platform ios --profile production
   ```

### 🔧 关键修复记录

#### 1. 地图坐标保存修复 (2025-01-18)
**问题**：Web 端下单时，地图选择的坐标没有正确保存到数据库
**修复**：
- 修复 `HomePage.tsx` 中地图确认按钮的坐标获取逻辑
- 优先使用 `selectedLocation` (POI点击) 的坐标
- 确保 `receiver_latitude/longitude` 正确保存到 Supabase

#### 2. 骑手 App 导航一致性修复 (2025-01-18)
**问题**：骑手 App 导航目的地与客户下单位置不一致
**修复**：
- 优化 `MapScreen.tsx` 中的 `handleNavigate` 函数
- 直接使用数据库提供的精确坐标
- 如果坐标缺失，提示管理员补全而非使用 fallback geocoding

#### 4. 骑手App智能路线优化 (2025-01-18)
**功能**：优化骑手app配送路线算法，确保取货点和送货点都按最近路程规划
**实现**：
- 新增`getPickupCoordinates`和`getDeliveryCoordinates`函数
- 实现完整路径计算（当前位置→取货点→送货点）
- 优化地图显示：取货点橙色📦标记，送货点蓝色数字标记
- 分段路线显示：绿色（到取货点）、橙色（取货到送货）、蓝色（送货到下一取货点）
- 包裹卡片优化：分离式信息展示，经纬度独立显示

#### 5. 包裹卡片显示优化 (2025-01-18)
**功能**：优化骑手app地图页面包裹卡片显示，将经纬度和地址分开显示
**实现**：
- 取货点区域：黄色背景 + 橙色左边框
- 送货点区域：蓝色背景 + 蓝色左边框
- 经纬度容器：半透明白色背景，突出显示坐标
- 距离信息：分别显示取货距离、送货距离和总距离
- 提高操作便利性：经纬度独立显示，便于复制和使用

### 📊 数据流架构

```
客户下单流程:
Web HomePage → Google Maps API → 坐标选择 → Supabase packages 表
                ↓
实时跟踪页面 → 包裹分配 → 通知系统 → 骑手 App 接收

骑手配送流程:
骑手 App → 登录验证 → 任务列表 → 地图导航 → 状态更新 → Web 管理后台
```

### 🔐 安全配置

#### Google Maps API Key 限制
- **HTTP referer 限制**：
  - `https://market-link-express.netlify.app/*`
  - `https://ml-express.vercel.app/*`
  - `https://*.netlify.app/*` (预览环境)

#### Supabase RLS 策略
- **packages 表**：允许 `anon` 角色进行所有操作
- **couriers 表**：限制访问权限
- **admin_accounts 表**：管理员专用

### 📱 移动端配置

#### 环境变量
```bash
# ml-express-mobile-app/.env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCYXeFO2DGWHpDhbwOC7fusLyiwLy506_c
EXPO_PUBLIC_SUPABASE_URL=https://uopkyuluxnrewvlmutam.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 权限配置
```json
// ml-express-mobile-app/app.json
{
  "expo": {
    "permissions": [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "CAMERA",
      "MEDIA_LIBRARY"
    ]
  }
}
```

## 🚀 骑手App上线部署 (2025-10-19)

### 📱 部署信息

**项目名称**: MarketLinkStaffApp  
**EAS项目ID**: 9831d961-9124-46ed-8581-bf406616439f  
**构建ID**: ea5bac58-1669-4c66-aec6-9cfd2315341b  
**版本**: 1.0.0 (Build 1)  
**平台**: Android  
**状态**: ✅ 构建成功，已上线  

### 🔗 下载链接

**APK下载**: https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/builds/ea5bac58-1669-4c66-aec6-9cfd2315341b

### 🎯 核心功能

#### 1. 智能违规检测系统
- **位置违规检测**: 骑手在距离收件地址超过100米处完成配送时自动触发警报
- **照片违规检测**: 骑手完成配送但未上传照片时自动触发警报
- **实时监控**: 通过GPS定位和照片验证确保配送质量
- **自动警报**: 违规行为自动发送到"配送警报管理"页面

#### 2. 高级地图导航
- **Google Maps集成**: 使用最新API Key (AIzaSyCtf57YS_4-7meheIlUONuf0IPHYDcgilM)
- **智能路线规划**: 多包裹取货点和送货点最优路径计算
- **实时位置跟踪**: GPS定位和路线导航
- **坐标优先**: 优先使用经纬度坐标，地址作为备用

#### 3. 性能优化
- **内存管理**: 优化数据加载和缓存机制
- **网络优化**: 请求去重和错误处理
- **UI优化**: 紧凑的包裹卡片设计，减小字体和按钮尺寸
- **用户体验**: 加载状态、触觉反馈、下拉刷新

#### 4. 多语言支持
- **中英文切换**: 完整的多语言界面
- **动态翻译**: 所有UI元素支持实时语言切换
- **本地化存储**: 语言设置持久化保存

#### 5. 数据分析
- **个人统计**: 配送数据统计和分析
- **性能分析**: 详细的工作效率分析
- **违规记录**: 违规历史和处罚记录

### 🛠️ 技术实现

#### 违规检测逻辑
```typescript
// 位置违规检测
if (distance > 100) {
  // 创建位置违规警报
  const alertData = {
    package_id: packageId,
    courier_id: courierId,
    alert_type: 'location_violation',
    severity: 'high',
    title: '位置违规 - 距离收件地址过远',
    description: `骑手在距离收件地址 ${distance.toFixed(0)} 米处完成配送`,
    status: 'pending'
  };
}

// 照片违规检测
if (!photos || photos.length === 0) {
  // 创建照片违规警报
  const alertData = {
    package_id: packageId,
    courier_id: courierId,
    alert_type: 'photo_violation',
    severity: 'medium',
    title: '照片违规 - 未上传配送照片',
    description: '骑手完成配送但未上传配送照片',
    status: 'pending'
  };
}
```

#### 数据库表结构
- **delivery_alerts**: 配送警报表
- **courier_violations**: 骑手违规记录表
- **admin_audit_logs**: 管理员审计日志表
- **delivery_photos**: 配送照片表

### 📊 部署状态

| 组件 | 状态 | 部署平台 | 链接 |
|------|------|----------|------|
| Web管理后台 | ✅ 已上线 | Netlify | https://market-link-express.com |
| 骑手App | ✅ 已上线 | EAS Build | [APK下载链接](https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/builds/ea5bac58-1669-4c66-aec6-9cfd2315341b) |
| 客户端App | 🔄 待构建 | EAS Build | - |
| Staff App | 🔄 待构建 | EAS Build | - |

### 🎉 上线成果

1. **✅ 骑手App成功上线**: APK构建完成，可分发安装
2. **✅ 违规检测系统**: 自动监控配送质量，确保服务标准
3. **✅ 智能路线规划**: 优化配送效率，减少时间和成本
4. **✅ 实时位置跟踪**: GPS定位确保配送准确性
5. **✅ 多语言支持**: 中英文界面满足不同用户需求
6. **✅ 性能优化**: 流畅的用户体验和高效的数据处理

### 🔄 后续计划

1. **客户端App构建**: 为客户提供下单和跟踪功能
2. **Staff App构建**: 为员工提供管理功能
3. **iOS版本**: 构建iOS版本的骑手App
4. **功能增强**: 添加更多智能功能和数据分析
5. **用户反馈**: 收集使用反馈，持续优化体验

---

## 📅 2025年10月22日更新记录

### 🎯 今日完成功能

#### 1. 客户端App地址坐标集成
- **功能**: 在"立即下单"页面的地址输入框中集成经纬度显示
- **实现**: 地图选择位置后，坐标自动添加到地址文本中
- **格式**: `地址信息\n📍 坐标: 21.9438125, 96.1102195`
- **多语言**: 支持中文、英文、缅甸语坐标标签
- **数据提取**: 提交订单时自动提取纯地址，去除坐标信息

#### 2. 实时跟踪页面UI优化
- **包裹卡片状态管理**:
  - 未分配包裹：显示"🤖 自动分配"和"👤 手动分配"按钮
  - 已分配包裹：显示"✅ 已分配给: [员工编号]"状态信息
- **视觉区分**:
  - 未分配：蓝色背景 + 蓝色边框
  - 已分配：绿色背景 + 绿色边框
- **状态标签**: 根据分配状态动态调整颜色

#### 3. 经纬度数据流转验证
- **数据库验证**: 确认包裹表包含完整的经纬度字段
- **骑手App集成**: 验证坐标优先的定位逻辑正常工作
- **Google Maps集成**: 确保精确的GPS导航和路线规划
- **数据完整性**: 测试显示大部分包裹都有准确的坐标数据

#### 4. 客户端App地图功能修复
- **问题**: Android模拟器中地图显示空白
- **解决**: 恢复PROVIDER_GOOGLE配置，移除不必要的google-services.json
- **部署**: 重新构建APK文件，地图功能正常

#### 5. Supabase Token管理
- **Access Token**: 获得Supabase access token用于数据库操作
- **安全备份**: 备份所有配置文件，确保数据安全
- **权限验证**: 确认token权限和用途

### 🔧 技术实现细节

#### 地址坐标集成逻辑
```typescript
// 地图选择后构造地址+坐标文本
const addressWithCoords = `${finalAddress}\n📍 ${currentT.coordinates}: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

// 提交时提取纯地址
const extractAddress = (addressText: string) => {
  const lines = addressText.split('\n');
  return lines.filter(line => !line.includes('📍')).join('\n').trim();
};
```

#### 包裹分配状态判断
```typescript
// 已分配包裹显示状态信息
{pkg.courier && pkg.courier !== '未分配' ? (
  <div>✅ 已分配给: {pkg.courier}</div>
) : (
  <div>
    <button>🤖 自动分配</button>
    <button>👤 手动分配</button>
  </div>
)}
```

### 📊 当前部署状态

| 组件 | 状态 | 部署平台 | 链接 |
|------|------|----------|------|
| Web管理后台 | ✅ 已上线 | Netlify | https://market-link-express.com |
| 骑手App | ✅ 已上线 | EAS Build | [APK下载](https://expo.dev/artifacts/eas/i8tdxSg9GhZwd15KpdPDAe.apk) |
| 客户端App | ✅ 已上线 | EAS Build | [APK下载](https://expo.dev/artifacts/eas/i8tdxSg9GhZwd15KpdPDAe.apk) |
| Staff App | 🔄 待构建 | EAS Build | - |

### 🎉 今日成果

1. **✅ 客户端App功能完善**: 地址坐标集成，地图功能修复
2. **✅ 实时跟踪UI优化**: 包裹分配状态清晰显示
3. **✅ 经纬度数据验证**: 确保整个系统的坐标数据流转正常
4. **✅ Supabase权限管理**: 获得数据库操作权限
5. **✅ 多语言支持**: 坐标标签支持中英缅三语言
6. **✅ 经纬度显示功能完善**: 全系统经纬度显示统一优化

### 🔧 最新功能更新 (2025年10月23日)

#### 📍 经纬度显示功能全面优化

**1. Web端实时跟踪页面**
- ✅ 修复已分配包裹卡片不显示经纬度的问题
- ✅ 统一待分配和已分配包裹的经纬度显示格式
- ✅ 确保所有包裹卡片都显示完整的坐标信息

**2. 客户端App订单页面**
- ✅ 修复所有订单页面文件（MyOrdersScreen.tsx, OptimizedMyOrdersScreen.tsx, MyOrdersScreenOptimized.tsx）
- ✅ 添加明确的"经纬度："标签显示
- ✅ 统一订单列表和订单详情的经纬度显示格式

**3. 客户端App立即下单页面**
- ✅ 在取件地址和送达地址输入框下方添加经纬度显示
- ✅ 使用统一的经纬度容器样式设计
- ✅ 支持中英缅三语言环境

**4. 客户端App订单详情页面**
- ✅ 修复Package接口，添加经纬度字段定义
- ✅ 修复createPackage函数，确保经纬度数据正确保存到数据库
- ✅ 在寄件信息和收件信息卡片中添加明确的"经纬度："标签

**5. 骑手App地图页面**
- ✅ 修复包裹卡片分配状态显示
- ✅ 优化包裹加载逻辑，确保经纬度数据正确显示
- ✅ 完善取货点和送货点的坐标显示

#### 🎨 统一的经纬度显示样式

```typescript
// 统一的经纬度容器样式
coordsContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 8,
  backgroundColor: '#f0fdf4',  // 浅绿色背景
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
  borderLeftWidth: 3,
  borderLeftColor: '#059669',   // 绿色左边框
},
coordsLabel: {
  fontSize: 12,
  color: '#059669',            // 绿色文字
  fontWeight: '600',
  marginRight: 4,
},
coordsText: {
  fontSize: 12,
  color: '#059669',            // 绿色文字
  fontWeight: '500',
},
```

#### 🔄 完整的数据流转

**现在整个系统的经纬度显示已经完整**：

1. **客户端App立即下单** ✅ - 获取并保存经纬度
2. **数据库存储** ✅ - 正确保存经纬度字段
3. **客户端App订单列表** ✅ - 显示明确的"经纬度："标签
4. **客户端App订单详情** ✅ - 显示明确的"经纬度："标签
5. **Web端实时跟踪** ✅ - 显示包裹的经纬度
6. **骑手App接收** ✅ - 使用精确坐标进行导航
7. **Google Maps导航** ✅ - 使用坐标进行准确定位

### 🔄 后续计划

1. **Staff App构建**: 为员工提供管理功能
2. **iOS版本**: 构建iOS版本的移动应用
3. **功能增强**: 基于用户反馈持续优化
4. **数据库优化**: 利用Supabase access token进行数据库管理
5. **性能优化**: 优化地图加载和坐标解析性能

---

## 🔧 最新功能更新 (2025年10月24日)

### 📱 客户端App修复和优化

#### ✅ 已修复的问题

1. **🔍 追踪功能修复**
   - **问题**: 追踪页面查询订单号时显示"未找到订单"
   - **原因**: `trackOrder`方法尝试查询不存在的`sender_code`和`transfer_code`字段
   - **解决**: 修改为只查询`id`字段，使用`eq('id', trackingCode.trim())`
   - **测试**: 成功查询订单`MDY20251022211208`，返回完整订单信息

2. **📋 订单号复制功能修复**
   - **问题**: `@react-native-clipboard/clipboard`在Expo Go中不被支持
   - **解决**: 替换为`expo-clipboard`，使用`Clipboard.setStringAsync()`方法
   - **功能**: 在订单详情页面点击📋图标复制订单号到剪贴板

3. **🔧 依赖冲突问题解决**
   - **问题**: npm依赖版本冲突导致启动失败
   - **解决**: 使用`--legacy-peer-deps`安装依赖
   - **状态**: 客户端App现在可以正常启动

4. **🔔 通知服务优化**
   - **问题**: 通知服务在应用启动时导致错误
   - **解决**: 暂时注释掉通知服务的初始化和导入
   - **原因**: `expo-notifications`在Expo Go中功能受限

#### 🎯 当前功能状态

- ✅ **追踪页面**: 查询订单号正常工作
- ✅ **订单详情**: 复制订单号功能正常
- ✅ **依赖管理**: 版本冲突已解决
- ✅ **应用启动**: 客户端App成功启动
- ⚠️ **通知功能**: 暂时禁用（Expo Go限制）

#### 🔧 技术实现细节

**trackOrder方法优化**:
```typescript
// 修复前（有问题）
.or(`id.eq.${trackingCode},sender_code.eq.${trackingCode},transfer_code.eq.${trackingCode}`)

// 修复后（正常工作）
.eq('id', trackingCode.trim())
```

**剪贴板功能实现**:
```typescript
// 使用expo-clipboard
import * as Clipboard from 'expo-clipboard';

const copyOrderNumber = async () => {
  try {
    await Clipboard.setStringAsync(order?.id || '');
    showToast(t.copied, 'success');
  } catch (error) {
    console.error('复制订单号失败:', error);
    showToast('复制失败', 'error');
  }
};
```

#### 📊 测试结果

**追踪功能测试**:
- 查询订单号: `MDY20251022211208`
- 返回状态: 已送达
- 寄件人: 黄德伦 (09259369349)
- 收件人: hdl (0955546862)
- 价格: 2950 MMK
- 重量: 8 KG
- 配送员: AUNG AUNG

### 🚀 iOS Store上架准备

#### 📋 上架前检查清单

1. **✅ 应用功能完整性**
   - 客户端App核心功能正常
   - 追踪功能正常工作
   - 订单管理功能完整

2. **⚠️ 需要完善的功能**
   - 通知服务需要开发构建版本
   - 推送通知功能需要完整实现
   - 应用图标和启动画面优化

3. **🔧 技术准备**
   - EAS Build配置已就绪
   - 依赖管理已优化
   - 代码质量良好

---

*最后更新：2025年10月24日*
*版本：3.3.0*
*状态：生产环境运行中*
*新增功能：追踪功能修复 + 订单号复制功能 + 依赖问题解决 + iOS上架准备*
