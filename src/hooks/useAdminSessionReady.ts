import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { verifyToken } from '../services/authService';

/** 与 ProtectedRoute 默认角色一致，便于复用 verify-admin 短缓存 */
const ADMIN_SESSION_ROLES = ['admin', 'manager', 'operator', 'finance'];

/** 已进入后台业务页（不含登录页） */
export function isAdminWorkspacePath(pathname: string): boolean {
  if (!pathname.startsWith('/admin')) return false;
  return pathname !== '/admin/login' && !pathname.startsWith('/admin/login/');
}

/**
 * 仅在后台会话校验通过后为 true。
 * 登录页、校验中、令牌无效时均为 false，避免未登录就查表 / 订 Realtime。
 */
export function useAdminSessionReady(): boolean {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAdminWorkspacePath(pathname)) {
      setReady(false);
      return undefined;
    }

    let cancelled = false;
    void (async () => {
      try {
        const result = await verifyToken(ADMIN_SESSION_ROLES);
        if (!cancelled) setReady(!!result.valid);
      } catch {
        if (!cancelled) setReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return ready;
}
