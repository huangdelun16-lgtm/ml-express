const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  const expoConfig = baseConfig.expo || {};
  
  // 优先从环境变量读取，如果没有则从 app.json 读取作为回退
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                           (expoConfig.ios && expoConfig.ios.config && expoConfig.ios.config.googleMapsApiKey) || 
                           '';

  return {
    ...baseConfig,
    expo: {
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
    },
  };
};

