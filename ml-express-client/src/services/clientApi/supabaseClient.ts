import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import LoggerService from '../LoggerService';
import {
  applyRealtimeWsFallback,
  nativeClientHeaders,
  resolveNativeSupabaseUrl,
} from './nativeSupabaseUrl';

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseProxyUrl?: string;
};
const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra) as
  | SupabaseExtra
  | undefined;

const configuredUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra?.supabaseUrl || extra?.supabaseProxyUrl || '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra?.supabaseAnonKey || '';
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

if (!supabaseUrl || !supabaseKey) {
  LoggerService.error('Supabase 环境变量未配置！请检查 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY');
} else {
  try {
    const parsed = new URL(supabaseUrl);
    LoggerService.info('Supabase REST', `${parsed.host}${parsed.pathname}`);
  } catch {
    LoggerService.info('Supabase REST', supabaseUrl);
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  proxyHeaders
    ? { global: { headers: proxyHeaders }, realtime: { headers: proxyHeaders } }
    : undefined,
);
applyRealtimeWsFallback(supabase);
