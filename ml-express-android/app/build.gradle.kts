plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
    id("kotlin-parcelize")
    id("com.google.dagger.hilt.android")
    id("com.google.gms.google-services")
    id("com.google.android.libraries.mapsplatform.secrets-gradle-plugin")
}

android {
    namespace = "com.myanmarexpress.app"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // 缅甸本地化配置
        resConfigs("zh", "en", "my")
        
        // 默认构建配置字段
        buildConfigField("String", "BASE_URL", "\"https://api.myanmarexpress.com/\"")
        buildConfigField("String", "WEBSOCKET_URL", "\"wss://api.myanmarexpress.com\"")
        buildConfigField("boolean", "DEBUG_MODE", "false")
        buildConfigField("String", "APP_FLAVOR", "\"customer\"")
    }

    // 构建变体配置
    flavorDimensions += "version"
    productFlavors {
        create("customer") {
            dimension = "version"
            applicationId = "com.myanmarexpress.customer"
            versionNameSuffix = "-customer"
            
            // 客户版特定配置
            buildConfigField("String", "APP_FLAVOR", "\"customer\"")
            buildConfigField("String", "API_ENDPOINT", "\"customer\"")
            buildConfigField("boolean", "ENABLE_LOCATION_TRACKING", "false")
            buildConfigField("boolean", "ENABLE_ORDER_CREATION", "true")
            buildConfigField("boolean", "ENABLE_COURIER_FEATURES", "false")
            
            // 客户版资源
            resValue("string", "app_name", "缅甸快递")
            resValue("string", "app_name_english", "Myanmar Express")
            resValue("color", "app_primary_color", "#1976D2")
            
            // 客户版Manifest配置
            manifestPlaceholders["appIcon"] = "@mipmap/ic_launcher_customer"
            manifestPlaceholders["appTheme"] = "@style/Theme.MyanmarExpress.Customer"
        }
        
        create("courier") {
            dimension = "version"
            applicationId = "com.myanmarexpress.courier"
            versionNameSuffix = "-courier"
            
            // 骑手版特定配置
            buildConfigField("String", "APP_FLAVOR", "\"courier\"")
            buildConfigField("String", "API_ENDPOINT", "\"courier\"")
            buildConfigField("boolean", "ENABLE_LOCATION_TRACKING", "true")
            buildConfigField("boolean", "ENABLE_ORDER_CREATION", "false")
            buildConfigField("boolean", "ENABLE_COURIER_FEATURES", "true")
            
            // 骑手版资源
            resValue("string", "app_name", "骑手快递")
            resValue("string", "app_name_english", "Myanmar Express Courier")
            resValue("color", "app_primary_color", "#FF9800")
            
            // 骑手版Manifest配置
            manifestPlaceholders["appIcon"] = "@mipmap/ic_launcher_courier"
            manifestPlaceholders["appTheme"] = "@style/Theme.MyanmarExpress.Courier"
        }
    }

    buildTypes {
        debug {
            isDebuggable = true
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            
            buildConfigField("String", "BASE_URL", "\"https://dev-api.myanmarexpress.com/\"")
            buildConfigField("String", "WEBSOCKET_URL", "\"wss://dev-api.myanmarexpress.com\"")
            buildConfigField("boolean", "DEBUG_MODE", "true")
            buildConfigField("String", "LOG_LEVEL", "\"DEBUG\"")
            
            // 开发环境特定配置
            manifestPlaceholders["enableCrashlytics"] = false
            manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config_debug"
        }
        
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            
            buildConfigField("String", "BASE_URL", "\"https://api.myanmarexpress.com/\"")
            buildConfigField("String", "WEBSOCKET_URL", "\"wss://api.myanmarexpress.com\"")
            buildConfigField("boolean", "DEBUG_MODE", "false")
            buildConfigField("String", "LOG_LEVEL", "\"ERROR\"")
            
            // 生产环境特定配置
            manifestPlaceholders["enableCrashlytics"] = true
            manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config"
            
            // 签名配置
            signingConfig = signingConfigs.getByName("release")
        }
        
        create("staging") {
            initWith(getByName("debug"))
            isDebuggable = false
            applicationIdSuffix = ".staging"
            versionNameSuffix = "-staging"
            
            buildConfigField("String", "BASE_URL", "\"https://staging-api.myanmarexpress.com/\"")
            buildConfigField("String", "WEBSOCKET_URL", "\"wss://staging-api.myanmarexpress.com\"")
            buildConfigField("boolean", "DEBUG_MODE", "false")
            buildConfigField("String", "LOG_LEVEL", "\"INFO\"")
        }
    }

    // 签名配置
    signingConfigs {
        create("release") {
            storeFile = file("../keystore/myanmarexpress.keystore")
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "myanmarexpress123"
            keyAlias = System.getenv("KEY_ALIAS") ?: "myanmarexpress"
            keyPassword = System.getenv("KEY_PASSWORD") ?: "myanmarexpress123"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
        freeCompilerArgs += listOf(
            "-opt-in=kotlin.RequiresOptIn",
            "-opt-in=androidx.compose.material3.ExperimentalMaterial3Api",
            "-opt-in=androidx.compose.foundation.ExperimentalFoundationApi",
            "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi"
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
        viewBinding = false
        dataBinding = false
    }

    composeOptions {
        kotlinCompilerExtensionVersion = rootProject.extra["compose_version"] as String
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "/META-INF/DEPENDENCIES"
            excludes += "/META-INF/LICENSE"
            excludes += "/META-INF/LICENSE.txt"
            excludes += "/META-INF/license.txt"
            excludes += "/META-INF/NOTICE"
            excludes += "/META-INF/NOTICE.txt"
            excludes += "/META-INF/notice.txt"
            excludes += "/META-INF/ASL2.0"
        }
    }

    // Lint配置
    lint {
        abortOnError = false
        checkReleaseBuilds = true
        disable += setOf("MissingTranslation", "ExtraTranslation")
    }

    // 测试配置
    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:${rootProject.extra["compose_bom_version"]}")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    // Compose
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.runtime:runtime-livedata")
    implementation("androidx.compose.runtime:runtime-rxjava2")

    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:${rootProject.extra["lifecycle_version"]}")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.fragment:fragment-ktx:1.6.2")

    // Navigation
    implementation("androidx.navigation:navigation-compose:${rootProject.extra["navigation_version"]}")
    implementation("androidx.navigation:navigation-fragment-ktx:${rootProject.extra["navigation_version"]}")
    implementation("androidx.navigation:navigation-ui-ktx:${rootProject.extra["navigation_version"]}")

    // ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:${rootProject.extra["lifecycle_version"]}")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:${rootProject.extra["lifecycle_version"]}")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:${rootProject.extra["lifecycle_version"]}")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:${rootProject.extra["lifecycle_version"]}")

    // Hilt Dependency Injection
    implementation("com.google.dagger:hilt-android:${rootProject.extra["hilt_version"]}")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")
    implementation("androidx.hilt:hilt-work:1.1.0")
    kapt("com.google.dagger:hilt-compiler:${rootProject.extra["hilt_version"]}")
    kapt("androidx.hilt:hilt-compiler:1.1.0")

    // Network
    implementation("com.squareup.retrofit2:retrofit:${rootProject.extra["retrofit_version"]}")
    implementation("com.squareup.retrofit2:converter-gson:${rootProject.extra["retrofit_version"]}")
    implementation("com.squareup.retrofit2:adapter-rxjava2:${rootProject.extra["retrofit_version"]}")
    implementation("com.squareup.okhttp3:okhttp:${rootProject.extra["okhttp_version"]}")
    implementation("com.squareup.okhttp3:logging-interceptor:${rootProject.extra["okhttp_version"]}")
    implementation("com.squareup.okhttp3:okhttp-urlconnection:${rootProject.extra["okhttp_version"]}")

    // Room Database
    implementation("androidx.room:room-runtime:${rootProject.extra["room_version"]}")
    implementation("androidx.room:room-ktx:${rootProject.extra["room_version"]}")
    implementation("androidx.room:room-rxjava2:${rootProject.extra["room_version"]}")
    kapt("androidx.room:room-compiler:${rootProject.extra["room_version"]}")

    // WorkManager
    implementation("androidx.work:work-runtime-ktx:${rootProject.extra["work_version"]}")
    implementation("androidx.work:work-rxjava2:${rootProject.extra["work_version"]}")

    // Firebase
    implementation("com.google.firebase:firebase-messaging:23.4.0")
    implementation("com.google.firebase:firebase-analytics:21.5.0")
    implementation("com.google.firebase:firebase-crashlytics:18.6.1")
    implementation("com.google.firebase:firebase-perf:20.5.1")

    // Google Services
    implementation("com.google.android.gms:play-services-maps:18.2.0")
    implementation("com.google.android.gms:play-services-location:21.0.1")
    implementation("com.google.android.gms:play-services-auth:20.7.0")
    implementation("com.google.maps.android:maps-compose:4.3.0")

    // Image Loading and Processing
    implementation("io.coil-kt:coil-compose:2.5.0")
    implementation("io.coil-kt:coil-gif:2.5.0")
    implementation("io.coil-kt:coil-svg:2.5.0")

    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    implementation("androidx.datastore:datastore-preferences-rxjava2:1.0.0")

    // Permissions
    implementation("com.google.accompanist:accompanist-permissions:0.32.0")

    // System UI Controller
    implementation("com.google.accompanist:accompanist-systemuicontroller:0.32.0")

    // Splash Screen
    implementation("androidx.core:core-splashscreen:1.0.1")

    // Camera and QR Code
    implementation("androidx.camera:camera-camera2:1.3.1")
    implementation("androidx.camera:camera-lifecycle:1.3.1")
    implementation("androidx.camera:camera-view:1.3.1")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")

    // Socket.IO for real-time communication
    implementation("io.socket:socket.io-client:2.0.1") {
        exclude(group = "org.json", module = "json")
    }

    // Date and Time
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.0")

    // Gson for JSON parsing
    implementation("com.google.code.gson:gson:2.10.1")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")

    // Security
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Biometric Authentication
    implementation("androidx.biometric:biometric:1.1.0")

    // 构建变体特定依赖
    "customerImplementation"("androidx.compose.material:material-icons-core")
    "courierImplementation"("androidx.compose.material:material-icons-extended")
    "courierImplementation"("com.google.android.gms:play-services-maps:18.2.0")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.7.0")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.2.1")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("androidx.arch.core:core-testing:2.2.0")
    testImplementation("com.google.dagger:hilt-android-testing:${rootProject.extra["hilt_version"]}")
    kaptTest("com.google.dagger:hilt-compiler:${rootProject.extra["hilt_version"]}")

    // Android Testing
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation("androidx.test.espresso:espresso-intents:3.5.1")
    androidTestImplementation("androidx.test:runner:1.5.2")
    androidTestImplementation("androidx.test:rules:1.5.0")
    androidTestImplementation(platform("androidx.compose:compose-bom:${rootProject.extra["compose_bom_version"]}"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("com.google.dagger:hilt-android-testing:${rootProject.extra["hilt_version"]}")
    kaptAndroidTest("com.google.dagger:hilt-compiler:${rootProject.extra["hilt_version"]}")

    // Debug tools
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    debugImplementation("com.squareup.leakcanary:leakcanary-android:2.12")
}

// Allow references to generated code
kapt {
    correctErrorTypes = true
    useBuildCache = true
}

// Hilt configuration
hilt {
    enableAggregatingTask = true
}

// 自定义任务
tasks.register("generateVersionInfo") {
    doLast {
        val versionFile = file("src/main/assets/version.json")
        versionFile.parentFile.mkdirs()
        
        val versionInfo = mapOf(
            "versionName" to android.defaultConfig.versionName,
            "versionCode" to android.defaultConfig.versionCode,
            "buildTime" to System.currentTimeMillis(),
            "gitCommit" to getGitCommitHash(),
            "buildFlavor" to getCurrentFlavor()
        )
        
        versionFile.writeText(com.google.gson.Gson().toJson(versionInfo))
    }
}

// 在构建前生成版本信息
tasks.named("preBuild") {
    dependsOn("generateVersionInfo")
}

// 构建变体输出配置
android.applicationVariants.all {
    val variant = this
    val flavor = variant.flavorName
    val buildType = variant.buildType.name
    
    variant.outputs.all {
        val output = this as com.android.build.gradle.internal.api.BaseVariantOutputImpl
        val fileName = "MyanmarExpress-${flavor}-${buildType}-v${variant.versionName}.apk"
        output.outputFileName = fileName
    }
}

// 辅助函数
fun getGitCommitHash(): String {
    return try {
        val stdout = java.io.ByteArrayOutputStream()
        exec {
            commandLine("git", "rev-parse", "--short", "HEAD")
            standardOutput = stdout
        }
        stdout.toString().trim()
    } catch (e: Exception) {
        "unknown"
    }
}

fun getCurrentFlavor(): String {
    return project.gradle.startParameter.taskRequests
        .flatMap { it.args }
        .find { it.contains("customer", ignoreCase = true) || it.contains("courier", ignoreCase = true) }
        ?.let {
            when {
                it.contains("customer", ignoreCase = true) -> "customer"
                it.contains("courier", ignoreCase = true) -> "courier"
                else -> "unknown"
            }
        } ?: "unknown"
}
