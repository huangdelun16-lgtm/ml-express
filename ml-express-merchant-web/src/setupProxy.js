/**
 * CRA `npm start` 不提供 Netlify Edge。
 * 把 /.netlify/functions 和 /__sb 转到线上商家站：
 * - 缅甸浏览器不直连 *.supabase.co（会 ERR_CONNECTION_REFUSED）
 * `npx netlify dev` 会在外层拦截同一路径，不会走到这里。
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const FUNCTIONS_ORIGIN = String(
  process.env.MERCHANT_FUNCTIONS_PROXY ||
    process.env.REACT_APP_NETLIFY_BASE_URL ||
    'https://mlexpress-merchants.com',
)
  .trim()
  .replace(/\/$/, '');

module.exports = function setupMerchantFunctionsProxy(app) {
  if (process.env.MERCHANT_FUNCTIONS_PROXY === 'off') {
    return;
  }

  app.use(
    '/.netlify/functions',
    createProxyMiddleware({
      target: FUNCTIONS_ORIGIN,
      changeOrigin: true,
      secure: true,
      xfwd: true,
      cookieDomainRewrite: '',
    }),
  );

  // Browser supabase-js → http://localhost:<port>/__sb/… → 线上商家 Edge BFF
  app.use(
    '/__sb',
    createProxyMiddleware({
      target: FUNCTIONS_ORIGIN,
      changeOrigin: true,
      secure: true,
      xfwd: true,
      cookieDomainRewrite: '',
    }),
  );
};
