/**
 * Native REST/Auth/Storage on a Myanmar-reachable Netlify /__sb host.
 * localhost / Expo __DEV__ keeps env extra supabase.co.
 *
 * Trailing slash is required: supabase-js `new URL('rest/v1', base)` drops
 * `/__sb` unless the base ends with `/`. Always emit `/__sb/` ourselves.
 *
 * Realtime WS cannot upgrade through Netlify rewrites. The previous Worker
 * fallback (`*.workers.dev`) TLS-resets in Myanmar the same way supabase.co
 * does, and no Cloudflare custom hostname exists. Production must not dial it.
 */
export const NATIVE_SB_PROXY_URL =
  'https://' + 'admin-market-link-express.com' + '/__sb/';

const WORKER_HOST = 'ml-supabase-proxy.huangdelun16' + '.workers.dev';
export const NATIVE_REALTIME_WS_FALLBACK =
  'wss://' + WORKER_HOST + '/realtime/v1/websocket';
export const NATIVE_REALTIME_HTTP_FALLBACK =
  'https://' + WORKER_HOST + '/realtime/v1';

/** Browser-like UA so Cloudflare Bot Fight is less likely to 1010 native WS. */
export const NATIVE_BROWSER_LIKE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export function isNativeDevRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/** Never attach User-Agent to REST/Auth/Storage. UA is realtime-WS only. */
export function nativeClientHeaders(_isDev = isNativeDevRuntime()): Record<string, string> | undefined {
  return undefined;
}

/** Production/release always uses /__sb/. Dev keeps the configured env URL. */
export function resolveNativeSupabaseUrl(
  configuredUrl: string,
  isDev = isNativeDevRuntime(),
): string {
  const configured = String(configuredUrl || '').trim().replace(/\/$/, '');
  if (isDev) {
    return configured;
  }
  const proxy = NATIVE_SB_PROXY_URL;
  return proxy.endsWith('/') ? proxy : `${proxy}/`;
}

type RealtimePatchTarget = {
  realtime?: {
    endPoint?: string;
    httpEndpoint?: string;
    headers?: Record<string, string>;
    socketAdapter?: { socket?: { endPoint?: string } };
  };
  realtimeUrl?: { href?: string };
};

/**
 * Kept as a stable export. Intentionally a no-op: assigning workers.dev
 * as the Realtime endpoint TLS-resets (CFNetwork -9806) in Myanmar.
 */
export function applyRealtimeWsFallback(
  _client: RealtimePatchTarget,
  _isDev = isNativeDevRuntime(),
): void {
  return;
}
