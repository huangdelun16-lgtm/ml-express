import { verifyJwt, JwtPayload } from './_jwt';

export function getAuthFromEvent(event: any): JwtPayload | null {
  // 1) Bearer Token 优先（便于移动端）
  const authz = event.headers?.authorization || event.headers?.Authorization;
  if (authz && /^Bearer\s+/i.test(authz)) {
    const token = authz.replace(/^Bearer\s+/i, '').trim();
    try { return verifyJwt(token); } catch { /* ignore */ }
  }
  // 2) 回退 Cookie（网页端）
  const cookie = event.headers?.cookie || event.headers?.Cookie || '';
  if (cookie) {
    const parts = cookie.split(/;\s*/);
    for (const p of parts) {
      const [k, v] = p.split('=');
      if (k === 'ml_session' && v) {
        try { return verifyJwt(decodeURIComponent(v)); } catch { return null; }
      }
    }
  }
  return null;
}

export async function hasDbRole(client: any, username: string, roles: string[]): Promise<boolean> {
  if (!username) return false;
  try {
    const { data, error } = await client.from('users').select('role').eq('username', username).limit(1);
    if (error) return false;
    const role = data && data[0]?.role;
    return role ? roles.includes(role) : false;
  } catch { return false; }
}


