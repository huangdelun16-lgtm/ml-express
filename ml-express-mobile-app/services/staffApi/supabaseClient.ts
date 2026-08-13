import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { logger } from '../LoggerService';

// 优先从 expo-constants 读取（通过 app.config.js 的 extra 字段），回退到 process.env
const supabaseUrl =
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const supabaseKey =
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined) ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const netlifyUrl =
  (Constants.expoConfig?.extra?.netlifyUrl as string | undefined) ||
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
  }
);
