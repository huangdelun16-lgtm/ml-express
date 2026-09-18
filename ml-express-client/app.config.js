const baseConfig = require('./app.json');
const fs = require('fs');
const path = require('path');

/**
 * Maps/Places keys 从环境变量注入，避免明文写入仓库。
 * 本地：ml-express-client/.env
 * EAS：项目 Environment / Secrets 配置同名 EXPO_PUBLIC_* 变量
 */

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

/** Production native builds bake absolute /__sb (Myanmar-reachable). Local expo start keeps env. */
const NATIVE_SB_PROXY_URL = 'https://' + 'market-link-express' + '.com/__sb/';
const SUPABASE_UPSTREAM_URL = 'https://uopkyuluxnrewvlmutam.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY';

function resolveExtraSupabaseUrl(envUrl) {
  const easProfile = process.env.EAS_BUILD_PROFILE || '';
  const isEasRelease = process.env.EAS_BUILD === 'true' && easProfile !== 'development';
  if (isEasRelease) {
    process.env.EXPO_PUBLIC_SUPABASE_URL = NATIVE_SB_PROXY_URL;
    return NATIVE_SB_PROXY_URL;
  }
  return String(envUrl || SUPABASE_UPSTREAM_URL).trim();
}

function pluginName(plugin) {
  if (Array.isArray(plugin)) return plugin[0];
  return plugin;
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
  // Native Android MapView only accepts a Maps SDK Android key.
  // Never substitute the Places HTTP key from .env / EAS extra.
  const androidMapsSdkKey = (
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_SDK_ANDROID_KEY ||
    (expoConfig.android &&
      expoConfig.android.config &&
      expoConfig.android.config.googleMaps &&
      expoConfig.android.config.googleMaps.apiKey) ||
    ''
  ).trim();
  const supabaseUrl = resolveExtraSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
  const supabaseAnonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  ).trim();

  const plugins = (expoConfig.plugins || []).filter((plugin) => pluginName(plugin) !== 'react-native-maps');
  plugins.push([
    'react-native-maps',
    {
      ...(androidMapsSdkKey ? { androidGoogleMapsApiKey: androidMapsSdkKey } : {}),
    },
  ]);

  return {
    ...expoConfig,
    plugins,
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
        ...(androidMapsSdkKey
          ? {
              googleMaps: {
                ...(((expoConfig.android &&
                  expoConfig.android.config &&
                  expoConfig.android.config.googleMaps) ||
                  {})),
                apiKey: androidMapsSdkKey,
              },
            }
          : {}),
      },
    },
    extra: {
      ...(expoConfig.extra || {}),
      googleMapsApiKey: mapsKey || undefined,
      googlePlacesApiKey: placesKey || undefined,
      supabaseUrl: supabaseUrl || undefined,
      supabaseAnonKey: supabaseAnonKey || undefined,
      supabaseProxyUrl: NATIVE_SB_PROXY_URL,
    },
  };
};
