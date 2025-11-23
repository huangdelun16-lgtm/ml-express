const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const expoConfig = baseConfig.expo || {};

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

