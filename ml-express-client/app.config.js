const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  const expoConfig = baseConfig.expo || {};
  
  // 优先从环境变量读取，如果没有则从 app.json 读取作为回退
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                           (expoConfig.ios && expoConfig.ios.config && expoConfig.ios.config.googleMapsApiKey) || 
                           '';

  // 🚀 关键修复：Expo app.config.js 应该返回 expo 对象本身的内容，而不是包含 "expo" 键的对象
  // 之前的逻辑返回了 { expo: { ... } }，导致 EAS 无法正确读取版本号和构建号
  return {
    ...expoConfig,
    ios: {
      ...(expoConfig.ios || {}),
      config: {
        ...((expoConfig.ios && expoConfig.ios.config) || {}),
        googleMapsApiKey,
      },
    },
    android: {
      ...(expoConfig.android || {}),
      config: {
        ...((expoConfig.android && expoConfig.android.config) || {}),
        googleMaps: {
          ...(((expoConfig.android &&
            expoConfig.android.config &&
            expoConfig.android.config.googleMaps) ||
            {})),
          apiKey: googleMapsApiKey,
        },
      },
    },
    extra: {
      ...(expoConfig.extra || {}),
      googleMapsApiKey,
    },
  };
};
