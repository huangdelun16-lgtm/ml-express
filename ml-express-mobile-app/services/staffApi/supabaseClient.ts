import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { logger } from '../LoggerService';
import {
  applyRealtimeWsFallback,
  nativeClientHeaders,
  resolveNativeSupabaseUrl,
} from './nativeSupabaseUrl';

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseProxyUrl?: string;
  netlifyUrl?: string;
};
const extra = Constants.expoConfig?.extra as SupabaseExtra | undefined;

// 优先从 expo-constants 读取（通过 app.config.js 的 extra 字段），回退到 process.env
const configuredUrl =
  extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const supabaseKey =
  extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const constantsAny = Constants as { appOwnership?: string; executionEnvironment?: string };
const isExpoGo =
  constantsAny.appOwnership === 'expo' || constantsAny.executionEnvironment === 'storeClient';
const allowDirect =
  !isExpoGo && String(process.env.EXPO_PUBLIC_SUPABASE_DIRECT || '').trim() === '1';
const supabaseUrl = resolveNativeSupabaseUrl(configuredUrl, undefined, {
  expoGo: isExpoGo,
  allowDirect,
});
const proxyHeaders = nativeClientHeaders();

export const netlifyUrl =
  extra?.netlifyUrl ||
  process.env.EXPO_PUBLIC_NETLIFY_URL ||
  'https://admin-market-link-express.netlify.app';

if (!supabaseUrl || !supabaseKey) {
  logger.error('Supabase 配置缺失', undefined, {
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseKey),
  });
} else {
  logger.info('Supabase 配置已加载', { url: supabaseUrl });
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseKey || 'invalid-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    ...(proxyHeaders
      ? { global: { headers: proxyHeaders }, realtime: { headers: proxyHeaders } }
      : {}),
  }
);
applyRealtimeWsFallback(supabase);
