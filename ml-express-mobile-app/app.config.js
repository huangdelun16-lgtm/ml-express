// app.config.js - 使用环境变量配置 Expo 应用
// 此文件支持动态读取环境变量，比 app.json 更灵活

// 加载环境变量
require('dotenv').config();

module.exports = {
  expo: {
    name: "ML Express Staff",
    slug: "MarketLinkStaffApp",
    version: "1.0.0",
    scheme: "ml-express-staff",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#2c5282"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mlexpress.courier",
      infoPlist: {
        LSApplicationQueriesSchemes: [
          "comgooglemaps",
          "maps",
          "comgooglemaps",
          "maps"
        ],
        NSLocationWhenInUseUsageDescription: "需要获取您的位置来显示配送路线和导航",
        NSLocationAlwaysAndWhenInUseUsageDescription: "需要获取您的位置来提供实时配送服务",
        UIBackgroundModes: [
          "location",
          "location"
        ]
      },
      config: {
        // 直接使用 API key，避免构建时环境变量问题
        googleMapsApiKey: "AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#2c5282"
      },
      package: "com.mlexpress.courier",
      // versionCode 已由 EAS 自动管理（eas.json 中 autoIncrement: true）
      // 注意：完全移除 permissions 数组，所有权限由插件自动管理，避免 Manifest merger 冲突
      // expo-camera 会自动添加 CAMERA 权限
      // expo-location 会自动添加 ACCESS_FINE_LOCATION 和 ACCESS_COARSE_LOCATION
      // expo-media-library 会自动添加存储权限（根据 Android 版本自动选择）
      minSdkVersion: 23, // Android 6.0+，确保所有插件兼容
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      enableProguardInReleaseBuilds: true, // 启用代码混淆，生成 mapping.txt
      config: {
        googleMaps: {
          // 直接使用 API key，避免构建时环境变量问题
          // 注意：生产环境应该使用 EAS Secrets
          apiKey: "AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE"
        }
      }
    },
    extra: {
      eas: {
        projectId: "9831d961-9124-46ed-8581-bf406616439f"
      },
      // 环境变量（从 .env 文件读取，或从 EAS Secrets 获取）
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    },
    owner: "amt349",
    privacy: "public",
    privacyPolicy: "https://market-link-express.com/privacy-policy",
    plugins: [
      // 简化插件配置，避免 manifest merger 冲突
      // 权限说明会在运行时通过权限请求对话框显示
      "expo-camera",
      "expo-location",
      "expo-media-library"
    ],
    runtimeVersion: {
      policy: "appVersion"
    },
    updates: {
      url: "https://u.expo.dev/9831d961-9124-46ed-8581-bf406616439f"
    }
  }
};

