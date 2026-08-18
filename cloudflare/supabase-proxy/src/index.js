/**
 * Transparent reverse proxy in front of Supabase.
 *
 * Public hostname: https://db.market-link-express.com
 * Upstream:        https://uopkyuluxnrewvlmutam.supabase.co
 *
 * Myanmar ISPs block *.supabase.co (DNS, and possibly IPv6). Browser and
 * mobile clients must use this Worker. Netlify Functions and other servers
 * outside Myanmar keep calling supabase.co directly.
 *
 * Proxies REST, Auth, Storage, Edge Functions, and Realtime WebSockets.
 * Do not put service-role keys here — clients send their own apikey / JWT.
 */

const DEFAULT_ORIGIN = "https://uopkyuluxnrewvlmutam.supabase.co";

/** Hop-by-hop headers must not be forwarded on ordinary HTTP. Never strip Upgrade. */
const HTTP_HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "host",
]);

/**
 * @param {string} origin
 * @param {URL} incoming
 */
function rewriteToUpstream(origin, incoming) {
  const upstream = new URL(origin);
  const target = new URL(incoming.pathname + incoming.search, upstream);
  return { target, originHost: upstream.host };
}

/**
 * @param {Headers} source
 * @param {string} originHost
 * @param {boolean} isWebSocket
 */
function buildUpstreamHeaders(source, originHost, isWebSocket) {
  const headers = new Headers();
  for (const [key, value] of source.entries()) {
    const lower = key.toLowerCase();
    if (lower.startsWith("cf-")) continue;
    if (!isWebSocket && HTTP_HOP_BY_HOP.has(lower)) continue;
    if (lower === "host") continue;
    headers.append(key, value);
  }
  headers.set("Host", originHost);
  return headers;
}

export default {
  /**
   * @param {Request} request
   * @param {{ SUPABASE_ORIGIN?: string }} env
   */
  async fetch(request, env) {
    const origin = String(env.SUPABASE_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");
    const incoming = new URL(request.url);
    const { target, originHost } = rewriteToUpstream(origin, incoming);

    const upgrade = (request.headers.get("Upgrade") || "").toLowerCase();
    const isWebSocket = upgrade === "websocket";

    // WebSocket: pass the original Request so Cloudflare can complete the
    // protocol upgrade (Realtime `/realtime/v1/*`). fetch() rewrites Host.
    if (isWebSocket) {
      return fetch(target, request);
    }

    // Ordinary HTTP (including OPTIONS preflight): copy method / headers /
    // query / body. CORS headers from Supabase are returned as-is.
    const headers = buildUpstreamHeaders(request.headers, originHost, false);
    const method = request.method.toUpperCase();
    /** @type {RequestInit} */
    const init = {
      method,
      headers,
      redirect: "manual",
    };

    if (method !== "GET" && method !== "HEAD") {
      init.body = request.body;
      // Required when forwarding a streamed body from an incoming Request.
      init.duplex = "half";
    }

    return fetch(target.toString(), init);
  },
};
