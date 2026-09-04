/**
 * CRA `npm start` 不提供 Netlify Functions / Edge。
 * 把 /.netlify/functions 和 /__sb 转到线上 Admin：
 * - 本地才能登录 / verify-admin
 * - 缅甸浏览器不直连 *.supabase.co（会 ERR_CONNECTION_TIMED_OUT）
 * `npx netlify dev` 会在外层拦截同一路径，不会走到这里。
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const FUNCTIONS_ORIGIN = String(
  process.env.ADMIN_FUNCTIONS_PROXY ||
    process.env.REACT_APP_NETLIFY_BASE_URL ||
    'https://admin-market-link-express.com',
)
  .trim()
  .replace(/\/$/, '');

module.exports = function setupAdminFunctionsProxy(app) {
  if (process.env.ADMIN_FUNCTIONS_PROXY === 'off') {
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

  // Browser supabase-js → http://localhost:<port>/__sb/… → 线上 Admin Edge BFF
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
