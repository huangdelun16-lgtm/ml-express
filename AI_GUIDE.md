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
│  3. 员工 APP (React Native + Expo)                         │
│     ├── 骑手登录                                            │
│     ├── 任务管理                                            │
│     ├── 地图导航                                            │
│     └── 包裹扫描                                            │
│     📱 部署: Expo EAS Build                                │
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

---

*最后更新：2025年1月18日*
*版本：2.1.0*
*状态：生产环境运行中*
*新增功能：骑手App智能路线优化 + 包裹卡片显示优化*
