import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

const PLACEHOLDER_HOSTS = ['YOUR_PROJECT_REF.supabase.co', 'placeholder.supabase.co'];
const PLACEHOLDER_KEY_PREFIXES = ['your_supabase_anon', 'placeholder-key'];

export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (PLACEHOLDER_HOSTS.some((h) => supabaseUrl.includes(h))) return false;
  if (PLACEHOLDER_KEY_PREFIXES.some((p) => supabaseAnonKey.toLowerCase().startsWith(p))) return false;
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) return false;
  if (!supabaseAnonKey.startsWith('eyJ')) return false;
  return true;
}

export function getSupabaseUrl(): string {
  return supabaseUrl;
}

export function getSupabaseAnonKey(): string {
  return supabaseAnonKey;
}

export function getSupabaseConfigHint(): string {
  if (!supabaseUrl || !supabaseAnonKey) {
    return '请在 ml-express-inventory-app/.env 中配置 EXPO_PUBLIC_SUPABASE_URL 与 EXPO_PUBLIC_SUPABASE_ANON_KEY（可与商户端 .env 相同）';
  }
  if (!isSupabaseConfigured()) {
    return 'Supabase 配置仍是示例占位符，请从 ml-express-merchant-app/.env 复制真实 URL 与 ANON_KEY 后重启 Expo';
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
  },
);
