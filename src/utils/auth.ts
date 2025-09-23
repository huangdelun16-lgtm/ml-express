// 安全相关工具：密码哈希、口令校验、登录失败锁定、会话管理

export type AdminSession = {
  username: string;
  role: string;
  loginTime: string; // ISO string
  expiresAt: string; // ISO string
  name?: string;
  birthday?: string;
  idNumber?: string;
  address?: string;
  phone?: string;
  salary?: number;
};

// 权限映射表
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'city_rider': ['/admin/city/transport'], // 骑手：可以打开同城运输
  'cross_clearance': ['/admin/inventory'], // 跨境清关员：只能打开跨境包裹
  'accountant': ['/admin/finance', '/admin/inventory', '/admin/transport', '/admin/city/transport', '/admin/scan', '/admin/mobile'], // 会计：除了控制台其他都可以
  'city_accountant': ['/admin/finance', '/admin/inventory', '/admin/transport', '/admin/city/transport', '/admin/scan', '/admin/mobile'], // 同城会计：除了控制台其他都可以
  'cross_accountant': ['/admin/finance', '/admin/inventory', '/admin/transport', '/admin/city/transport', '/admin/scan', '/admin/mobile'], // 跨境会计：除了控制台其他都可以
  'manager': ['/admin/dashboard', '/admin/finance', '/admin/inventory', '/admin/transport', '/admin/city/transport', '/admin/scan', '/admin/mobile', '/admin/db-debug'], // 经理：所有页面
  'master': ['/admin/dashboard', '/admin/finance', '/admin/inventory', '/admin/transport', '/admin/city/transport', '/admin/scan', '/admin/mobile', '/admin/db-debug'], // 超级管理员：所有页面
  // 移除了staff角色，不再使用
};

// 检查用户是否有权限访问特定路径
export function hasPermission(userRole: string, path: string): boolean {
  // 标准化角色名称（去除空格并转为小写）
  const normalizedRole = (userRole || '').trim().toLowerCase();
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  return permissions.includes(path);
}

// 角色显示名称映射
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  'city_rider': 'rider',
  'cross_clearance': 'clearance',
  'accountant': 'accountant',
  'city_accountant': 'city_accountant',
  'cross_accountant': 'cross_accountant',
  'manager': 'manager',
  'master': 'master',
  'staff': 'rider' // staff显示为rider
};

// 获取角色的显示名称
export function getRoleDisplayName(userRole: string): string {
  const normalizedRole = (userRole || '').trim().toLowerCase();
  return ROLE_DISPLAY_NAMES[normalizedRole] || userRole;
}

// 获取用户可访问的所有路径
export function getUserPermissions(userRole: string): string[] {
  // 标准化角色名称（去除空格并转为小写）
  const normalizedRole = (userRole || '').trim().toLowerCase();
  return ROLE_PERMISSIONS[normalizedRole] || [];
}

const SESSION_KEY = 'adminSession';
const FAILED_KEY = '__ADMIN_FAILED_LOGIN__';

const SESSION_HOURS = 8; // 会话有效期（小时）
const LOCK_MAX_ATTEMPTS = 5; // 最大失败次数
const LOCK_MINUTES = 10; // 锁定时长（分钟）

export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isHashedPassword(s: string): boolean {
  return /^[a-f0-9]{64}$/i.test(s);
}

export function isStrongPassword(plain: string): boolean {
  if (!plain || plain.length < 8) return false;
  const hasUpper = /[A-Z]/.test(plain);
  const hasLower = /[a-z]/.test(plain);
  const hasNumber = /\d/.test(plain);
  const hasSymbol = /[^A-Za-z0-9]/.test(plain);
  return hasUpper && hasLower && hasNumber && hasSymbol;
}

// 登录失败统计与锁定
type FailedInfo = { count: number; lockedUntil?: string };

function readFailedInfo(): FailedInfo {
  try {
    const raw = sessionStorage.getItem(FAILED_KEY);
    if (!raw) return { count: 0 };
    const info = JSON.parse(raw) as FailedInfo;
    if (info.lockedUntil && new Date(info.lockedUntil).getTime() > Date.now()) {
      return info;
    }
    // 锁定已过期或不存在
    return { count: info.count || 0 };
  } catch {
    return { count: 0 };
  }
}

function writeFailedInfo(info: FailedInfo) {
  try { sessionStorage.setItem(FAILED_KEY, JSON.stringify(info)); } catch {}
}

export function getRemainingLockMs(): number {
  const info = readFailedInfo();
  if (!info.lockedUntil) return 0;
  const ms = new Date(info.lockedUntil).getTime() - Date.now();
  return ms > 0 ? ms : 0;
}

export function recordFailedLogin(): { locked: boolean; remainingMs: number } {
  const info = readFailedInfo();
  const count = (info.count || 0) + 1;
  if (count >= LOCK_MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
    const updated: FailedInfo = { count, lockedUntil };
    writeFailedInfo(updated);
    return { locked: true, remainingMs: LOCK_MINUTES * 60 * 1000 };
  }
  writeFailedInfo({ count });
  return { locked: false, remainingMs: 0 };
}

export function resetFailedLogin(): void {
  try { sessionStorage.removeItem(FAILED_KEY); } catch {}
}

// 会话管理
export function setAdminSession(username: string, role: string): void {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  const sess: AdminSession = {
    username,
    role,
    loginTime: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess)); } catch {}
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const sess = JSON.parse(raw) as AdminSession;
    if (new Date(sess.expiresAt).getTime() <= Date.now()) {
      clearAdminSession();
      return null;
    }
    return sess;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}


