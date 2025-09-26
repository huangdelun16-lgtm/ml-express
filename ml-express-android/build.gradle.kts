// Top-level build file where you can add configuration options common to all sub-projects/modules.
buildscript {
    extra["kotlin_version"] = "1.9.20"
    extra["compose_version"] = "1.5.5"
    extra["compose_bom_version"] = "2023.10.01"
    extra["hilt_version"] = "2.48"
    extra["room_version"] = "2.6.1"
    extra["retrofit_version"] = "2.9.0"
    extra["okhttp_version"] = "4.12.0"
    extra["work_version"] = "2.9.0"
    extra["lifecycle_version"] = "2.7.0"
    extra["navigation_version"] = "2.7.5"
    
    dependencies {
        classpath("com.android.tools.build:gradle:8.2.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${extra["kotlin_version"]}")
        classpath("com.google.dagger:hilt-android-gradle-plugin:${extra["hilt_version"]}")
        classpath("com.google.gms:google-services:4.4.0")
        classpath("com.google.android.libraries.mapsplatform.secrets-gradle-plugin:secrets-gradle-plugin:2.0.1")
    }
}

plugins {
    id("com.android.application") version "8.2.0" apply false
    id("com.android.library") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
    id("org.jetbrains.kotlin.jvm") version "1.9.20" apply false
    id("com.google.dagger.hilt.android") version "2.48" apply false
    id("com.google.gms.google-services") version "4.4.0" apply false
    id("kotlin-parcelize") apply false
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
        maven { url = uri("https://oss.sonatype.org/content/repositories/snapshots/") }
    }
}

tasks.register("clean", Delete::class) {
    delete(rootProject.buildDir)
}
