pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
        maven { url = uri("https://oss.sonatype.org/content/repositories/snapshots/") }
    }
}

rootProject.name = "Myanmar Express"

// 主应用模块
include(":app")

// 核心模块
include(":core")
include(":core:common")
include(":core:database")
include(":core:network")
include(":core:ui")

// 功能模块
include(":feature")
include(":feature:auth")
include(":feature:order")
include(":feature:tracking")
include(":feature:profile")
include(":feature:payment")
include(":feature:location")

// 客户版特定模块
include(":feature:customer")
include(":feature:customer:home")
include(":feature:customer:order-management")

// 骑手版特定模块
include(":feature:courier")
include(":feature:courier:dashboard")
include(":feature:courier:task-execution")
include(":feature:courier:earnings")

// 数据模块
include(":data")
include(":data:model")
include(":data:repository")
include(":data:api")
include(":data:local")

// 领域模块
include(":domain")
include(":domain:usecase")
include(":domain:entity")

// 测试模块
include(":test")
include(":test:common")
include(":test:integration")
