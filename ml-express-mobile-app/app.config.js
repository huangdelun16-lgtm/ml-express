const baseConfig = require('./app.json');

/** 合并清单时必须剔除；勿依赖旧轨道上的包（如 versionCode 8）——需在 Play 各发布轨道用新 AAB 覆盖 */
const BLOCK_MEDIA_READ = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
];

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
      blockedPermissions: [
        ...new Set([
          ...(expoConfig.android?.blockedPermissions || []),
          ...BLOCK_MEDIA_READ,
        ]),
      ],
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

