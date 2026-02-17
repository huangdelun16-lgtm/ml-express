const fs = require('fs');
const path = require('path');

// 🚀 显式读取当前目录下的 app.json
const appJsonPath = path.join(__dirname, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const expoConfig = appJson.expo;

module.exports = ({ config }) => {
  // 优先从环境变量读取 API Key
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                           (expoConfig.extra && expoConfig.extra.googleMapsApiKey) || 
                           'AIzaSyDRhfmAILQk1L3pIUzLjcYG_Pf4HeY0XJI';

  const googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 
                            (expoConfig.extra && expoConfig.extra.googlePlacesApiKey) || 
                            'AIzaSyC952oez7KyjH9A_Ria4Grbgv2qkW7vCYk';

  // 🚀 强制覆盖版本号和构建号，确保与 app.json 一致
  const finalConfig = {
    ...expoConfig,
    version: expoConfig.version, // 确保使用 app.json 中的 2.2.2
    ios: {
      ...expoConfig.ios,
      buildNumber: expoConfig.ios.buildNumber, // 确保使用 47
      config: {
        ...(expoConfig.ios.config || {}),
        googleMapsApiKey,
      },
    },
    android: {
      ...expoConfig.android,
      versionCode: expoConfig.android.versionCode, // 确保使用 47
      config: {
        ...(expoConfig.android.config || {}),
        googleMaps: {
          ...(expoConfig.android.config?.googleMaps || {}),
          apiKey: googleMapsApiKey,
        },
      },
    },
    extra: {
      ...expoConfig.extra,
      googleMapsApiKey,
      googlePlacesApiKey,
    },
  };

  console.log('🚀 EAS Build Config:', {
    name: finalConfig.name,
    version: finalConfig.version,
    androidVersionCode: finalConfig.android.versionCode,
    iosBuildNumber: finalConfig.ios.buildNumber
  });

  return finalConfig;
};
