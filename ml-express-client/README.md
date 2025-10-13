# 缅甸同城快递 - 客户端App

这是缅甸同城快递系统的客户端移动应用，专为普通用户设计。

## 功能特性

### 🏠 首页
- 服务介绍
- 快速下单入口
- 订单追踪入口
- 客服联系

### 📦 下单
- 填写寄件人信息
- 填写收件人信息
- 选择包裹类型和重量
- 选择配送速度（准时达、急送达、定时达）
- 自动价格计算
- 地图选择地址
- 生成订单二维码

### 📋 我的订单
- 查看所有订单
- 订单状态筛选
- 订单详情查看
- 取消未配送订单

### 🔍 订单追踪
- 扫描二维码追踪
- 输入订单号追踪
- 实时查看骑手位置
- 查看配送进度

### 👤 个人中心
- 用户信息管理
- 收货地址管理
- 语言设置（中文/English/ဗမာ）
- 联系客服
- 退出登录

## 技术栈

- **React Native** - 跨平台移动应用框架
- **Expo** - React Native开发工具
- **TypeScript** - 类型安全
- **React Navigation** - 导航管理
- **Supabase** - 后端服务
- **React Native Maps** - 地图集成
- **AsyncStorage** - 本地存储

## 开发指南

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm start
```

### 在Android设备上运行
```bash
npm run android
```

### 在iOS设备上运行
```bash
npm run ios
```

## 项目结构

```
ml-express-client/
├── src/
│   ├── screens/          # 页面组件
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── PlaceOrderScreen.tsx
│   │   ├── MyOrdersScreen.tsx
│   │   ├── TrackOrderScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── OrderDetailScreen.tsx
│   ├── contexts/         # React Context
│   │   └── AppContext.tsx
│   └── services/         # API服务
│       └── supabase.ts
├── assets/              # 图片资源
├── App.tsx             # 应用入口
├── app.json            # Expo配置
├── package.json        # 依赖管理
└── tsconfig.json       # TypeScript配置
```

## 与其他系统的关系

- **Web管理后台** (`src/`) - 管理员和经理使用
- **员工App** (`ml-express-mobile-app/`) - 快递员使用
- **客户端App** (`ml-express-client/`) - 普通客户使用（当前项目）

## 注意事项

1. 确保已配置正确的Supabase连接信息
2. 需要Google Maps API密钥用于地图功能
3. 需要在Expo配置中设置正确的bundle identifier
4. 确保设备已安装Expo Go应用（用于开发测试）

## 备份说明

在开始开发客户端App之前，已创建Git标签 `backup-before-client-app` 作为备份点。
如需恢复到开发客户端App之前的状态，可使用：
```bash
git checkout backup-before-client-app
```

