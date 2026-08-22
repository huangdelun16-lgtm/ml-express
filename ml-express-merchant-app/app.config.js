const baseConfig = require('./app.json');
const fs = require('fs');
const path = require('path');

/** Expo 评估 app.config.js 时不一定已注入 .env，手动读一份保证 Maps / Supabase extra 有值 */
function loadLocalEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] == null) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore malformed .env
  }
}

loadLocalEnv();

/** 合并清单时必须剔除，避免 Play 以「照片/视频权限」拒审 */
const BLOCK_MEDIA_READ = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.RECORD_AUDIO',
];

/**
 * Maps/Places keys 从环境变量注入，避免明文写入仓库。
 * 本地：ml-express-merchant-app/.env
 * EAS：项目 Environment / Secrets 配置同名 EXPO_PUBLIC_* 变量
 */

/** Production native builds bake absolute /__sb (Myanmar-reachable). Local expo start keeps env. */
const NATIVE_SB_PROXY_URL = 'https://mlexpress-merchants.com/__sb/';
const SUPABASE_UPSTREAM_URL = 'https://uopkyuluxnrewvlmutam.supabase.co';
function resolveExtraSupabaseUrl(envUrl) {
  const easProfile = process.env.EAS_BUILD_PROFILE || "";
  const isEasRelease = process.env.EAS_BUILD === "true" && easProfile !== "development";
  if (isEasRelease) {
    process.env.EXPO_PUBLIC_SUPABASE_URL = NATIVE_SB_PROXY_URL;
    return NATIVE_SB_PROXY_URL;
  }
  return (envUrl || SUPABASE_UPSTREAM_URL).trim();
}
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
  const netlifyUrl = (
    process.env.EXPO_PUBLIC_NETLIFY_URL ||
    'https://mlexpress-merchants.com'
  ).trim();
  const supabaseUrl = resolveExtraSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
  const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

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
      blockedPermissions: [
        ...new Set([
          ...(expoConfig.android?.blockedPermissions || []),
          ...BLOCK_MEDIA_READ,
        ]),
      ],
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
      netlifyUrl,
      supabaseUrl: supabaseUrl || undefined,
      supabaseAnonKey: supabaseAnonKey || undefined,
      supabaseProxyUrl: NATIVE_SB_PROXY_URL,
    },
  };
};
