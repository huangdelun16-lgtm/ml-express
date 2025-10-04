# 技术实施计划：Market Link Express Android App

## 1. 技术方案

### 1.1 技术栈选择

#### 核心技术
- **开发语言**：Kotlin 1.9+
- **最低 Android 版本**：Android 8.0 (API 26)
- **目标 Android 版本**：Android 14 (API 34)
- **架构模式**：MVVM (Model-View-ViewModel)
- **依赖注入**：Hilt (Dagger)

#### 主要库和框架

**网络通信**
- `Retrofit 2.9+` - REST API 客户端
- `OkHttp 4.x` - HTTP 客户端
- `Gson` - JSON 解析
- `Supabase Kotlin Client` - 与 Supabase 集成

**数据库**
- `Room 2.6+` - 本地数据库（SQLite封装）
- `DataStore` - 本地设置存储（替代 SharedPreferences）

**UI 组件**
- `Jetpack Compose` - 现代UI工具包
- `Material3` - Material Design 3
- `Accompanist` - Compose 辅助库（权限、导航等）
- `Coil` - 图片加载

**地图与定位**
- `Google Maps SDK` - 地图显示
- `Google Location Services` - GPS 定位
- `WorkManager` - 后台定位任务

**异步处理**
- `Kotlin Coroutines` - 协程
- `Flow` - 数据流
- `LiveData / StateFlow` - 状态管理

**推送通知**
- `Firebase Cloud Messaging (FCM)` - 推送服务

**图片处理**
- `CameraX` - 相机功能
- `Compressor` - 图片压缩

**其他工具**
- `Timber` - 日志库
- `LeakCanary` - 内存泄漏检测（开发）
- `JUnit 5` + `MockK` - 单元测试
- `Espresso` - UI测试

### 1.2 架构设计

#### MVVM 架构层次

```
┌─────────────────────────────────────┐
│          Presentation Layer          │
│  (UI - Jetpack Compose + ViewModel)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Domain Layer                │
│      (Use Cases + Models)            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│           Data Layer                 │
│  (Repository + Data Sources)         │
│   - Remote (API)                     │
│   - Local (Room + DataStore)         │
└─────────────────────────────────────┘
```

#### 模块结构

```
app/
├── data/
│   ├── local/          # Room 数据库、DAO、DataStore
│   ├── remote/         # Retrofit API、网络模型
│   ├── repository/     # 数据仓库实现
│   └── model/          # 数据模型
├── domain/
│   ├── model/          # 业务模型
│   ├── repository/     # 仓库接口
│   └── usecase/        # 用例（业务逻辑）
├── presentation/
│   ├── login/          # 登录页面
│   ├── home/           # 首页
│   ├── package/        # 包裹相关页面
│   ├── map/            # 地图页面
│   ├── profile/        # 个人中心
│   └── dashboard/      # 管理员仪表板
├── di/                 # Hilt 依赖注入模块
├── util/               # 工具类
└── MainActivity.kt     # 主活动
```

### 1.3 API 集成

#### Supabase 客户端配置

```kotlin
object SupabaseClient {
    val instance: SupabaseClient by lazy {
        createSupabaseClient(
            supabaseUrl = "https://uopkyuluxnrewvlmutam.supabase.co",
            supabaseKey = "YOUR_ANON_KEY"
        ) {
            install(Auth)
            install(Postgrest)
            install(Storage)
            install(Realtime)
        }
    }
}
```

#### API 端点

**认证**
- `POST /auth/v1/token` - 登录
- `POST /auth/v1/logout` - 登出

**包裹**
- `GET /rest/v1/packages` - 获取包裹列表
- `GET /rest/v1/packages?id=eq.{id}` - 获取包裹详情
- `PATCH /rest/v1/packages?id=eq.{id}` - 更新包裹状态
- `POST /rest/v1/packages` - 创建包裹（管理员）

**位置**
- `POST /rest/v1/courier_locations` - 上传位置
- `GET /rest/v1/courier_locations` - 获取快递员位置（管理员）

**审计日志**
- `POST /rest/v1/audit_logs` - 记录操作日志

### 1.4 数据模型

#### Room 数据库表

```kotlin
@Entity(tableName = "packages")
data class PackageEntity(
    @PrimaryKey val id: String,
    val senderName: String,
    val senderPhone: String,
    val senderAddress: String,
    val receiverName: String,
    val receiverPhone: String,
    val receiverAddress: String,
    val packageType: String,
    val weight: String,
    val status: String,
    val courier: String,
    val price: String,
    val createTime: String,
    val pickupTime: String?,
    val deliveryTime: String?,
    val description: String?,
    val latitude: Double?,
    val longitude: Double?,
    val syncStatus: String, // "synced" | "pending" | "failed"
    val lastModified: Long
)

@Entity(tableName = "location_history")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val courierId: String,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long,
    val synced: Boolean
)

@Entity(tableName = "user")
data class UserEntity(
    @PrimaryKey val id: String,
    val username: String,
    val employeeName: String,
    val role: String,
    val token: String,
    val lastLogin: Long
)
```

## 2. 实施步骤

### 阶段1：项目基础搭建（第1周）

#### 任务清单
- [ ] **1.1** 创建 Android 项目
  - 使用 Android Studio 创建新项目
  - 配置 Kotlin 1.9+
  - 设置最低 API 26，目标 API 34

- [ ] **1.2** 配置依赖
  - 添加所有必需的依赖到 `build.gradle`
  - 配置 Hilt
  - 配置 Compose

- [ ] **1.3** 设置项目结构
  - 创建包结构（data, domain, presentation, di, util）
  - 创建基础文件（Application, MainActivity）

- [ ] **1.4** 配置 Supabase
  - 添加 Supabase Kotlin SDK
  - 配置连接参数
  - 测试连接

- [ ] **1.5** 设置 Git
  - 初始化 Git 仓库
  - 添加 .gitignore
  - 首次提交

### 阶段2：数据层实现（第2周）

#### 任务清单
- [ ] **2.1** 创建数据模型
  - 定义 Entity（Room 实体）
  - 定义 DTO（网络传输对象）
  - 定义 Domain Model

- [ ] **2.2** 实现本地数据库
  - 创建 DAO 接口
  - 创建 Database 类
  - 实现数据迁移策略

- [ ] **2.3** 实现网络层
  - 创建 API 接口（Retrofit）
  - 实现 Supabase 客户端
  - 添加网络拦截器（日志、认证）

- [ ] **2.4** 实现 Repository
  - PackageRepository
  - UserRepository
  - LocationRepository
  - AuditLogRepository

- [ ] **2.5** 配置依赖注入
  - 创建 Hilt 模块
  - 提供数据库实例
  - 提供网络实例

### 阶段3：业务逻辑层（第3周）

#### 任务清单
- [ ] **3.1** 创建 Use Cases
  - LoginUseCase
  - GetPackagesUseCase
  - UpdatePackageStatusUseCase
  - UploadLocationUseCase
  - GetDashboardDataUseCase

- [ ] **3.2** 实现数据同步
  - 创建 SyncWorker（WorkManager）
  - 实现增量同步逻辑
  - 处理冲突策略

- [ ] **3.3** 实现定位服务
  - 创建 LocationService（Foreground Service）
  - 实现后台定位
  - 添加电量优化

- [ ] **3.4** 单元测试
  - 测试 Use Cases
  - 测试 Repository
  - Mock 测试

### 阶段4：UI 实现 - 认证与首页（第4周）

#### 任务清单
- [ ] **4.1** 登录页面
  - 创建 LoginScreen Composable
  - 实现 LoginViewModel
  - 表单验证
  - 错误处理

- [ ] **4.2** 主页面框架
  - 创建 MainActivity
  - 实现底部导航栏
  - 配置导航图（Navigation Compose）

- [ ] **4.3** 首页（快递员）
  - 创建 HomeScreen
  - 实现 HomeViewModel
  - 显示今日统计
  - 显示包裹列表

- [ ] **4.4** 包裹列表组件
  - 创建 PackageListItem Composable
  - 实现下拉刷新
  - 实现上拉加载
  - 添加空状态/加载状态

### 阶段5：UI 实现 - 包裹详情（第5周）

#### 任务清单
- [ ] **5.1** 包裹详情页
  - 创建 PackageDetailScreen
  - 实现 PackageDetailViewModel
  - 显示完整信息
  - 状态标签

- [ ] **5.2** 状态更新功能
  - 状态选择对话框
  - 确认对话框
  - 更新动画
  - 审计日志记录

- [ ] **5.3** 照片上传
  - 集成 CameraX
  - 拍照功能
  - 图片压缩
  - 上传到 Supabase Storage

- [ ] **5.4** 通信功能
  - 一键拨号（Intent）
  - 一键导航（Google Maps Intent）
  - 复制地址

### 阶段6：UI 实现 - 地图与位置（第6周）

#### 任务清单
- [ ] **6.1** 地图页面
  - 集成 Google Maps Compose
  - 显示当前位置
  - 显示包裹位置标记

- [ ] **6.2** 定位权限
  - 请求定位权限
  - 权限说明对话框
  - 处理权限拒绝

- [ ] **6.3** 后台定位
  - 启动 LocationService
  - 前台服务通知
  - 定时上传位置

- [ ] **6.4** 轨迹显示
  - 绘制配送路线
  - 显示历史轨迹
  - 优化性能

### 阶段7：UI 实现 - 管理员功能（第7周）

#### 任务清单
- [ ] **7.1** 仪表板页面
  - 创建 DashboardScreen
  - 统计卡片组件
  - 图表显示（使用 MPAndroidChart）

- [ ] **7.2** 包裹管理
  - 包裹列表（所有包裹）
  - 创建包裹表单
  - 分配快递员

- [ ] **7.3** 快递员管理
  - 快递员列表
  - 实时位置地图
  - 工作统计

- [ ] **7.4** 通知中心
  - 通知列表
  - 未读标记
  - 点击跳转

### 阶段8：推送通知与优化（第8周）

#### 任务清单
- [ ] **8.1** FCM 集成
  - 配置 Firebase 项目
  - 添加 FCM SDK
  - 实现消息接收

- [ ] **8.2** 推送通知
  - 创建通知渠道
  - 显示通知
  - 处理点击事件

- [ ] **8.3** 性能优化
  - 图片缓存优化
  - 列表滚动优化
  - 减少重组（Compose）
  - 内存泄漏检测

- [ ] **8.4** 离线支持
  - 实现离线缓存
  - 网络状态监听
  - 离线提示

### 阶段9：测试与发布（第9周）

#### 任务清单
- [ ] **9.1** 测试
  - UI 测试（Espresso）
  - 集成测试
  - 真机测试（多品牌）

- [ ] **9.2** Bug 修复
  - 修复测试中发现的问题
  - 性能调优
  - 用户体验改进

- [ ] **9.3** 准备发布
  - 配置签名
  - 生成 Release APK
  - 准备应用商店资料

- [ ] **9.4** Beta 测试
  - 发布到内部测试
  - 收集反馈
  - 迭代改进

## 3. 关键代码示例

### 3.1 登录 ViewModel

```kotlin
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase,
    private val auditLogRepository: AuditLogRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun login(username: String, password: String) {
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            
            loginUseCase(username, password)
                .onSuccess { user ->
                    // 记录审计日志
                    auditLogRepository.log(
                        userId = user.username,
                        userName = user.employeeName,
                        actionType = "login",
                        module = "system",
                        actionDescription = "用户登录系统，角色：${user.role}"
                    )
                    
                    _uiState.value = LoginUiState.Success(user)
                }
                .onFailure { error ->
                    _uiState.value = LoginUiState.Error(error.message ?: "登录失败")
                }
        }
    }
}

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    data class Success(val user: User) : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}
```

### 3.2 包裹列表 Composable

```kotlin
@Composable
fun PackageListScreen(
    viewModel: PackageListViewModel = hiltViewModel(),
    onPackageClick: (Package) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val packages = uiState.packages
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("今日任务") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF2c5282)
                )
            )
        }
    ) { padding ->
        when {
            uiState.isLoading -> LoadingIndicator()
            uiState.error != null -> ErrorView(uiState.error!!)
            packages.isEmpty() -> EmptyView()
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                ) {
                    items(packages) { package ->
                        PackageListItem(
                            package = package,
                            onClick = { onPackageClick(package) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PackageListItem(
    package: Package,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp)
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 状态图标
            StatusIcon(status = package.status)
            
            Spacer(modifier = Modifier.width(16.dp))
            
            // 包裹信息
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = package.id,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "收件人：${package.receiverName}",
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = package.receiverAddress,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            
            // 距离（如果有）
            package.distance?.let {
                Chip(text = "$it km")
            }
        }
    }
}
```

### 3.3 后台定位服务

```kotlin
class LocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private val locationRequest = LocationRequest.create().apply {
        interval = 30000 // 30秒
        fastestInterval = 15000
        priority = LocationRequest.PRIORITY_HIGH_ACCURACY
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        startForegroundService()
    }

    private fun startForegroundService() {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Market Link Express")
            .setContentText("正在后台更新位置")
            .setSmallIcon(R.drawable.ic_location)
            .build()

        startForeground(1, notification)
    }

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { location ->
                uploadLocation(location.latitude, location.longitude)
            }
        }
    }

    private fun uploadLocation(lat: Double, lng: Double) {
        // 上传到服务器
        CoroutineScope(Dispatchers.IO).launch {
            locationRepository.uploadLocation(
                courierId = getCurrentUserId(),
                latitude = lat,
                longitude = lng
            )
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
```

## 4. 配置文件

### 4.1 build.gradle (Module: app)

```gradle
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
    id 'kotlin-kapt'
    id 'com.google.dagger.hilt.android'
    id 'com.google.gms.google-services'
}

android {
    namespace 'com.marketlinkexpress.android'
    compileSdk 34

    defaultConfig {
        applicationId "com.marketlinkexpress.android"
        minSdk 26
        targetSdk 34
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose true
    }

    composeOptions {
        kotlinCompilerExtensionVersion '1.5.3'
    }
}

dependencies {
    // Kotlin
    implementation "org.jetbrains.kotlin:kotlin-stdlib:1.9.10"
    
    // Android Core
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.10.0'
    
    // Jetpack Compose
    implementation platform('androidx.compose:compose-bom:2023.10.01')
    implementation 'androidx.compose.ui:ui'
    implementation 'androidx.compose.material3:material3'
    implementation 'androidx.compose.ui:ui-tooling-preview'
    implementation 'androidx.navigation:navigation-compose:2.7.5'
    implementation 'androidx.lifecycle:lifecycle-viewmodel-compose:2.6.2'
    
    // Hilt
    implementation "com.google.dagger:hilt-android:2.48"
    kapt "com.google.dagger:hilt-compiler:2.48"
    implementation 'androidx.hilt:hilt-navigation-compose:1.1.0'
    
    // Networking
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'
    
    // Supabase
    implementation 'io.github.jan-tennert.supabase:postgrest-kt:1.4.7'
    implementation 'io.github.jan-tennert.supabase:storage-kt:1.4.7'
    implementation 'io.github.jan-tennert.supabase:realtime-kt:1.4.7'
    
    // Room
    implementation "androidx.room:room-runtime:2.6.0"
    implementation "androidx.room:room-ktx:2.6.0"
    kapt "androidx.room:room-compiler:2.6.0"
    
    // DataStore
    implementation "androidx.datastore:datastore-preferences:1.0.0"
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    
    // Location
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    implementation 'com.google.android.gms:play-services-maps:18.2.0'
    implementation 'com.google.maps.android:maps-compose:4.3.0'
    
    // WorkManager
    implementation 'androidx.work:work-runtime-ktx:2.9.0'
    
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.5.0')
    implementation 'com.google.firebase:firebase-messaging-ktx'
    
    // Image Loading
    implementation 'io.coil-kt:coil-compose:2.5.0'
    
    // Camera
    implementation 'androidx.camera:camera-camera2:1.3.0'
    implementation 'androidx.camera:camera-lifecycle:1.3.0'
    implementation 'androidx.camera:camera-view:1.3.0'
    
    // Logging
    implementation 'com.jakewharton.timber:timber:5.0.1'
    
    // Testing
    testImplementation 'junit:junit:4.13.2'
    testImplementation 'io.mockk:mockk:1.13.8'
    testImplementation 'org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
    androidTestImplementation 'androidx.compose.ui:ui-test-junit4'
    debugImplementation 'androidx.compose.ui:ui-tooling'
    debugImplementation 'com.squareup.leakcanary:leakcanary-android:2.12'
}
```

### 4.2 AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- 权限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:name=".MLExpressApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.MLExpress"
        android:usesCleartextTraffic="false">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.MLExpress">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- 定位服务 -->
        <service
            android:name=".service.LocationService"
            android:foregroundServiceType="location"
            android:exported="false" />

        <!-- FCM 服务 -->
        <service
            android:name=".service.FCMService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <!-- Google Maps API Key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="${MAPS_API_KEY}" />

    </application>

</manifest>
```

## 5. 风险与对策

### 技术风险

| 风险 | 影响 | 概率 | 对策 |
|------|------|------|------|
| Supabase Kotlin SDK 不稳定 | 高 | 中 | 使用 Retrofit 直接调用 REST API |
| 后台定位耗电严重 | 高 | 高 | 优化定位策略，低电量时降频 |
| Compose 性能问题 | 中 | 中 | 优化重组，使用 remember、LaunchedEffect |
| Google Maps 配额限制 | 中 | 低 | 申请足够配额，考虑替代方案 |

### 开发风险

| 风险 | 影响 | 概率 | 对策 |
|------|------|------|------|
| 开发周期超时 | 高 | 中 | MVP 优先，功能分期实现 |
| 测试设备不足 | 中 | 低 | 使用模拟器 + 云测试服务 |
| API 变更 | 中 | 低 | 版本控制，向后兼容 |

## 6. 性能优化策略

### 6.1 网络优化
- 使用 OkHttp 缓存
- 图片压缩后上传
- 批量请求合并
- 离线优先策略

### 6.2 UI 优化
- LazyColumn 虚拟化
- 图片懒加载（Coil）
- 减少 Compose 重组
- 使用 derivedStateOf

### 6.3 电池优化
- 定位策略动态调整
- WorkManager 定时任务
- 低电量时暂停后台任务
- 批量上传位置数据

### 6.4 内存优化
- 及时释放资源
- 图片内存缓存限制
- 使用 LeakCanary 检测
- 避免内存泄漏（ViewModel、Coroutine）

## 7. 测试计划

### 7.1 单元测试
- Repository 层测试
- Use Case 测试
- ViewModel 测试
- 工具类测试

### 7.2 集成测试
- API 集成测试
- 数据库操作测试
- 定位服务测试

### 7.3 UI 测试
- 登录流程测试
- 包裹列表测试
- 状态更新测试
- 导航测试

### 7.4 真机测试
- 测试品牌：Samsung, Xiaomi, Huawei
- 测试场景：网络切换、低电量、权限拒绝
- 性能测试：CPU、内存、电池

## 8. 发布清单

### Play Store 准备
- [ ] 应用图标（512x512）
- [ ] 应用截图（至少4张）
- [ ] 应用说明（中文）
- [ ] 隐私政策链接
- [ ] 签名配置
- [ ] 混淆规则

### 审核材料
- [ ] 功能演示视频
- [ ] 测试账号（快递员 + 管理员）
- [ ] 数据隐私说明
- [ ] 权限使用说明

---

**创建日期**: 2025-09-30  
**创建者**: Spec-Driven Development  
**版本**: v1.0  
**预计完成时间**: 8-9周  
**技术负责人**: [待定]
