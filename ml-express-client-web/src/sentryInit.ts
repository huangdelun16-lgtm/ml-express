/**
 * 动态加载 Sentry，避免无 DSN 时主包体积增大。
 */
export async function initSentry(): Promise<void> {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
  });
}
