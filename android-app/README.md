# ML Express - 缅甸同城快递客户版Android应用

## 项目概述

ML Express是一款专为缅甸本地快递服务设计的Android应用，采用现代化的技术栈和Material Design 3设计语言，提供完整的快递下单、跟踪和管理功能。

## 技术栈

- **开发语言**: Kotlin
- **UI框架**: Jetpack Compose
- **架构模式**: MVVM + Repository Pattern
- **依赖注入**: Hilt
- **网络请求**: Retrofit + OkHttp3
- **本地数据库**: Room
- **数据存储**: DataStore Preferences
- **后台任务**: WorkManager
- **推送通知**: Firebase Cloud Messaging
- **地图服务**: Google Maps SDK
- **定位服务**: Google Location Services
- **图片加载**: Coil

## 功能模块

### 1. 用户认证模块
- ✅ 缅甸手机号注册/登录（09xxxxxxxxx格式）
- ✅ OTP短信验证码验证
- ✅ 个人信息完善和管理
- ✅ 自动登录和会话管理
- ✅ JWT Token刷新机制

### 2. 首页和快捷操作
- ✅ 个性化欢迎界面
- ✅ 快捷下单入口（完整导航）
- ✅ 订单跟踪入口
- ✅ 最近订单展示（支持详情导航）
- ✅ 通知中心

### 3. 订单管理模块
- ✅ 订单列表（全部/进行中/已完成/已取消）
- ✅ 订单状态实时跟踪
- ✅ 订单详情查看（完整详情页面）
- ✅ 订单取消和评价（双重确认机制）
- ✅ 完整下单流程UI（包裹信息、服务选择、费用计算）
- ✅ 订单成功页面（多种后续操作）
- 🚧 地址选择和智能推荐（待实现）
- 🚧 实时运费计算API集成（待实现）
- 🚧 支付集成（待实现）

### 4. 跟踪模块
- ✅ 订单号搜索跟踪
- ✅ 完整跟踪结果展示（订单状态、地址信息、时间线）
- ✅ 配送员信息展示（姓名、车辆、评分）
- ✅ 物流时间线（状态更新历史）
- 🚧 实时位置地图显示（待实现）
- 🚧 预计送达时间计算（待实现）

### 5. 个人中心模块
- ✅ 个人信息管理
- ✅ 安全退出登录
- ✅ 支付方式管理（添加、删除、设置默认）
- ✅ 完整的菜单导航结构
- 🚧 常用地址管理（待实现）
- 🚧 订单历史统计（待实现）
- 🚧 设置和帮助中心（待实现）

## 项目结构

```
app/src/main/java/com/mlexpress/customer/
├── data/                           # 数据层
│   ├── local/                      # 本地数据
│   │   ├── dao/                    # Room DAO
│   │   ├── database/               # 数据库配置
│   │   └── preferences/            # DataStore偏好设置
│   ├── remote/                     # 远程数据
│   │   ├── api/                    # Retrofit API接口
│   │   └── dto/                    # 数据传输对象
│   ├── repository/                 # Repository实现
│   ├── model/                      # 数据模型
│   └── service/                    # 后台服务
├── di/                             # 依赖注入模块
├── presentation/                   # 表现层
│   ├── auth/                       # 认证相关UI
│   ├── home/                       # 首页UI
│   ├── orders/                     # 订单管理UI
│   ├── tracking/                   # 跟踪UI
│   ├── profile/                    # 个人中心UI
│   ├── main/                       # 主界面和导航
│   ├── splash/                     # 启动页
│   └── theme/                      # 主题配置
└── MLExpressApplication.kt         # 应用程序类
```

## 本地化支持

应用支持三种语言：
- **English** (en) - 默认语言
- **缅甸语** (my) - မြန်မာ
- **中文** (zh) - 简体中文

所有字符串资源都已完整本地化，包括：
- UI界面文本
- 错误消息
- 状态描述
- 帮助信息

## 数据持久化

### 本地数据库 (Room)
- **users表**: 用户信息
- **orders表**: 订单数据

### 偏好设置 (DataStore)
- 认证Token (Access/Refresh)
- 用户ID和基本设置
- 语言偏好
- 位置权限状态
- FCM推送Token

## 网络架构

### API端点
- **认证服务**: `/auth/*`
- **订单服务**: `/orders/*`
- **用户服务**: `/users/*`
- **跟踪服务**: `/tracking/*`

### 错误处理
- 统一的`NetworkResult`封装
- 自动Token刷新
- 离线模式支持
- 友好的错误提示

## 安全特性

- JWT Token认证
- 自动Token刷新
- 敏感数据加密存储
- 网络请求HTTPS
- 备份数据排除敏感信息

## 推送通知

支持多种推送类型：
- 订单状态更新
- 配送员位置更新
- 促销活动通知
- 系统消息

## 构建和运行

### 环境要求
- Android Studio Arctic Fox或更高版本
- Kotlin 1.9.20+
- Android SDK 34
- 最低支持Android 7.0 (API 24)

### 构建步骤

1. **克隆项目**
```bash
git clone [repository-url]
cd android-app
```

2. **配置API密钥**
在`local.properties`中添加：
```properties
MAPS_API_KEY=your_google_maps_api_key
```

3. **Firebase配置**
- 在Firebase Console创建项目
- 下载`google-services.json`到`app/`目录
- 配置FCM推送服务

4. **构建应用**
```bash
./gradlew assembleDebug
```

### 构建变体
- **Debug**: 开发调试版本，启用日志
- **Release**: 生产发布版本，启用混淆

## 部署配置

### 服务器要求
- 支持RESTful API
- JWT认证服务
- 实时推送服务
- 地图和定位服务

### 环境变量
```kotlin
// BuildConfig中配置
BASE_URL = "https://api.mlexpress.com/"
DEBUG_MODE = false
```

## 性能优化

- Jetpack Compose性能最佳实践
- 图片懒加载和缓存
- 网络请求缓存策略
- 数据库查询优化
- 内存泄漏预防

## 测试策略

- 单元测试：ViewModel和Repository
- 集成测试：数据库和网络
- UI测试：关键用户流程
- 性能测试：启动时间和响应速度

## 发布计划

### v1.0.0 (当前版本)
- ✅ 基础认证功能
- ✅ 订单列表和查看
- ✅ 个人中心
- ✅ 多语言支持

### v1.1.0 (计划中)
- 🚧 完整下单流程
- 🚧 地图集成
- 🚧 支付集成
- 🚧 实时跟踪

### v1.2.0 (计划中)
- 🚧 离线模式增强
- 🚧 性能优化
- 🚧 用户体验改进

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

版权所有 © 2024 ML Express. 保留所有权利。

---

**联系方式**
- 项目维护者：ML Express Team
- 邮箱：dev@mlexpress.com
- 网站：https://mlexpress.com
