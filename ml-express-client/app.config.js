const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  const expoConfig = baseConfig.expo || {};
  
  // 优先从环境变量读取，如果没有则从 app.json 读取作为回退
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                           (expoConfig.extra && expoConfig.extra.googleMapsApiKey) || 
                           'AIzaSyDRhfmAILQk1L3pIUzLjcYG_Pf4HeY0XJI';

  const googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 
                            (expoConfig.extra && expoConfig.extra.googlePlacesApiKey) || 
                            'AIzaSyC952oez7KyjH9A_Ria4Grbgv2qkW7vCYk';

  // 🚀 关键修复：Expo app.config.js 应该返回 expo 对象本身的内容
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
      googlePlacesApiKey, // 专门用于搜索的无限制 Key
    },
  };
};
