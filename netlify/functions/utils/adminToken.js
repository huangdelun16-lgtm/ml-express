/**
 * 从 Admin Web 请求提取 HMAC 会话令牌。
 * 优先 httpOnly Cookie；Cookie 不可用时接受 Authorization Bearer
 *（与 verify-admin 的 body token 回退同目的，供跨境 Functions 使用）。
 * 不要在此解析 Inventory App 的 Supabase Auth JWT。
 */

function getAdminTokenFromEvent(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const tokenCookiePair = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('admin_auth_token='));
  if (tokenCookiePair) {
    let token = tokenCookiePair.slice('admin_auth_token='.length).trim();
    try {
      token = decodeURIComponent(token);
    } catch (_) {
      /* 未编码的旧 Cookie */
    }
    if (token) return token;
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  return null;
}

module.exports = { getAdminTokenFromEvent };
