const baseConfig = require('./app.json');

/**
 * Supabase anon key 为公开客户端密钥，可打入 App Bundle。
 * 本地开发可用 .env 覆盖；EAS Build 未注入 EXPO_PUBLIC_* 时使用下列生产默认值。
 */
const DEFAULT_SUPABASE_URL = 'https://uopkyuluxnrewvlmutam.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY';

module.exports = ({ config }) => {
  const expoConfig = config ?? baseConfig.expo ?? baseConfig;

  const supabaseUrl = (
    process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  ).trim();
  const supabaseAnonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  ).trim();

  return {
    ...expoConfig,
    extra: {
      ...(expoConfig.extra || {}),
      supabaseUrl,
      supabaseAnonKey,
    },
  };
};
