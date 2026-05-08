const baseConfig = require('./app.json');
const { withInfoPlist } = require('expo/config-plugins');

/** 兜底：避免 iOS 原生层报 NSLocation*UsageDescription 缺失（旧 prebuild / 合并异常） */
const IOS_LOCATION_PLIST_FALLBACK = {
  NSLocationWhenInUseUsageDescription:
    'MARKET LINK STAFF requires access to your location while using the app to show delivery routes on the map, provide navigation, and calculate the distance to destinations for accurate ETAs.',
  NSLocationAlwaysAndWhenInUseUsageDescription:
    'MARKET LINK STAFF requires continuous access to your location, even in the background, to sync your delivery progress in real-time with customers. This ensures customers can track their packages for safety and transparency throughout the delivery process.',
  NSLocationAlwaysUsageDescription:
    'MARKET LINK STAFF requires continuous access to your location, even in the background, to sync your delivery progress in real-time with customers. This ensures customers can track their packages for safety and transparency throughout the delivery process.',
};

/** 合并清单时必须剔除；勿依赖旧轨道上的包（如 versionCode 8）——需在 Play 各发布轨道用新 AAB 覆盖 */
const BLOCK_MEDIA_READ = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
];

/** 在 prebuild 阶段强制写入 Info.plist（仅靠 expo.ios.infoPlist 有时不会进最终原生工程） */
function withForceIosLocationUsageDescriptions(config) {
  const copy = IOS_LOCATION_PLIST_FALLBACK;
  return withInfoPlist(config, (c) => {
    const plist = c.modResults;
    const pick = (k) => {
      const v = plist[k];
      return typeof v === 'string' && v.trim() !== '' ? v : copy[k];
    };
    plist.NSLocationWhenInUseUsageDescription = pick('NSLocationWhenInUseUsageDescription');
    plist.NSLocationAlwaysAndWhenInUseUsageDescription = pick(
      'NSLocationAlwaysAndWhenInUseUsageDescription',
    );
    plist.NSLocationAlwaysUsageDescription = pick('NSLocationAlwaysUsageDescription');
    return c;
  });
}

/**
 * 敏感配置仅从环境变量注入（本地复制 .env.example → .env；EAS：Project secrets + EXPO_PUBLIC_*）
 */
module.exports = ({ config }) => {
  const expoConfig = baseConfig.expo || {};

  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    (expoConfig.android?.config?.googleMaps?.apiKey) ||
    (expoConfig.ios?.config?.googleMapsApiKey) ||
    '';

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const netlifyUrl =
    process.env.EXPO_PUBLIC_NETLIFY_URL ||
    'https://admin-market-link-express.netlify.app';

  const plugins = [...(expoConfig.plugins || [])];
  if (!plugins.some((p) => p === '@sentry/react-native/expo' || (Array.isArray(p) && p[0] === '@sentry/react-native/expo'))) {
    plugins.push('@sentry/react-native/expo');
  }
  if (!plugins.some((p) => p === withForceIosLocationUsageDescriptions)) {
    plugins.push(withForceIosLocationUsageDescriptions);
  }

  const baseInfoPlist = expoConfig.ios?.infoPlist || {};
  const backgroundModes = [
    ...new Set([
      'location',
      ...(Array.isArray(baseInfoPlist.UIBackgroundModes) ? baseInfoPlist.UIBackgroundModes : []),
    ]),
  ];

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
          apiKey: googleMapsApiKey,
        },
      },
    },
    ios: {
      ...(expoConfig.ios || {}),
      infoPlist: {
        ...baseInfoPlist,
        NSLocationWhenInUseUsageDescription:
          baseInfoPlist.NSLocationWhenInUseUsageDescription ||
          IOS_LOCATION_PLIST_FALLBACK.NSLocationWhenInUseUsageDescription,
        NSLocationAlwaysAndWhenInUseUsageDescription:
          baseInfoPlist.NSLocationAlwaysAndWhenInUseUsageDescription ||
          IOS_LOCATION_PLIST_FALLBACK.NSLocationAlwaysAndWhenInUseUsageDescription,
        NSLocationAlwaysUsageDescription:
          baseInfoPlist.NSLocationAlwaysUsageDescription ||
          IOS_LOCATION_PLIST_FALLBACK.NSLocationAlwaysUsageDescription,
        UIBackgroundModes: backgroundModes,
      },
      config: {
        ...(expoConfig.ios?.config || {}),
        googleMapsApiKey,
      },
    },
    extra: {
      eas: expoConfig.extra?.eas,
      supabaseUrl,
      supabaseAnonKey,
      netlifyUrl,
      googleMapsApiKey,
    },
  };
};
