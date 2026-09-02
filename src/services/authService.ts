/**
 * Admin Web 认证：令牌只由服务端 admin-password / verify-admin 签发（HMAC）。
 * 浏览器不得自签 JWT，也不得回退 admin/admin 或明文密码查询。
 * 不与会员/商家/骑手会话或 Inventory App JWT 共用。
 */

import { logger } from '../utils/logger';

const TOKEN_STORAGE_KEY = 'admin_auth_token';

/** 短时间内复用 verify-admin 成功结果，减少首屏多次路由重复验证造成的延迟与 401 闪烁 */
const VERIFY_CACHE_MS = 45_000;
type VerifyOk = {
  valid: boolean;
  user?: { username: string; role: string; name: string; region?: string; permissions?: string[] };
  error?: string;
};
let lastVerifySuccess: {
  expires: number;
  rolesKey: string;
  permissionKey?: string;
  result: VerifyOk;
} | null = null;

const verifyInflight = new Map<string, Promise<VerifyOk>>();

function shouldWipeAdminSession(error?: string): boolean {
  if (!error) return true;
  return /令牌|未找到认证|无效的令牌|已过期|签名|用户不存在|停用|白名单/.test(error);
}

function normalizePermissionKey(permissionId?: string | string[]): string | undefined {
  if (permissionId == null) return undefined;
  const arr = (Array.isArray(permissionId) ? permissionId : [permissionId]).filter(Boolean).sort();
  return arr.length ? arr.join(',') : undefined;
}

const USER_INFO_KEYS = [
  'currentUser',
  'currentUserName',
  'currentUserRole',
  'currentUserRegion',
  'currentUserPermissions',
] as const;

function clearUserInfoStorage() {
  USER_INFO_KEYS.forEach((key) => {
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch {
      /* 隐私模式可能不可用 */
    }
  });
}

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 保存会话：httpOnly Cookie 由 admin-password 设置；此处只缓存服务端下发的令牌副本
 *（Cookie 丢失时作为 Authorization Bearer / verify-admin body 回退）。
 */
export async function saveToken(
  username: string,
  role: string,
  name: string,
  region?: string,
  permissions?: string[],
  serverIssuedToken?: string | null
): Promise<string> {
  if (serverIssuedToken) {
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, serverIssuedToken);
      localStorage.setItem(TOKEN_STORAGE_KEY, serverIssuedToken);
    } catch (error) {
      logger.warn('无法缓存会话令牌（verify-admin / 跨境 Functions 请求备用）:', error);
    }
  }

  try {
    sessionStorage.setItem('currentUser', username);
    sessionStorage.setItem('currentUserName', name);
    sessionStorage.setItem('currentUserRole', role);
    if (region) sessionStorage.setItem('currentUserRegion', region);
    if (permissions) sessionStorage.setItem('currentUserPermissions', JSON.stringify(permissions));

    localStorage.setItem('currentUser', username);
    localStorage.setItem('currentUserName', name);
    localStorage.setItem('currentUserRole', role);
    if (region) localStorage.setItem('currentUserRegion', region);
    if (permissions) localStorage.setItem('currentUserPermissions', JSON.stringify(permissions));
  } catch (error) {
    logger.warn('无法保存用户信息到存储:', error);
  }

  return serverIssuedToken || '';
}

/** 读取缓存的服务端令牌（Cookie 不可用时作为 Authorization Bearer） */
export function getToken(): string | null {
  return readStorage(TOKEN_STORAGE_KEY);
}

/** Admin Netlify Functions：带 Cookie + Bearer 回退 */
export function adminAuthenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, credentials: 'include', headers });
}

/** 清除本地会话并让服务端清 httpOnly Cookie */
export async function clearToken(): Promise<void> {
  lastVerifySuccess = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    logger.warn('清除本地会话令牌失败:', error);
  }
  clearUserInfoStorage();

  try {
    await fetch('/.netlify/functions/verify-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'logout',
      }),
      credentials: 'include',
    });
  } catch (error) {
    logger.error('清除 Cookie 失败:', error);
  }
}

/**
 * 验证 Token（调用服务端 verify-admin）
 */
export async function verifyToken(
  requiredRoles: string[] = [],
  permissionId?: string | string[],
): Promise<{
  valid: boolean;
  user?: { username: string; role: string; name: string; region?: string; permissions?: string[] };
  error?: string;
}> {
  try {
    const now = Date.now();
    const rolesKey = [...requiredRoles].sort().join(',');
    const permissionKeyVal = normalizePermissionKey(permissionId);
    if (
      lastVerifySuccess &&
      lastVerifySuccess.expires > now &&
      lastVerifySuccess.rolesKey === rolesKey &&
      lastVerifySuccess.permissionKey === permissionKeyVal &&
      lastVerifySuccess.result.valid
    ) {
      return lastVerifySuccess.result;
    }

    const inflightKey = `${rolesKey}|${permissionKeyVal || ''}`;
    const pending = verifyInflight.get(inflightKey);
    if (pending) return pending;

    const run = (async (): Promise<VerifyOk> => {
    const bodyToken = getToken() || undefined;

    const permissionIds =
      permissionId == null
        ? undefined
        : Array.isArray(permissionId)
          ? permissionId.filter(Boolean)
          : [permissionId];

    const response = await adminAuthenticatedFetch('/.netlify/functions/verify-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify',
        requiredRoles,
        ...(permissionIds?.length ? { permissionIds } : {}),
        token: bodyToken,
      }),
    });

    const result = (await response.json()) as VerifyOk;

    if (result.valid && result.user) {
      lastVerifySuccess = {
        expires: now + VERIFY_CACHE_MS,
        rolesKey,
        permissionKey: permissionKeyVal,
        result: { valid: true, user: result.user },
      };
      try {
        const existingRegion = readStorage('currentUserRegion') || undefined;
        const normalizedPermissions = Array.isArray(result.user.permissions)
          ? result.user.permissions.map((id: string) => (id === 'merchants_stores' ? 'merchant_stores' : id))
          : undefined;
        if (result.user.username) {
          sessionStorage.setItem('currentUser', result.user.username);
          localStorage.setItem('currentUser', result.user.username);
        }
        if (result.user.name) {
          sessionStorage.setItem('currentUserName', result.user.name);
          localStorage.setItem('currentUserName', result.user.name);
        }
        if (result.user.role) {
          sessionStorage.setItem('currentUserRole', result.user.role);
          localStorage.setItem('currentUserRole', result.user.role);
        }
        if (existingRegion) {
          sessionStorage.setItem('currentUserRegion', existingRegion);
          localStorage.setItem('currentUserRegion', existingRegion);
        }
        if (normalizedPermissions) {
          const permissionsStr = JSON.stringify(Array.from(new Set(normalizedPermissions)));
          sessionStorage.setItem('currentUserPermissions', permissionsStr);
          localStorage.setItem('currentUserPermissions', permissionsStr);
        } else {
          sessionStorage.removeItem('currentUserPermissions');
          localStorage.removeItem('currentUserPermissions');
        }
      } catch (error) {
        logger.warn('更新权限缓存失败:', error);
      }
    } else if (!result.valid) {
      lastVerifySuccess = null;
      if (shouldWipeAdminSession(result.error)) {
        await clearToken();
      }
    }

    return result;
    })();

    verifyInflight.set(inflightKey, run);
    try {
      return await run;
    } finally {
      if (verifyInflight.get(inflightKey) === run) verifyInflight.delete(inflightKey);
    }
  } catch (error) {
    logger.error('验证 Token 失败:', error);
    return { valid: false, error: '验证失败' };
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const result = await verifyToken([]);
  return result.valid;
}

export function getCurrentUser(): { username: string; role: string; name: string; region?: string; permissions?: string[] } | null {
  try {
    const username = readStorage('currentUser');
    const role = readStorage('currentUserRole');
    const name = readStorage('currentUserName');
    const region = readStorage('currentUserRegion') || undefined;
    const permissionsStr = readStorage('currentUserPermissions');
    const permissions = permissionsStr ? JSON.parse(permissionsStr) : undefined;

    if (!username || !role) return null;

    return {
      username,
      role,
      name: name || '',
      region,
      permissions,
    };
  } catch {
    return null;
  }
}

/** 高危操作二次验证：走 admin-password，不读客户端明文库 */
export async function verifyCurrentUserPassword(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: '未登录' };
    }

    const response = await fetch('/.netlify/functions/admin-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'login',
        username: user.username,
        password,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `验证服务不可用 (${response.status})，请检查网络或稍后重试`,
      };
    }

    const result = await response.json();
    return {
      success: Boolean(result.success),
      error: result.error,
    };
  } catch (error) {
    logger.error('密码二次验证失败:', error);
    return { success: false, error: '验证过程出错' };
  }
}
