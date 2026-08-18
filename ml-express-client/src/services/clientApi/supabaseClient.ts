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
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra?.supabaseUrl || '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra?.supabaseAnonKey || '';
const supabaseUrl = resolveNativeSupabaseUrl(configuredUrl);
const proxyHeaders = nativeClientHeaders();

if (!supabaseUrl || !supabaseKey) {
  LoggerService.error('Supabase 环境变量未配置！请检查 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  proxyHeaders
    ? { global: { headers: proxyHeaders }, realtime: { headers: proxyHeaders } }
    : undefined,
);
applyRealtimeWsFallback(supabase);
