# 任务列表：Market Link Express Android App

## 概述
本文档将 Android 应用开发分解为具体的可执行任务。按照阶段顺序完成，每个阶段的任务完成后才进入下一阶段。

**总计时间**：8-9 周  
**开始日期**：[待定]  
**目标发布日期**：[待定]

---

## 📋 第1周：项目基础搭建

### 环境准备
- [ ] 安装 Android Studio (最新稳定版)
- [ ] 配置 JDK 17
- [ ] 安装 Android SDK (API 26-34)
- [ ] 配置模拟器（API 26 和 API 34 各一个）

### 项目创建
- [ ] 使用 Android Studio 创建新项目
  - 选择 "Empty Compose Activity"
  - 语言：Kotlin
  - 最低 SDK：API 26
  - 包名：`com.marketlinkexpress.android`
- [ ] 配置 `build.gradle` 文件
  - 添加 Kotlin 版本 1.9+
  - 配置 Compose
  - 添加所有依赖库
- [ ] 同步 Gradle

### 项目结构
- [ ] 创建包结构
  ```
  └── com.marketlinkexpress.android
      ├── data
      ├── domain
      ├── presentation
      ├── di
      └── util
  ```
- [ ] 创建 `MLExpressApplication.kt`
- [ ] 配置 Hilt Application

### Supabase 配置
- [ ] 添加 Supabase Kotlin SDK 依赖
- [ ] 创建 `SupabaseClient.kt`
- [ ] 配置连接参数（URL 和 Key）
- [ ] 测试连接（编写简单测试）

### Git 设置
- [ ] 初始化 Git 仓库
  ```bash
  git init
  ```
- [ ] 添加 `.gitignore`
- [ ] 首次提交
  ```bash
  git add .
  git commit -m "Initial commit: Project setup"
  ```

---

## 📋 第2周：数据层实现

### 数据模型
- [ ] 创建 `data/model/` 目录
- [ ] 创建 `PackageEntity.kt`（Room 实体）
- [ ] 创建 `LocationEntity.kt`
- [ ] 创建 `UserEntity.kt`
- [ ] 创建 `domain/model/` 目录
- [ ] 创建 `Package.kt`（Domain 模型）
- [ ] 创建 `User.kt`
- [ ] 创建 `Location.kt`
- [ ] 创建数据转换扩展函数（Entity ↔ Domain）

### Room 数据库
- [ ] 创建 `data/local/dao/` 目录
- [ ] 创建 `PackageDao.kt`
  - `@Query` 获取所有包裹
  - `@Insert` 插入包裹
  - `@Update` 更新包裹
  - `@Delete` 删除包裹
- [ ] 创建 `LocationDao.kt`
- [ ] 创建 `UserDao.kt`
- [ ] 创建 `MLExpressDatabase.kt`（Database 类）
- [ ] 添加数据库版本管理和迁移

### 网络层
- [ ] 创建 `data/remote/` 目录
- [ ] 创建 `ApiService.kt`（Retrofit 接口）
  - 定义登录接口
  - 定义包裹相关接口
  - 定义位置上传接口
- [ ] 创建 `SupabaseApiService.kt`
- [ ] 创建网络拦截器
  - `AuthInterceptor.kt`（添加 Token）
  - `LoggingInterceptor.kt`（日志记录）

### Repository 实现
- [ ] 创建 `data/repository/` 目录
- [ ] 创建 `PackageRepositoryImpl.kt`
  - 实现获取包裹列表
  - 实现更新包裹状态
  - 实现本地缓存逻辑
- [ ] 创建 `UserRepositoryImpl.kt`
  - 实现登录
  - 实现保存用户信息
- [ ] 创建 `LocationRepositoryImpl.kt`
- [ ] 创建 `AuditLogRepositoryImpl.kt`

### 依赖注入
- [ ] 创建 `di/DatabaseModule.kt`
  - 提供 Room Database
  - 提供所有 DAO
- [ ] 创建 `di/NetworkModule.kt`
  - 提供 Retrofit
  - 提供 OkHttpClient
  - 提供 ApiService
- [ ] 创建 `di/RepositoryModule.kt`
  - 提供所有 Repository

### 单元测试
- [ ] 创建 `test/` 目录
- [ ] 测试 PackageRepository
- [ ] 测试 UserRepository
- [ ] Mock 数据库和网络层

---

## 📋 第3周：业务逻辑层

### Use Cases
- [ ] 创建 `domain/usecase/` 目录
- [ ] 创建 `LoginUseCase.kt`
  ```kotlin
  class LoginUseCase(private val repo: UserRepository) {
      suspend operator fun invoke(username: String, password: String): Result<User>
  }
  ```
- [ ] 创建 `GetPackagesUseCase.kt`
- [ ] 创建 `UpdatePackageStatusUseCase.kt`
- [ ] 创建 `UploadLocationUseCase.kt`
- [ ] 创建 `GetDashboardDataUseCase.kt`（管理员）
- [ ] 创建 `LogAuditUseCase.kt`

### 数据同步
- [ ] 创建 `data/sync/` 目录
- [ ] 创建 `SyncWorker.kt`（WorkManager）
  - 实现增量同步逻辑
  - 处理网络错误
  - 处理冲突（本地 vs 服务器）
- [ ] 配置 WorkManager 调度器
  - 每5分钟同步一次
  - 仅在有网络时执行

### 定位服务
- [ ] 创建 `service/` 目录
- [ ] 创建 `LocationService.kt`（Foreground Service）
  - 集成 FusedLocationProviderClient
  - 每30秒获取位置
  - 创建前台服务通知
  - 上传位置到服务器
- [ ] 添加低电量优化
  - 检测电量状态
  - 低电量时降低更新频率

### 权限管理
- [ ] 创建 `util/PermissionManager.kt`
- [ ] 实现定位权限请求逻辑
- [ ] 实现相机权限请求逻辑
- [ ] 实现通知权限请求逻辑

### 单元测试
- [ ] 测试所有 Use Cases
- [ ] 测试 SyncWorker
- [ ] Mock Repository 层

---

## 📋 第4周：UI - 认证与首页

### 主题与设计系统
- [ ] 创建 `presentation/theme/` 目录
- [ ] 创建 `Color.kt`
  - 定义主色调（蓝色）
  - 定义状态颜色（成功、警告、错误）
- [ ] 创建 `Typography.kt`
- [ ] 创建 `Theme.kt`（Material3 主题）
- [ ] 创建通用 Composable 组件
  - `LoadingIndicator.kt`
  - `ErrorView.kt`
  - `EmptyView.kt`

### 登录页面
- [ ] 创建 `presentation/login/` 目录
- [ ] 创建 `LoginScreen.kt`
  - 设计 UI（参考网页版）
  - Logo + 渐变背景
  - 用户名和密码输入框
  - 登录按钮
- [ ] 创建 `LoginViewModel.kt`
  - StateFlow for UI state
  - 调用 LoginUseCase
  - 处理错误
  - 记录审计日志
- [ ] 实现表单验证
- [ ] 添加加载状态

### 主页面框架
- [ ] 修改 `MainActivity.kt`
  - 设置 Compose 内容
  - 配置导航
- [ ] 创建 `presentation/navigation/` 目录
- [ ] 创建 `NavGraph.kt`
  - 定义所有路由
  - 配置 NavHost
- [ ] 创建底部导航栏
  - 首页 Tab
  - 地图 Tab
  - 我的 Tab

### 首页（快递员）
- [ ] 创建 `presentation/home/` 目录
- [ ] 创建 `HomeScreen.kt`
  - 顶部统计卡片（今日任务数、完成数）
  - 包裹列表
- [ ] 创建 `HomeViewModel.kt`
  - 获取今日包裹
  - 实现下拉刷新
  - 实现搜索
- [ ] 创建 `PackageListItem.kt`
  - 包裹卡片组件
  - 状态图标
  - 距离显示

### 导航集成
- [ ] 实现登录成功后跳转首页
- [ ] 实现底部导航切换
- [ ] 实现点击包裹跳转详情页

---

## 📋 第5周：包裹详情与状态更新

### 包裹详情页
- [ ] 创建 `presentation/package/` 目录
- [ ] 创建 `PackageDetailScreen.kt`
  - 顶部：包裹编号 + 状态标签
  - 中间：详细信息卡片
    - 收件人姓名和电话
    - 收件地址
    - 包裹类型、重量
    - 备注
  - 底部：操作按钮区域
- [ ] 创建 `PackageDetailViewModel.kt`
  - 加载包裹详情
  - 提供状态更新方法

### 状态更新功能
- [ ] 创建状态选择对话框
  - BottomSheet 或 Dialog
  - 选项：已取件、配送中、已送达、配送失败
- [ ] 创建配送失败原因输入对话框
- [ ] 实现状态更新逻辑
  - 调用 UpdatePackageStatusUseCase
  - 记录审计日志
  - 更新本地数据库
  - 同步到服务器
- [ ] 添加成功/失败提示（SnackBar）

### 照片上传
- [ ] 集成 CameraX
- [ ] 创建 `CameraScreen.kt`
  - 相机预览
  - 拍照按钮
  - 返回按钮
- [ ] 创建 `ImageCompressor.kt`
  - 压缩图片到 < 1MB
  - 调整分辨率
- [ ] 实现上传到 Supabase Storage
  - 生成唯一文件名
  - 上传文件
  - 保存 URL 到包裹记录

### 通信功能
- [ ] 实现一键拨号
  ```kotlin
  val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phoneNumber"))
  context.startActivity(intent)
  ```
- [ ] 实现一键导航
  ```kotlin
  val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=$address"))
  context.startActivity(intent)
  ```
- [ ] 添加复制地址功能

---

## 📋 第6周：地图与定位

### Google Maps 集成
- [ ] 申请 Google Maps API Key
- [ ] 添加到 `local.properties`
- [ ] 配置 `AndroidManifest.xml`
- [ ] 添加 Maps Compose 依赖

### 地图页面
- [ ] 创建 `presentation/map/` 目录
- [ ] 创建 `MapScreen.kt`
  - 全屏地图
  - 显示当前位置（蓝色标记）
  - 显示待配送包裹（红色标记）
- [ ] 创建 `MapViewModel.kt`
  - 获取当前位置
  - 获取包裹位置列表
  - 处理标记点击事件

### 定位权限请求
- [ ] 创建权限请求 Composable
- [ ] 显示权限说明对话框
  - "为什么需要定位权限"
  - "如何使用定位信息"
- [ ] 处理权限拒绝情况
  - 显示引导到设置页面的提示
- [ ] 实现 Android 10+ 后台定位权限请求

### 后台定位启动
- [ ] 在登录成功后启动 LocationService
- [ ] 创建前台服务通知
  - 标题："Market Link Express 正在运行"
  - 内容："正在后台更新位置"
  - 图标：定位图标
- [ ] 实现通知点击跳转到应用

### 位置上传
- [ ] 实现位置上传逻辑
  - 每30秒上传一次
  - 批量上传（积累5个点后上传）
  - 失败重试机制
- [ ] 本地存储位置历史
- [ ] 显示上传状态（UI反馈）

---

## 📋 第7周：管理员功能

### 角色检测
- [ ] 在登录后检查用户角色
- [ ] 根据角色显示不同首页
  - 快递员 → 包裹列表
  - 管理员/经理 → 仪表板

### 仪表板页面
- [ ] 创建 `presentation/dashboard/` 目录
- [ ] 创建 `DashboardScreen.kt`
  - 4个统计卡片
    - 总包裹数
    - 完成率
    - 在途包裹
    - 今日收入
  - 趋势图表（可选）
  - 快递员状态列表
- [ ] 创建 `DashboardViewModel.kt`
  - 获取统计数据
  - 实时刷新

### 包裹管理（管理员）
- [ ] 创建 `AllPackagesScreen.kt`
  - 显示所有包裹
  - 筛选（状态、日期）
  - 搜索
- [ ] 创建包裹创建表单
  - 输入发件人信息
  - 输入收件人信息
  - 选择快递员
  - 计算价格
- [ ] 实现分配快递员功能

### 快递员管理
- [ ] 创建 `CourierListScreen.kt`
  - 快递员列表
  - 在线/离线状态
  - 今日统计
- [ ] 创建 `CourierDetailScreen.kt`
  - 快递员信息
  - 实时位置（地图）
  - 当前任务列表
  - 历史统计

### 实时地图（管理员）
- [ ] 创建 `LiveMapScreen.kt`
  - 显示所有快递员位置
  - 不同颜色区分状态
    - 绿色：在线有任务
    - 蓝色：在线无任务
    - 灰色：离线
  - 点击标记显示快递员信息

---

## 📋 第8周：推送通知与优化

### Firebase 配置
- [ ] 创建 Firebase 项目
- [ ] 下载 `google-services.json`
- [ ] 添加到 `app/` 目录
- [ ] 配置 `build.gradle`

### FCM 集成
- [ ] 创建 `service/FCMService.kt`
  - 继承 FirebaseMessagingService
  - 实现 `onMessageReceived()`
  - 处理数据消息和通知消息
- [ ] 创建通知渠道
  ```kotlin
  NotificationChannel("default", "通知", IMPORTANCE_HIGH)
  ```
- [ ] 获取并上传 FCM Token

### 通知显示
- [ ] 创建通知构建器
- [ ] 设置通知图标、标题、内容
- [ ] 添加点击跳转
  - 新包裹通知 → 包裹详情
  - 系统消息 → 通知中心
- [ ] 测试推送通知

### 通知中心
- [ ] 创建 `presentation/notification/` 目录
- [ ] 创建 `NotificationListScreen.kt`
  - 通知列表
  - 未读标记
  - 删除功能
- [ ] 创建 `NotificationViewModel.kt`

### 性能优化
- [ ] 优化列表滚动性能
  - 使用 `key` 参数
  - 减少不必要的重组
- [ ] 优化图片加载
  - 配置 Coil 内存缓存
  - 图片占位符
  - 错误处理
- [ ] 减少内存占用
  - 使用 LeakCanary 检测内存泄漏
  - 修复发现的问题
- [ ] 优化数据库查询
  - 添加索引
  - 使用分页加载

### 离线支持
- [ ] 实现网络状态监听
- [ ] 离线时显示提示
- [ ] 离线操作本地缓存
- [ ] 恢复网络后自动同步

---

## 📋 第9周：测试与发布

### UI 测试
- [ ] 编写 Espresso 测试
  - 测试登录流程
  - 测试包裹列表显示
  - 测试状态更新
  - 测试导航
- [ ] 在模拟器上运行测试

### 真机测试
- [ ] 准备测试设备
  - Samsung (Android 12)
  - Xiaomi (Android 13)
  - Google Pixel (Android 14)
- [ ] 测试场景
  - [ ] 登录流程
  - [ ] 包裹列表和详情
  - [ ] 状态更新
  - [ ] 照片上传
  - [ ] 定位功能
  - [ ] 地图显示
  - [ ] 推送通知
  - [ ] 网络切换（WiFi ↔ 移动网络）
  - [ ] 低电量情况
  - [ ] 权限拒绝后重新授权
- [ ] 记录 bug 并修复

### 性能测试
- [ ] 使用 Android Profiler
  - CPU 使用率
  - 内存占用
  - 网络流量
  - 电池消耗
- [ ] 优化发现的问题

### 安全检查
- [ ] 检查敏感数据存储
- [ ] 检查网络通信（确保 HTTPS）
- [ ] 检查日志输出（生产环境不输出敏感信息）
- [ ] 代码混淆配置

### 发布准备
- [ ] 配置签名
  - 生成 Keystore
  - 配置 `build.gradle`
- [ ] 生成 Release APK
- [ ] 测试 Release 版本
- [ ] 准备应用商店资料
  - [ ] 应用图标（512x512）
  - [ ] 至少4张截图
    - 登录页
    - 包裹列表
    - 包裹详情
    - 地图页面
  - [ ] 应用描述（中文，500字以内）
  - [ ] 简短描述（80字以内）
  - [ ] 隐私政策页面（网页）
  - [ ] 分类：商业/工具
  - [ ] 内容分级

### Beta 测试
- [ ] 上传到 Google Play Console
- [ ] 创建内部测试轨道
- [ ] 邀请 5-10 名测试用户
  - 至少2名快递员
  - 1名管理员
  - 2-3名内部员工
- [ ] 收集反馈
- [ ] 迭代改进

### 正式发布
- [ ] 修复 Beta 测试发现的问题
- [ ] 更新版本号（1.0.0）
- [ ] 更新 Changelog
- [ ] 提交审核
- [ ] 等待审核通过
- [ ] 正式发布！🎉

---

## 📊 进度跟踪

### 完成统计
- 第1周：□□□□□□□□□□ 0/10
- 第2周：□□□□□□□□□□ 0/10
- 第3周：□□□□□□□□□□ 0/10
- 第4周：□□□□□□□□□□ 0/10
- 第5周：□□□□□□□□□□ 0/10
- 第6周：□□□□□□□□□□ 0/10
- 第7周：□□□□□□□□□□ 0/10
- 第8周：□□□□□□□□□□ 0/10
- 第9周：□□□□□□□□□□ 0/10

### 总体进度
**0% 完成** (0/90 主要任务)

---

## 📝 注意事项

1. **每周回顾**：每周五回顾进度，调整计划
2. **提交规范**：每完成一个功能模块就提交代码
3. **代码审查**：重要功能完成后进行代码审查
4. **文档更新**：遇到问题或变更时更新文档
5. **测试优先**：核心功能完成后立即编写测试

---

**最后更新**: 2025-09-30  
**创建者**: Spec-Driven Development  
**状态**: 待开始
