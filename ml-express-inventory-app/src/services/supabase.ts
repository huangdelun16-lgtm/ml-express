import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { resolveNativeSupabaseUrl, shouldAttachInventoryUserJwt } from './nativeSupabaseUrl';

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
  extra?.supabaseProxyUrl ??
  ''
).trim();
const supabaseAnonKey = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  extra?.supabaseAnonKey ??
  ''
).trim();
const constantsAny = Constants as { appOwnership?: string; executionEnvironment?: string };
const isExpoGo =
  constantsAny.appOwnership === 'expo' || constantsAny.executionEnvironment === 'storeClient';
const allowDirect =
  !isExpoGo && String(process.env.EXPO_PUBLIC_SUPABASE_DIRECT || '').trim() === '1';
const supabaseUrl = resolveNativeSupabaseUrl(configuredUrl, undefined, {
  expoGo: isExpoGo,
  allowDirect,
});

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

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

let readInventoryAccessToken: () => Promise<string | null> = async () => null;

const inventoryFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Pragma', 'no-cache');
  if (shouldAttachInventoryUserJwt(requestUrl(input))) {
    try {
      const token = await readInventoryAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    } catch {
      // keep caller headers
    }
  }
  return fetch(input, { ...init, headers });
};

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
    global: {
      fetch: inventoryFetch,
      headers: {
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
      },
    },
  },
);
readInventoryAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};
