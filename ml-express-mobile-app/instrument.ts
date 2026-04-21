import * as Sentry from '@sentry/react-native';

/**
 * 在 App 入口最先调用。未设置 EXPO_PUBLIC_SENTRY_DSN 时跳过（本地开发可不配）。
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      console.log('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set, skipping');
    }
    return;
  }

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.15,
    enableAutoSessionTracking: true,
    environment: __DEV__ ? 'development' : 'production',
  });
}
