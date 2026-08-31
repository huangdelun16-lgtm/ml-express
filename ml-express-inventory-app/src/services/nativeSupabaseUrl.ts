/**
 * Native REST/Auth/Storage on a Myanmar-reachable Netlify /__sb host.
 * *.supabase.co is remapped even in Expo __DEV__ (TLS reset in Myanmar).
 * Set EXPO_PUBLIC_SUPABASE_DIRECT=1 only when a VPN can reach supabase.co.
 *
 * Trailing slash is required: supabase-js `new URL('rest/v1', base)` drops
 * `/__sb` unless the base ends with `/`. Always emit `/__sb/` ourselves.
 *
 * Realtime WS cannot upgrade through Netlify rewrites; do not subscribe.
 */
export const NATIVE_SB_PROXY_URL =
  'https://' + 'admin-market-link-express.com' + '/__sb/';

export function isNativeDevRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/** Never attach User-Agent to REST/Auth/Storage. */
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

/** REST / Edge Functions / Storage 必须带店铺 JWT；Auth 路由仍由 supabase-js 自行处理 */
export function shouldAttachInventoryUserJwt(requestUrl: string): boolean {
  const url = String(requestUrl || '');
  if (/\/auth\/v1(?:\/|\?|$)/.test(url)) return false;
  return /\/rest\/v1(?:\/|\?|$)|\/functions\/v1(?:\/|\?|$)|\/storage\/v1(?:\/|\?|$)/.test(url);
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
      /^https?:\/\/(?:www\.)?(?:mlexpress-merchants\.com|admin-market-link-express\.com)\/__sb(?=\/|$)/i,
      proxy,
    );
}
