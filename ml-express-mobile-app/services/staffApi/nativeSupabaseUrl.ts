/**
 * Native REST/Auth/Storage on a Myanmar-reachable Netlify /__sb host.
 * *.supabase.co is remapped even in Expo __DEV__ (TLS reset in Myanmar).
 * Set EXPO_PUBLIC_SUPABASE_DIRECT=1 only when a VPN can reach supabase.co.
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

function ensureTrailingSlash(url: string): string {
  if (!url) return url;
  return url.endsWith('/') ? url : `${url}/`;
}

function isSupabaseCoHost(url: string): boolean {
  return /https?:\/\/[^/\s]*supabase\.co(?=\/|$)/i.test(url);
}

/**
 * Native REST always uses /__sb unless allowDirect is set.
 * Myanmar Wi-Fi TLS-resets *.supabase.co; Expo Go / __DEV__ env often still
 * points at supabase.co, which then surfaces as Network request failed.
 */
export function resolveNativeSupabaseUrl(
  configuredUrl: string,
  isDev = isNativeDevRuntime(),
  options?: { expoGo?: boolean; allowDirect?: boolean },
): string {
  const configured = String(configuredUrl || '').trim().replace(/\/$/, '');
  const allowDirect = Boolean(options?.allowDirect) && !options?.expoGo;

  if (options?.expoGo) {
    return ensureTrailingSlash(NATIVE_SB_PROXY_URL);
  }
  if (configured.includes('/__sb')) {
    return ensureTrailingSlash(configured);
  }
  if (!allowDirect && (!configured || isSupabaseCoHost(configured))) {
    return ensureTrailingSlash(NATIVE_SB_PROXY_URL);
  }
  if (isDev) {
    return configured;
  }
  return ensureTrailingSlash(NATIVE_SB_PROXY_URL);
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

/** Rewrite stored supabase.co public Storage URLs onto the native /__sb proxy. */
export function rewritePublicStorageUrl(url: string): string {
  const raw = String(url || '').trim();
  if (!raw) return raw;
  if (raw.startsWith('file://') || raw.startsWith('content://')) return raw;
  const proxy = NATIVE_SB_PROXY_URL.replace(/\/$/, '');
  return raw
    .replace(/^https?:\/\/uopkyuluxnrewvlmutam\.supabase\.co(?=\/|$)/i, proxy)
    .replace(/^https?:\/\/[^/]+\.supabase\.co(?=\/|$)/i, proxy)
    .replace(
      /^https?:\/\/(?:www\.)?(?:mlexpress-merchants\.com|market-link-express\.com|admin-market-link-express\.com)\/__sb(?=\/|$)/i,
      proxy,
    );
}

export function remoteImageUri(url?: string | null): string | undefined {
  const rewritten = rewritePublicStorageUrl(String(url || '').trim());
  if (!rewritten) return undefined;
  if (rewritten.startsWith('file://') || rewritten.startsWith('content://')) return rewritten;
  if (!/^https?:\/\//i.test(rewritten)) return undefined;
  return rewritten;
}
