/**
 * Same-origin `/__sb` BFF: Netlify fetches supabase.co, then strips Cloudflare
 * bot cookies. Firefox rejects `Set-Cookie: __cf_bm; Domain=.supabase.co` on
 * this site. REST stays on this host (Myanmar TLS).
 * Storage images keep a short public cache so product photos do not refetch every visit.
 */
const UPSTREAM = 'https://uopkyuluxnrewvlmutam.supabase.co';

const DROP_REQ = new Set([
  'host',
  'connection',
  'keep-alive',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-real-ip',
]);

const DROP_RES = new Set([
  'set-cookie',
  'nel',
  'report-to',
  'content-encoding',
  'content-length',
  'transfer-encoding',
]);

export default async (request) => {
  const incoming = new URL(request.url);
  const path = incoming.pathname.replace(/^\/__sb/, '') || '/';
  const target = `${UPSTREAM}${path}${incoming.search}`;
  const isStorage = path.startsWith('/storage/');

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
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const out = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    if (!DROP_RES.has(key.toLowerCase())) out.append(key, value);
  }

  if (isStorage) {
    out.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    out.set('Access-Control-Allow-Origin', '*');
  } else {
    out.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    out.set('Pragma', 'no-cache');
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
};
