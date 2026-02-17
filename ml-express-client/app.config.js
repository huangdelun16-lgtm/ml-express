module.exports = ({ config }) => {
  // 🚀 使用 Expo 自动传入的 config (即 app.json 中的内容)
  // 这样可以确保版本号和构建号与 app.json 同步
  const expoConfig = config || {};
  
  // 优先从环境变量读取，如果没有则从 app.json 读取作为回退
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                           (expoConfig.extra && expoConfig.extra.googleMapsApiKey) || 
                           'AIzaSyDRhfmAILQk1L3pIUzLjcYG_Pf4HeY0XJI';

  const googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 
                            (expoConfig.extra && expoConfig.extra.googlePlacesApiKey) || 
                            'AIzaSyC952oez7KyjH9A_Ria4Grbgv2qkW7vCYk';

  // 返回最终配置
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
      googlePlacesApiKey,
    },
  };
};
