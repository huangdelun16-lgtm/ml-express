/**
 * Admin 走自家账号表 + sessionStorage，不用 Supabase Auth session。
 * 默认 persist/autoRefresh 会抢 Navigator Lock（sb-*-auth-token），
 * 多标签或自动刷新时 console 会抛 unhandledrejection。
 */
export async function adminAuthLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  return fn();
}

export const adminSupabaseAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
  storageKey: 'sb-admin-anon-unused',
  lock: adminAuthLock,
};
