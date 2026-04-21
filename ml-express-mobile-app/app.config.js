const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  const expoConfig = baseConfig.expo || {};
  
  // 🚀 核心修复：确保从环境变量或 app.json 中获取正确的 Key
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                           (expoConfig.android && expoConfig.android.config && expoConfig.android.config.googleMaps && expoConfig.android.config.googleMaps.apiKey) ||
                           (expoConfig.ios && expoConfig.ios.config && expoConfig.ios.config.googleMapsApiKey) ||
                           '';

  const plugins = [...(expoConfig.plugins || [])];
  if (!plugins.some((p) => p === '@sentry/react-native/expo' || (Array.isArray(p) && p[0] === '@sentry/react-native/expo'))) {
    plugins.push('@sentry/react-native/expo');
  }

  return {
    ...expoConfig,
    plugins,
    android: {
      ...(expoConfig.android || {}),
      config: {
        ...(expoConfig.android?.config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey
        }
      }
    },
    ios: {
      ...(expoConfig.ios || {}),
      config: {
        ...(expoConfig.ios?.config || {}),
        googleMapsApiKey: googleMapsApiKey
      }
    },
    extra: {
      ...(expoConfig.extra || {}),
      googleMapsApiKey
    }
  };
};

