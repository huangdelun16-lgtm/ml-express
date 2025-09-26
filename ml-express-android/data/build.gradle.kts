plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
    id("kotlin-parcelize")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.myanmarexpress.data"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
        targetSdk = 34

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")

        // Room schema export
        kapt {
            arguments {
                arg("room.schemaLocation", "$projectDir/schemas")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    // Core module
    implementation(project(":core"))

    // Room Database
    api("androidx.room:room-runtime:${rootProject.extra["room_version"]}")
    api("androidx.room:room-ktx:${rootProject.extra["room_version"]}")
    api("androidx.room:room-rxjava2:${rootProject.extra["room_version"]}")
    kapt("androidx.room:room-compiler:${rootProject.extra["room_version"]}")

    // Network
    api("com.squareup.retrofit2:retrofit:${rootProject.extra["retrofit_version"]}")
    api("com.squareup.retrofit2:converter-gson:${rootProject.extra["retrofit_version"]}")
    api("com.squareup.okhttp3:okhttp:${rootProject.extra["okhttp_version"]}")
    api("com.squareup.okhttp3:logging-interceptor:${rootProject.extra["okhttp_version"]}")

    // DataStore
    api("androidx.datastore:datastore-preferences:1.0.0")

    // WorkManager
    api("androidx.work:work-runtime-ktx:${rootProject.extra["work_version"]}")

    // Socket.IO
    api("io.socket:socket.io-client:2.0.1") {
        exclude(group = "org.json", module = "json")
    }

    // Security
    api("androidx.security:security-crypto:1.1.0-alpha06")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.7.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("androidx.room:room-testing:${rootProject.extra["room_version"]}")
    
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
