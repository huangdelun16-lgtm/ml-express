/**
 * Native REST/Auth/Storage on a Myanmar-reachable Netlify /__sb host.
 * localhost / Expo __DEV__ keeps env extra supabase.co.
 * Realtime WS cannot upgrade through Netlify rewrites — Worker fallback only.
 */
export const NATIVE_SB_PROXY_URL =
  'https://' + 'admin-market-link-express.com' + '/__sb';

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

export function nativeClientHeaders(isDev = isNativeDevRuntime()): Record<string, string> | undefined {
  if (isDev) return undefined;
  return { 'User-Agent': NATIVE_BROWSER_LIKE_UA };
}

/** Production/release always uses /__sb. Dev keeps the configured env URL. */
export function resolveNativeSupabaseUrl(
  configuredUrl: string,
  isDev = isNativeDevRuntime(),
): string {
  const configured = String(configuredUrl || '').trim().replace(/\/$/, '');
  if (isDev) {
    return configured;
  }
  return NATIVE_SB_PROXY_URL;
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
 * Point Realtime at the Cloudflare Worker while REST/auth/storage stay on /__sb.
 * Handles supabase-js 2.8x (writable endPoint) and 2.10x (Phoenix socketAdapter).
 */
export function applyRealtimeWsFallback(
  client: RealtimePatchTarget,
  isDev = isNativeDevRuntime(),
): void {
  if (isDev) return;
  const realtime = client.realtime;
  if (!realtime) return;

  const wsUrl = NATIVE_REALTIME_WS_FALLBACK;
  const httpUrl = NATIVE_REALTIME_HTTP_FALLBACK;

  const phoenix = realtime.socketAdapter && realtime.socketAdapter.socket;
  if (phoenix) {
    phoenix.endPoint = wsUrl;
  } else {
    realtime.endPoint = wsUrl;
  }
  realtime.httpEndpoint = httpUrl;
  if (realtime.headers) {
    realtime.headers['User-Agent'] = NATIVE_BROWSER_LIKE_UA;
  }
}
