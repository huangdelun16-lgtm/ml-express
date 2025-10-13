# 客户端App开发设置指南

## ✅ 已完成的工作

### 1. 项目备份
- 创建了Git标签 `backup-before-client-app`
- 可以通过以下命令恢复到开发客户端App之前的状态：
  ```bash
  git checkout backup-before-client-app
  ```

### 2. 客户端App基础架构
已在 `ml-express-client/` 目录下创建了完整的React Native Expo项目：

#### 📁 项目结构
```
ml-express-client/
├── src/
│   ├── screens/              # 页面组件
│   │   ├── HomeScreen.tsx          ✅ 完成（首页）
│   │   ├── LoginScreen.tsx         ✅ 完成（登录）
│   │   ├── RegisterScreen.tsx      ✅ 完成（注册）
│   │   ├── PlaceOrderScreen.tsx    🔄 占位符（下单）
│   │   ├── MyOrdersScreen.tsx      🔄 占位符（我的订单）
│   │   ├── TrackOrderScreen.tsx    🔄 占位符（追踪订单）
│   │   ├── ProfileScreen.tsx       ✅ 完成（个人中心）
│   │   └── OrderDetailScreen.tsx   🔄 占位符（订单详情）
│   ├── contexts/
│   │   └── AppContext.tsx          ✅ 完成（语言设置等）
│   └── services/
│       └── supabase.ts             ✅ 完成（API服务）
├── App.tsx                          ✅ 完成（应用入口）
├── app.json                         ✅ 完成（Expo配置）
├── package.json                     ✅ 完成（依赖管理）
├── tsconfig.json                    ✅ 完成（TypeScript配置）
└── README.md                        ✅ 完成（项目说明）
```

#### 🎯 核心功能
1. **多语言支持** - 中文/English/缅甸语
2. **用户认证** - 注册/登录/登出
3. **底部导航** - 5个主要标签
4. **Supabase集成** - 完整的API服务

#### 📱 底部导航栏
- 🏠 首页 (Home) - ✅ 完成
- 📦 下单 (PlaceOrder) - 待开发
- 📋 我的订单 (MyOrders) - 待开发
- 🔍 追踪 (TrackOrder) - 待开发
- 👤 我的 (Profile) - ✅ 基础完成

## 🚀 下一步开发任务

### 优先级1：核心功能
1. **下单功能** (`PlaceOrderScreen.tsx`)
   - 寄件人信息表单
   - 收件人信息表单
   - 包裹类型选择
   - 配送速度选择
   - 地图选择地址
   - 价格自动计算
   - 提交订单

2. **我的订单** (`MyOrdersScreen.tsx`)
   - 订单列表显示
   - 状态筛选
   - 订单详情查看
   - 取消订单功能

3. **订单追踪** (`TrackOrderScreen.tsx`)
   - 扫码追踪
   - 输入订单号追踪
   - 地图显示骑手位置
   - 配送状态时间轴

### 优先级2：用户体验
1. **个人中心完善** (`ProfileScreen.tsx`)
   - 用户信息展示
   - 修改个人信息
   - 地址管理
   - 语言切换
   - 联系客服

2. **订单详情** (`OrderDetailScreen.tsx`)
   - 完整订单信息
   - QR码显示
   - 订单状态
   - 操作按钮

### 优先级3：增强功能
1. 收货地址簿
2. 常用联系人
3. 历史订单统计
4. 消息通知
5. 客服聊天

## 🛠️ 开发指南

### 安装依赖
```bash
cd ml-express-client
npm install
```

### 启动开发服务器
```bash
npm start
```

### 运行在设备上
```bash
# Android
npm run android

# iOS
npm run ios
```

### 数据库表需求
客户端App需要以下数据库表（可能需要创建）：

1. **customers** 表
   ```sql
   CREATE TABLE customers (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     phone VARCHAR(50) NOT NULL,
     password VARCHAR(255) NOT NULL,
     address TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **packages** 表（已存在，可能需要添加 customer_id 字段）
   ```sql
   ALTER TABLE packages ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
   ```

## 📝 注意事项

1. **Supabase配置**
   - URL和Key已配置在 `src/services/supabase.ts`
   - 需要确保数据库权限配置正确

2. **Google Maps API**
   - 下单和追踪功能需要Google Maps API
   - 需要在Expo配置中添加API Key

3. **推送通知**
   - 订单状态更新时需要推送通知
   - 需要配置Expo Push Notifications

4. **图片资源**
   - 需要准备以下图片：
     - `assets/icon.png` (1024x1024)
     - `assets/splash.png` (1242x2436)
     - `assets/adaptive-icon.png` (1024x1024)
     - `assets/favicon.png` (48x48)

## 🔒 安全性

1. **密码加密** - 建议在生产环境使用bcrypt加密
2. **API安全** - 考虑实现JWT令牌认证
3. **数据验证** - 所有表单输入需要严格验证

## 📊 项目状态

- ✅ 项目架构搭建完成
- ✅ 用户认证功能完成
- ✅ 首页UI完成
- 🔄 核心业务功能待开发
- 🔄 详细功能待完善

## 🎯 开发建议

1. 先完成下单功能，这是客户端最核心的功能
2. 然后实现我的订单和订单追踪
3. 最后完善个人中心和其他辅助功能
4. 每完成一个功能就测试并部署
5. 注意与Web端和员工App的数据一致性

---

**备份点**: `backup-before-client-app`  
**创建时间**: 2025-01-13  
**状态**: 🚧 开发中

