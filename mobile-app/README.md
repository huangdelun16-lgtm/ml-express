# ML Express Mobile App

ML Express 同城运输移动端应用，与网站系统完全同步。

## 🚀 功能特性

### 👥 多角色支持
- **客户端**: 直接下单、订单跟踪
- **骑手端**: 接单、签收、状态管理、GPS位置上传
- **财务端**: 财务记录查看、状态更新
- **管理端**: 用户管理、系统设置

### 📱 核心功能

#### 客户功能
- ✅ 在线下单（寄件人、收件人、物品信息）
- ✅ 费用自动计算（重量、加急、易碎品等）
- ✅ 订单历史查看
- ✅ 实时订单跟踪

#### 骑手功能
- ✅ 工作台（今日统计、在线状态管理）
- ✅ 订单管理（接单、取件确认、签收）
- ✅ GPS实时位置上传
- ✅ 一键导航和电话联系
- ✅ 扫码签收功能

#### 财务功能
- ✅ 财务记录查看
- ✅ 状态更新（待付费→已预付→已完成）
- ✅ 按状态筛选和搜索

#### 管理功能
- ✅ 用户管理
- ✅ 订单管理
- ✅ 系统设置

## 🛠️ 技术栈

- **框架**: React Native + Expo
- **导航**: React Navigation 6
- **UI库**: React Native Paper
- **状态管理**: React Context + Hooks
- **位置服务**: Expo Location
- **安全存储**: Expo SecureStore
- **网络请求**: Fetch API
- **图标**: Expo Vector Icons

## 📦 安装部署

### 1. 环境准备

```bash
# 安装 Node.js (推荐 16+)
# 安装 Expo CLI
npm install -g @expo/cli

# 安装依赖
cd mobile-app
npm install
```

### 2. 配置API地址

编辑 `src/services/api.ts`:

```typescript
const BASE_URL = 'https://your-domain.com/.netlify/functions';
```

### 3. 开发运行

```bash
# 启动开发服务器
npm start

# 在 iOS 模拟器运行
npm run ios

# 在 Android 模拟器运行
npm run android

# 在浏览器运行
npm run web
```

### 4. 构建发布

```bash
# 构建 Android APK
expo build:android

# 构建 iOS IPA
expo build:ios
```

## 📱 使用指南

### 首次使用

1. **下载安装**: 从应用商店下载或安装APK文件
2. **注册账户**: 选择用户类型（客户/骑手）进行注册
3. **权限授权**: 
   - 骑手需要授权位置权限（前台+后台）
   - 扫码功能需要相机权限

### 客户使用流程

1. **登录账户**: 使用用户名密码登录
2. **创建订单**: 
   - 填写寄件人和收件人信息
   - 描述物品并设置重量
   - 选择配送选项（加急、易碎等）
   - 确认费用并提交订单
3. **跟踪订单**: 在订单历史中查看配送状态

### 骑手使用流程

1. **上线工作**: 
   - 登录后在工作台点击"上线"
   - 开启位置服务
2. **接收订单**: 
   - 查看分配的订单
   - 联系寄件人确认取件
   - 点击"确认取件"更新状态
3. **配送过程**:
   - 使用导航功能前往目的地
   - 联系收件人确认签收
   - 扫码或手动确认签收
4. **下线休息**: 完成工作后点击"下线"

### 财务使用流程

1. **查看记录**: 浏览所有财务记录
2. **状态管理**: 
   - 将"待付费"订单标记为"已预付"
   - 将"待签收"订单标记为"已完成"
3. **搜索筛选**: 按运单号、客户名称或状态筛选

## 🔧 配置说明

### GPS定位配置

骑手端GPS功能配置：
- **更新频率**: 30秒或移动50米
- **上传频率**: 每分钟上传一次位置
- **精度要求**: 高精度GPS
- **后台运行**: 支持后台位置上传

### API接口配置

所有API接口与网站系统共享：
- `/users-manage`: 用户管理
- `/packages-manage`: 订单管理  
- `/riders-manage`: 骑手管理
- `/rider-location`: 位置服务
- `/finances-manage`: 财务管理

### 权限配置

Android权限：
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

## 🐛 故障排除

### 常见问题

1. **登录失败**
   - 检查网络连接
   - 确认API地址配置正确
   - 验证用户名密码

2. **GPS定位失败**
   - 确认已授权位置权限
   - 检查手机GPS开关
   - 在室外测试定位功能

3. **订单同步问题**
   - 检查网络连接
   - 手动下拉刷新
   - 重新登录应用

4. **扫码功能异常**
   - 确认已授权相机权限
   - 检查摄像头是否正常
   - 重启应用

### 日志调试

开发模式下查看控制台日志：
```bash
# 查看实时日志
expo logs
```

## 📞 技术支持

- **客服电话**: 400-888-0000
- **技术支持**: tech@mlexpress.com
- **用户反馈**: feedback@mlexpress.com

## 🔄 更新日志

### v1.0.0 (2024-01-01)
- ✅ 初始版本发布
- ✅ 多角色登录系统
- ✅ 客户下单功能
- ✅ 骑手工作台
- ✅ GPS实时定位
- ✅ 财务管理功能
- ✅ 与网站系统数据同步

## 📄 许可证

© 2024 ML Express. All rights reserved.
