import type { SupabaseClient } from '@supabase/supabase-js';

/** Upstream Supabase project (server-side only; browsers use same-origin /__sb). */
export const SUPABASE_UPSTREAM_HOST = 'uopkyuluxnrewvlmutam.supabase.co';

/** Cloudflare Worker — kept for native / diagnostics; production Admin must not dial this WS. */
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

/** Local `npm start` — images still use the production Admin /__sb host. */
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

function allowDirectSupabase(): boolean {
  return process.env.REACT_APP_SUPABASE_DIRECT === '1';
}

/**
 * Browser REST/Auth should use same-origin `/__sb` when env is empty, upstream, or Worker.
 * Local CRA is included: `src/setupProxy.js` forwards `/__sb` to production Admin BFF
 * so Myanmar does not dial `*.supabase.co`. Set REACT_APP_SUPABASE_DIRECT=1 to skip.
 */
export function shouldUseSameOriginProxy(configuredUrl = configuredEnvUrl()): boolean {
  if (!isBrowser() || allowDirectSupabase()) return false;
  if (!configuredUrl) return true;
  if (configuredUrl.includes(SUPABASE_UPSTREAM_HOST)) return true;
  if (configuredUrl.includes(SUPABASE_WORKER_HOST)) return true;
  if (configuredUrl.includes('.supabase.co')) return true;
  if (configuredUrl.includes('.workers.dev')) return true;
  return false;
}

/**
 * REST / Auth / Storage base URL for browser supabase-js.
 * Production Netlify sites and local CRA: `origin/__sb/` (proxied to supabase.co).
 */
export function resolveBrowserSupabaseUrl(raw?: string): string {
  const configuredUrl = configuredEnvUrl(raw);
  if (shouldUseSameOriginProxy(configuredUrl)) {
    return `${window.location.origin}/__sb/`;
  }
  if (configuredUrl) return configuredUrl;
  return `https://${SUPABASE_UPSTREAM_HOST}`;
}

/**
 * Netlify 200 rewrites proxy HTTP but cannot upgrade WebSocket.
 * Pointing Realtime at `*.workers.dev` TLS-resets in Myanmar (same as supabase.co).
 * Production Admin therefore keeps REST on `/__sb` and does not dial Realtime WS.
 * Dashboard / tracking pages poll instead.
 * @see https://answers.netlify.com/t/does-netlify-support-websocket-proxying/11230
 */
export function isBrowserRealtimeAvailable(): boolean {
  return !shouldUseSameOriginProxy();
}

export function applyNetlifyRealtimeFallback(client: SupabaseClient): void {
  if (!shouldUseSameOriginProxy()) return;
  const realtime = client.realtime as {
    disconnect?: () => void;
    connect?: () => void;
  };
  realtime.disconnect?.();
  realtime.connect = () => undefined;
}

/** Production Admin Storage proxy; local preview also uses this so Myanmar can load images. */
export const ADMIN_PUBLIC_SB_PROXY = 'https://admin-market-link-express.com/__sb';

function storageProxyBase(): string {
  if (isBrowser() && !isLocalDevHost()) {
    return `${window.location.origin}/__sb`;
  }
  return ADMIN_PUBLIC_SB_PROXY;
}

/**
 * 缅甸打不开 *.supabase.co。把库里存的公开 Storage 地址改到当前站 /__sb（本地则用生产 Admin 代理）。
 */
export function rewritePublicStorageUrl(url: string): string {
  const raw = String(url || '').trim();
  if (!raw) return raw;
  if (/^(blob:|data:|file:|content:)/i.test(raw)) return raw;
  const proxy = storageProxyBase().replace(/\/$/, '');
  return raw
    .replace(/^https?:\/\/uopkyuluxnrewvlmutam\.supabase\.co(?=\/|$)/i, proxy)
    .replace(/^https?:\/\/[^/]+\.supabase\.co(?=\/|$)/i, proxy)
    .replace(
      /^https?:\/\/(?:www\.)?(?:mlexpress-merchants\.com|market-link-express\.com|admin-market-link-express\.com)\/__sb(?=\/|$)/i,
      proxy,
    );
}

/** Public Storage URL for <img>. Full supabase.co links go through /__sb; bare paths assume product_images. */
export function publicStorageUrl(url?: string | null): string {
  const raw = String(url || '').trim();
  if (!raw || /^(file:|content:)/i.test(raw)) return '';
  if (/^(blob:|data:)/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return rewritePublicStorageUrl(raw);
  const path = raw.replace(/^\/+/, '').replace(/^product_images\//, '');
  return rewritePublicStorageUrl(
    `${storageProxyBase().replace(/\/$/, '')}/storage/v1/object/public/product_images/${path}`,
  );
}

function mapPublicImageList(urls: unknown): string[] | undefined {
  if (!Array.isArray(urls)) return undefined;
  return urls.map((url) => publicStorageUrl(String(url || ''))).filter(Boolean);
}

/** Rewrite product cover / detail / pending-edit images so Admin can load them in Myanmar. */
export function withPublicProductImages<
  T extends {
    image_url?: string | null;
    detail_image_urls?: string[] | null;
    pending_update?: Record<string, unknown> | null;
  },
>(row: T): T {
  const pending = row.pending_update;
  return {
    ...row,
    image_url: row.image_url ? publicStorageUrl(row.image_url) : row.image_url,
    detail_image_urls: mapPublicImageList(row.detail_image_urls) ?? row.detail_image_urls,
    pending_update:
      pending && typeof pending === 'object'
        ? {
            ...pending,
            image_url:
              typeof pending.image_url === 'string'
                ? publicStorageUrl(pending.image_url)
                : pending.image_url,
            detail_image_urls:
              mapPublicImageList(pending.detail_image_urls) ?? pending.detail_image_urls,
          }
        : pending,
  };
}
