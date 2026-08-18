import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { applyRealtimeWsFallback, nativeClientHeaders, resolveNativeSupabaseUrl } from './nativeSupabaseUrl';

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseProxyUrl?: string;
};

const extra = (Constants.expoConfig?.extra ??
  Constants.manifest2?.extra) as SupabaseExtra | undefined;

const configuredUrl = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  extra?.supabaseUrl ??
  ''
).trim();
const supabaseAnonKey = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  extra?.supabaseAnonKey ??
  ''
).trim();
const supabaseUrl = resolveNativeSupabaseUrl(configuredUrl);

const PLACEHOLDER_HOSTS = ['YOUR_PROJECT_REF.supabase.co', 'placeholder.supabase.co'];
const PLACEHOLDER_KEY_PREFIXES = ['your_supabase_anon', 'placeholder-key'];
const ADMIN_SB_HOST = 'admin-market-link-express' + '.com';

export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (PLACEHOLDER_HOSTS.some((h) => supabaseUrl.includes(h))) return false;
  if (PLACEHOLDER_KEY_PREFIXES.some((p) => supabaseAnonKey.toLowerCase().startsWith(p))) {
    return false;
  }
  const allowedHost =
    supabaseUrl.includes('.supabase.co') ||
    supabaseUrl.includes('/__sb') ||
    supabaseUrl.includes(ADMIN_SB_HOST);
  if (!supabaseUrl.startsWith('https://') || !allowedHost) {
    return false;
  }
  if (!supabaseAnonKey.startsWith('eyJ')) return false;
  return true;
}

export function getSupabaseUrl(): string {
  return supabaseUrl;
}

export function getSupabaseAnonKey(): string {
  return supabaseAnonKey;
}

/** 仅开发环境返回技术提示；生产环境由 i18n 展示用户友好文案 */
export function getSupabaseConfigHint(): string {
  if (!__DEV__) return '';

  if (!configuredUrl || !supabaseAnonKey) {
    return '请在 ml-express-inventory-app/.env 中配置 EXPO_PUBLIC_SUPABASE_URL 与 EXPO_PUBLIC_SUPABASE_ANON_KEY';
  }
  if (!isSupabaseConfigured()) {
    return 'Supabase 配置仍是示例占位符，请从 .env.example 复制真实 URL 与 ANON_KEY 后重启 Expo';
  }
  return '';
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    ...(nativeClientHeaders()
      ? {
          global: { headers: nativeClientHeaders() },
          realtime: { headers: nativeClientHeaders() },
        }
      : {}),
  },
);
applyRealtimeWsFallback(supabase);
