const baseConfig = require('./app.json');

/**
 * Maps/Places keys 从环境变量注入，避免明文写入仓库。
 * 本地：ml-express-client/.env
 * EAS：项目 Environment / Secrets 配置同名 EXPO_PUBLIC_* 变量
 */
module.exports = ({ config }) => {
  const expoConfig = { ...(config ?? baseConfig.expo ?? baseConfig) };

  const mapsKey = (
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
  const placesKey = (
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    mapsKey
  ).trim();

  return {
    ...expoConfig,
    ios: {
      ...(expoConfig.ios || {}),
      config: {
        ...((expoConfig.ios && expoConfig.ios.config) || {}),
        ...(mapsKey ? { googleMapsApiKey: mapsKey } : {}),
      },
    },
    android: {
      ...(expoConfig.android || {}),
      config: {
        ...((expoConfig.android && expoConfig.android.config) || {}),
        ...(mapsKey
          ? {
              googleMaps: {
                ...(((expoConfig.android &&
                  expoConfig.android.config &&
                  expoConfig.android.config.googleMaps) ||
                  {})),
                apiKey: mapsKey,
              },
            }
          : {}),
      },
    },
    extra: {
      ...(expoConfig.extra || {}),
      googleMapsApiKey: mapsKey || undefined,
      googlePlacesApiKey: placesKey || undefined,
    },
  };
};
