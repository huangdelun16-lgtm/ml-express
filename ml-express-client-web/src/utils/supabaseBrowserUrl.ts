import type { SupabaseClient } from '@supabase/supabase-js';

/** Upstream Supabase project (server-side only; browsers use same-origin /__sb). */
export const SUPABASE_UPSTREAM_HOST = 'uopkyuluxnrewvlmutam.supabase.co';

/** Cloudflare Worker — Realtime WebSocket fallback (Netlify rewrites cannot upgrade WS). */
export const SUPABASE_WORKER_ORIGIN = 'https://ml-supabase-proxy.huangdelun16.workers.dev';
export const SUPABASE_BROWSER_PROXY_URL = SUPABASE_WORKER_ORIGIN;
export const SUPABASE_WORKER_HOST = 'ml-supabase-proxy.huangdelun16.workers.dev';
export const SUPABASE_REALTIME_WS_FALLBACK =
  'wss://ml-supabase-proxy.huangdelun16.workers.dev/realtime/v1/websocket';

function configuredEnvUrl(raw?: string): string {
  const source = raw !== undefined ? raw : process.env.REACT_APP_SUPABASE_URL;
  return String(source || '').trim().replace(/\/$/, '');
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.location !== 'undefined';
}

/** Local `npm start` — keep env supabase.co / custom URL, skip Netlify /__sb proxy. */
function isLocalDevHost(): boolean {
  if (!isBrowser()) return false;
  const { hostname } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost')
  );
}

/** Production browser should use same-origin BFF when env is empty, upstream, or Worker. */
export function shouldUseSameOriginProxy(configuredUrl = configuredEnvUrl()): boolean {
  if (!isBrowser() || isLocalDevHost()) return false;
  if (!configuredUrl) return true;
  if (configuredUrl.includes(SUPABASE_UPSTREAM_HOST)) return true;
  if (configuredUrl.includes(SUPABASE_WORKER_HOST)) return true;
  if (configuredUrl.includes('.supabase.co')) return true;
  if (configuredUrl.includes('.workers.dev')) return true;
  return false;
}

/**
 * REST / Auth / Storage base URL for browser supabase-js.
 * Production Netlify sites: `https://<site>/__sb/` (proxied to supabase.co).
 */
export function resolveBrowserSupabaseUrl(raw?: string): string {
  const configuredUrl = configuredEnvUrl(raw);
  if (shouldUseSameOriginProxy(configuredUrl)) {
    return `${window.location.origin}/__sb/`;
  }
  if (configuredUrl) return configuredUrl;
  if (isBrowser() && isLocalDevHost()) {
    return `https://${SUPABASE_UPSTREAM_HOST}`;
  }
  return `https://${SUPABASE_UPSTREAM_HOST}`;
}

/**
 * Netlify 200 rewrites proxy HTTP but not WebSocket upgrades.
 * Point Realtime at the Cloudflare Worker while REST/auth stay on /__sb.
 * @see https://answers.netlify.com/t/does-netlify-support-websocket-proxying/11230
 */
export function applyNetlifyRealtimeFallback(client: SupabaseClient): void {
  if (!shouldUseSameOriginProxy()) return;
  const realtime = client.realtime as {
    endPoint: string;
    httpEndpoint: string;
  };
  realtime.endPoint = SUPABASE_REALTIME_WS_FALLBACK;
  realtime.httpEndpoint = `${SUPABASE_WORKER_ORIGIN}/realtime/v1`;
}
