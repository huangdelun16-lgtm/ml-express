# Myanmar Express Android 构建配置指南

## 项目概述

Myanmar Express Android项目采用单一代码库架构，通过Gradle构建变体生成客户版和骑手版两个独立的APK，实现代码复用的同时保持功能差异化。

## 🏗️ 构建变体配置

### 构建变体架构
```
Myanmar Express Android
├── 构建变体 (Product Flavors)
│   ├── customer (客户版)
│   └── courier (骑手版)
├── 构建类型 (Build Types)
│   ├── debug (开发版)
│   ├── staging (测试版)
│   └── release (发布版)
└── 最终输出 (6个变体)
    ├── customerDebug
    ├── customerStaging  
    ├── customerRelease
    ├── courierDebug
    ├── courierStaging
    └── courierRelease
```

### 构建变体配置详情

#### **客户版 (Customer)**
```kotlin
productFlavors {
    create("customer") {
        dimension = "version"
        applicationId = "com.myanmarexpress.customer"
        versionNameSuffix = "-customer"
        
        // 功能配置
        buildConfigField("boolean", "ENABLE_ORDER_CREATION", "true")
        buildConfigField("boolean", "ENABLE_COURIER_FEATURES", "false")
        buildConfigField("boolean", "ENABLE_LOCATION_TRACKING", "false")
        
        // 资源配置
        resValue("string", "app_name", "缅甸快递")
        resValue("color", "app_primary_color", "#1976D2")
        
        // Manifest配置
        manifestPlaceholders["appIcon"] = "@mipmap/ic_launcher_customer"
        manifestPlaceholders["appTheme"] = "@style/Theme.MyanmarExpress.Customer"
    }
}
```

#### **骑手版 (Courier)**
```kotlin
productFlavors {
    create("courier") {
        dimension = "version"
        applicationId = "com.myanmarexpress.courier"
        versionNameSuffix = "-courier"
        
        // 功能配置
        buildConfigField("boolean", "ENABLE_ORDER_CREATION", "false")
        buildConfigField("boolean", "ENABLE_COURIER_FEATURES", "true")
        buildConfigField("boolean", "ENABLE_LOCATION_TRACKING", "true")
        
        // 资源配置
        resValue("string", "app_name", "骑手快递")
        resValue("color", "app_primary_color", "#FF9800")
        
        // Manifest配置
        manifestPlaceholders["appIcon"] = "@mipmap/ic_launcher_courier"
        manifestPlaceholders["appTheme"] = "@style/Theme.MyanmarExpress.Courier"
    }
}
```

## 🎯 构建类型配置

### 1. Debug 构建类型
```kotlin
debug {
    isDebuggable = true
    isMinifyEnabled = false
    applicationIdSuffix = ".debug"
    versionNameSuffix = "-debug"
    
    buildConfigField("String", "BASE_URL", "\"https://dev-api.myanmarexpress.com/\"")
    buildConfigField("boolean", "DEBUG_MODE", "true")
    
    manifestPlaceholders["enableCrashlytics"] = false
    manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config_debug"
}
```

### 2. Staging 构建类型
```kotlin
staging {
    initWith(getByName("debug"))
    isDebuggable = false
    applicationIdSuffix = ".staging"
    versionNameSuffix = "-staging"
    
    buildConfigField("String", "BASE_URL", "\"https://staging-api.myanmarexpress.com/\"")
    buildConfigField("boolean", "DEBUG_MODE", "false")
}
```

### 3. Release 构建类型
```kotlin
release {
    isMinifyEnabled = true
    isShrinkResources = true
    proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    
    buildConfigField("String", "BASE_URL", "\"https://api.myanmarexpress.com/\"")
    buildConfigField("boolean", "DEBUG_MODE", "false")
    
    signingConfig = signingConfigs.getByName("release")
}
```

## 📦 模块化架构

### 模块结构
```
ml-express-android/
├── app/                          # 主应用模块
├── core/                         # 核心基础模块
│   ├── common/                   # 通用工具和扩展
│   ├── database/                 # 数据库配置
│   ├── network/                  # 网络层基础
│   └── ui/                       # UI组件库
├── data/                         # 数据层模块
│   ├── model/                    # 数据模型
│   ├── repository/               # 数据仓库
│   ├── api/                      # API接口
│   └── local/                    # 本地存储
├── domain/                       # 领域层模块
│   ├── usecase/                  # 用例
│   └── entity/                   # 领域实体
├── feature/                      # 功能模块
│   ├── auth/                     # 认证功能
│   ├── order/                    # 订单功能
│   ├── tracking/                 # 跟踪功能
│   ├── profile/                  # 个人中心
│   ├── payment/                  # 支付功能
│   ├── location/                 # 位置服务
│   ├── customer/                 # 客户版特定功能
│   └── courier/                  # 骑手版特定功能
└── test/                         # 测试模块
    ├── common/                   # 测试通用工具
    └── integration/              # 集成测试
```

### 模块依赖关系
```
app
 ├── feature:*
 ├── data
 └── domain
 
feature:*
 ├── domain
 ├── core:ui
 └── core:common
 
data
 ├── domain
 ├── core:network
 ├── core:database
 └── core:common
 
domain
 └── core:common
 
core:*
 └── (无依赖或最小依赖)
```

## 🔐 签名配置

### 1. Keystore文件结构
```
ml-express-android/keystore/
├── myanmarexpress.keystore              # 主签名文件
├── myanmarexpress-customer.keystore     # 客户版签名
├── myanmarexpress-courier.keystore      # 骑手版签名
├── keystore.properties                  # 签名配置（不提交到版本控制）
└── keystore.properties.template         # 配置模板
```

### 2. 签名配置示例
```kotlin
signingConfigs {
    create("release") {
        storeFile = file("../keystore/myanmarexpress.keystore")
        storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "myanmarexpress123"
        keyAlias = System.getenv("KEY_ALIAS") ?: "myanmarexpress"
        keyPassword = System.getenv("KEY_PASSWORD") ?: "myanmarexpress123"
    }
}
```

### 3. 环境变量配置
```bash
# 设置签名环境变量
export KEYSTORE_PASSWORD="your_keystore_password"
export KEY_ALIAS="your_key_alias"
export KEY_PASSWORD="your_key_password"

# Google Maps API Key
export MAPS_API_KEY="your_maps_api_key"

# Firebase配置
export FIREBASE_TOKEN="your_firebase_token"
```

## 🚀 构建和部署流程

### 1. 本地构建

#### **构建所有变体**
```bash
# 使用构建脚本
./scripts/build.sh all

# 或使用Gradle命令
./gradlew assembleDebug assembleRelease
```

#### **构建特定变体**
```bash
# 客户版
./scripts/build.sh customer
./gradlew assembleCustomerRelease

# 骑手版  
./scripts/build.sh courier
./gradlew assembleCourierRelease
```

### 2. 自动化部署

#### **部署到Firebase App Distribution**
```bash
# 部署所有版本
./scripts/deploy.sh firebase

# 部署特定版本
./scripts/deploy.sh customer firebase
./scripts/deploy.sh courier firebase
```

#### **部署到Google Play Console**
```bash
# 生成AAB文件
./gradlew bundleCustomerRelease
./gradlew bundleCourierRelease

# 部署到Play Console
./scripts/deploy.sh playstore
```

### 3. 持续集成配置

#### **GitHub Actions示例**
```yaml
name: Build and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 11
      uses: actions/setup-java@v3
      with:
        java-version: '11'
        distribution: 'temurin'
        
    - name: Setup Android SDK
      uses: android-actions/setup-android@v2
      
    - name: Build Customer Debug
      run: ./gradlew assembleCustomerDebug
      
    - name: Build Courier Debug  
      run: ./gradlew assembleCourierDebug
      
    - name: Run Tests
      run: ./gradlew test
      
    - name: Upload APKs
      uses: actions/upload-artifact@v3
      with:
        name: apks
        path: app/build/outputs/apk/**/*.apk
```

## 📊 构建优化配置

### 1. 性能优化

#### **Gradle配置**
```properties
# 内存优化
org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8

# 并行构建
org.gradle.parallel=true

# 构建缓存
org.gradle.caching=true

# 配置缓存
org.gradle.configuration-cache=true
```

#### **R8优化**
```kotlin
buildTypes {
    release {
        isMinifyEnabled = true
        isShrinkResources = true
        
        // R8全模式
        proguardFiles(
            getDefaultProguardFile("proguard-android-optimize.txt"),
            "proguard-rules.pro"
        )
    }
}
```

### 2. 依赖优化

#### **版本管理**
```kotlin
// 在根build.gradle.kts中统一版本管理
buildscript {
    extra["kotlin_version"] = "1.9.20"
    extra["compose_version"] = "1.5.5"
    extra["hilt_version"] = "2.48"
    extra["room_version"] = "2.6.1"
}
```

#### **构建变体特定依赖**
```kotlin
dependencies {
    // 客户版特定依赖
    "customerImplementation"("androidx.compose.material:material-icons-core")
    
    // 骑手版特定依赖
    "courierImplementation"("androidx.compose.material:material-icons-extended")
    "courierImplementation"("com.google.android.gms:play-services-maps")
}
```

## 🔧 开发工作流

### 1. 日常开发

#### **启动开发环境**
```bash
# 1. 克隆项目
git clone https://github.com/your-org/myanmar-express-android.git
cd myanmar-express-android

# 2. 配置签名（复制模板文件）
cp keystore/keystore.properties.template keystore/keystore.properties
# 编辑keystore.properties填入实际值

# 3. 配置API密钥
echo "MAPS_API_KEY=your_actual_api_key" >> local.properties

# 4. 构建Debug版本
./gradlew assembleDebug
```

#### **运行和调试**
```bash
# 安装客户版Debug
./gradlew installCustomerDebug

# 安装骑手版Debug
./gradlew installCourierDebug

# 运行测试
./gradlew test

# 生成测试报告
./gradlew jacocoTestReport
```

### 2. 版本发布

#### **准备发布**
```bash
# 1. 更新版本号
# 编辑app/build.gradle.kts中的versionName和versionCode

# 2. 更新版本说明
# 编辑CHANGELOG.md

# 3. 运行完整测试
./scripts/build.sh test

# 4. 构建Release版本
./scripts/build.sh all

# 5. 部署到测试环境
./scripts/deploy.sh all firebase
```

#### **发布到应用商店**
```bash
# 1. 构建AAB文件
./gradlew bundleCustomerRelease
./gradlew bundleCourierRelease

# 2. 上传到Google Play Console
./scripts/deploy.sh playstore

# 3. 配置发布轨道
# - Internal testing (内部测试)
# - Closed testing (封闭测试)  
# - Open testing (开放测试)
# - Production (正式发布)
```

## 📱 应用配置差异

### 1. 功能差异

| 功能模块 | 客户版 | 骑手版 |
|---------|--------|--------|
| 用户注册登录 | ✅ | ✅ |
| 创建订单 | ✅ | ❌ |
| 跟踪订单 | ✅ | ❌ |
| 接单管理 | ❌ | ✅ |
| 任务执行 | ❌ | ✅ |
| 位置跟踪 | ❌ | ✅ |
| 收入统计 | ❌ | ✅ |
| 支付功能 | ✅ | ❌ |

### 2. 权限差异

#### **客户版权限**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
```

#### **骑手版权限**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 3. 主题和颜色差异

#### **客户版主题**
- **主色调**: 蓝色 (#1976D2)
- **辅助色**: 绿色 (#4CAF50)
- **强调色**: 橙色 (#FFB300)

#### **骑手版主题**
- **主色调**: 橙色 (#FF9800)
- **辅助色**: 蓝色 (#2196F3)
- **强调色**: 绿色 (#4CAF50)

## 🛠️ 构建工具和脚本

### 1. 构建脚本 (build.sh)

#### **功能特性**
- ✅ **环境检查**: 自动检查Java、Android SDK、签名文件
- ✅ **清理构建**: 自动清理之前的构建文件
- ✅ **变体构建**: 支持单独或批量构建变体
- ✅ **测试运行**: 集成单元测试和集成测试
- ✅ **文件整理**: 自动整理和重命名APK文件

#### **使用示例**
```bash
# 构建所有版本
./scripts/build.sh all

# 仅构建客户版
./scripts/build.sh customer

# 运行测试
./scripts/build.sh test

# 清理项目
./scripts/build.sh clean
```

### 2. 部署脚本 (deploy.sh)

#### **功能特性**
- ✅ **多环境部署**: Firebase、Google Play Console、内部测试
- ✅ **APK验证**: 自动验证APK完整性和签名
- ✅ **版本说明**: 自动生成版本发布说明
- ✅ **批量部署**: 支持同时部署多个变体

#### **使用示例**
```bash
# 部署到Firebase App Distribution
./scripts/deploy.sh all firebase

# 部署到Google Play Console
./scripts/deploy.sh customer playstore

# 内部测试部署
./scripts/deploy.sh all internal
```

## 📋 构建输出

### 1. APK文件命名规则
```
MyanmarExpress-{flavor}-{buildType}-v{version}.apk

示例:
├── MyanmarExpress-customer-debug-v1.0.0.apk
├── MyanmarExpress-customer-release-v1.0.0.apk
├── MyanmarExpress-courier-debug-v1.0.0.apk
└── MyanmarExpress-courier-release-v1.0.0.apk
```

### 2. 构建产物结构
```
app/build/outputs/
├── apk/
│   ├── customer/
│   │   ├── debug/
│   │   └── release/
│   └── courier/
│       ├── debug/
│       └── release/
├── bundle/
│   ├── customerRelease/
│   └── courierRelease/
└── mapping/
    ├── customerRelease/
    └── courierRelease/
```

## 🔍 质量保证

### 1. 代码质量检查

```bash
# Lint检查
./gradlew lintCustomerRelease
./gradlew lintCourierRelease

# 代码覆盖率
./gradlew jacocoTestReport

# 依赖分析
./gradlew dependencyInsight
```

### 2. 自动化测试

```bash
# 单元测试
./gradlew testCustomerDebugUnitTest
./gradlew testCourierDebugUnitTest

# 集成测试
./gradlew connectedCustomerDebugAndroidTest
./gradlew connectedCourierDebugAndroidTest

# UI测试
./gradlew connectedAndroidTest
```

### 3. 性能分析

```bash
# APK分析
./gradlew analyzeCustomerReleaseBundle
./gradlew analyzeCourierReleaseBundle

# 构建性能分析
./gradlew assembleCustomerRelease --profile
```

## 🌍 国际化构建

### 1. 多语言资源
```
app/src/main/res/
├── values/           # 中文（默认）
├── values-en/        # 英文
└── values-my/        # 缅甸语
```

### 2. 语言特定构建
```kotlin
android {
    defaultConfig {
        // 指定支持的语言，减少APK大小
        resConfigs("zh", "en", "my")
    }
}
```

## 📈 构建监控和分析

### 1. 构建时间分析
```bash
# 构建性能分析
./gradlew assembleCustomerRelease --profile --build-cache

# 依赖解析时间
./gradlew assembleCustomerRelease --debug
```

### 2. APK大小分析
```bash
# APK分析器
./gradlew analyzeCustomerReleaseBundle

# 大小对比
./scripts/analyze_apk_size.sh
```

---

## ✅ **构建配置完成总结**

### 🎯 **完成的配置模块**

1. **✅ 构建变体配置** - 客户版/骑手版双变体
2. **✅ 模块化架构** - 清晰的模块依赖关系
3. **✅ 签名配置** - 安全的发布签名管理
4. **✅ 构建脚本** - 自动化构建和部署
5. **✅ 多环境支持** - 开发/测试/生产环境
6. **✅ 质量保证** - 完整的测试和检查流程

### 🏗️ **构建架构优势**

- **🔄 单一代码库**: 客户版和骑手版共享核心代码
- **📦 模块化设计**: 清晰的模块边界和依赖关系
- **⚡ 构建优化**: 并行构建、缓存、增量编译
- **🛡️ 安全签名**: 分离的签名配置和环境变量
- **🚀 自动化部署**: 一键构建和多平台部署
- **📊 质量监控**: 完整的测试和代码质量检查

### 🎉 **即可投产使用**

现在Myanmar Express Android项目具备：

- **完整的双变体构建系统**
- **专业的模块化架构**
- **安全的签名和发布配置**
- **自动化的构建和部署流程**
- **完善的质量保证体系**

**开发团队可以立即使用这套构建配置进行开发、测试和发布！** 🚀📱🏗️✨
