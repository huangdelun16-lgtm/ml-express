/**
 * 透明转发 Supabase API / Auth / Storage / Realtime / Edge Functions。
 * 缅甸用户访问 Worker 域名，由 Cloudflare 边缘再连 supabase.co。
 */
const DEFAULT_ORIGIN = 'uopkyuluxnrewvlmutam.supabase.co';

const ALLOWED_PREFIXES = [
  '/rest/v1',
  '/auth/v1',
  '/storage/v1',
  '/realtime/v1',
  '/functions/v1',
  '/graphql/v1',
];

const DROP_REQ = new Set([
  'connection',
  'keep-alive',
  'host',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-real-ip',
]);

const DROP_RES = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'nel',
  'report-to',
]);

function isAllowedPath(pathname) {
  if (pathname === '/' || pathname === '') return true;
  return ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function applyCors(request, headers) {
  const origin = request.headers.get('Origin');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  } else {
    headers.set('Access-Control-Allow-Origin', '*');
  }
  headers.set(
    'Access-Control-Allow-Headers',
    request.headers.get('Access-Control-Request-Headers') ||
      'authorization, apikey, content-type, prefer, x-client-info, accept-profile, content-profile, x-supabase-api-version, range, x-requested-with',
  );
  headers.set('Access-Control-Expose-Headers', 'content-range, x-supabase-api-version, prefer, retry-after');
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

function jsonError(request, status, message) {
  const headers = applyCors(request, new Headers({ 'Content-Type': 'application/json' }));
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: applyCors(request, new Headers()) });
      }

      const incoming = new URL(request.url);
      if (!isAllowedPath(incoming.pathname)) {
        return jsonError(request, 400, 'requested path is invalid');
      }

      const originHost = env.SUPABASE_HOSTNAME || DEFAULT_ORIGIN;
      const target = new URL(incoming.pathname + incoming.search, `https://${originHost}`);

      if ((request.headers.get('Upgrade') || '').toLowerCase() === 'websocket') {
        return fetch(new Request(target.toString(), request));
      }

      const fwd = new Headers();
      for (const [key, value] of request.headers.entries()) {
        if (!DROP_REQ.has(key.toLowerCase())) fwd.set(key, value);
      }

      const init = {
        method: request.method,
        headers: fwd,
        redirect: 'follow',
      };
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = request.body;
        init.duplex = 'half';
      }

      const upstream = await fetch(target.toString(), init);
      const outHeaders = new Headers();
      for (const [key, value] of upstream.headers.entries()) {
        if (!DROP_RES.has(key.toLowerCase())) outHeaders.set(key, value);
      }
      applyCors(request, outHeaders);
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'proxy failed';
      return jsonError(request, 502, message);
    }
  },
};
