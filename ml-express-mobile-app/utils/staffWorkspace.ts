import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

/** 员工端工作区：管理督导 vs 骑手配送（保留双角色，不删管理员） */
export type StaffWorkspaceMode = 'admin' | 'courier';

export const STAFF_WORKSPACE_MODE_KEY = 'staff_workspace_mode';
export const STAFF_WORKSPACE_CHANGED_EVENT = 'staff_workspace_changed';

export type StaffRole = 'admin' | 'manager' | 'operator' | 'finance' | string;

export function isManagementRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'manager' || role === 'finance';
}

export function canAccessPackageManagement(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'manager';
}

export function canAccessCourierManagement(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'manager';
}

export function canAccessFinanceManagement(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'manager' || role === 'finance';
}

export function canAccessPerformanceAnalytics(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'manager';
}

export function isCourierPosition(position: string | null | undefined): boolean {
  return position === '骑手' || position === '骑手队长';
}

/** 可进入管理督导工作区（管理员 / 经理 / 财务） */
export function canUseAdminWorkspace(role: string | null | undefined): boolean {
  return isManagementRole(role);
}

/** 可进入骑手配送工作区（职位为骑手，或已绑定 courierId） */
export function canUseCourierWorkspace(
  position: string | null | undefined,
  courierId?: string | null,
): boolean {
  return isCourierPosition(position) || Boolean(courierId && String(courierId).trim());
}

/** 同时具备管理与配送能力的双岗账号 */
export function isDualCapabilityStaff(opts: {
  role: string | null | undefined;
  position: string | null | undefined;
  courierId?: string | null;
}): boolean {
  return canUseAdminWorkspace(opts.role) && canUseCourierWorkspace(opts.position, opts.courierId);
}

export function defaultWorkspaceMode(opts: {
  role: string | null | undefined;
  position: string | null | undefined;
  courierId?: string | null;
}): StaffWorkspaceMode {
  const adminOk = canUseAdminWorkspace(opts.role);
  const courierOk = canUseCourierWorkspace(opts.position, opts.courierId);
  if (adminOk && !courierOk) return 'admin';
  if (!adminOk && courierOk) return 'courier';
  if (adminOk && courierOk) return 'admin'; // 双岗默认督导，可在账号页切换配送
  return 'courier';
}

export async function readStaffWorkspaceContext(): Promise<{
  role: string;
  position: string;
  courierId: string | null;
  mode: StaffWorkspaceMode;
}> {
  const [role, position, courierId, saved] = await Promise.all([
    AsyncStorage.getItem('currentUserRole'),
    AsyncStorage.getItem('currentUserPosition'),
    AsyncStorage.getItem('currentCourierId'),
    AsyncStorage.getItem(STAFF_WORKSPACE_MODE_KEY),
  ]);
  const safeRole = role || 'operator';
  const safePosition = position || '';
  const adminOk = canUseAdminWorkspace(safeRole);
  const courierOk = canUseCourierWorkspace(safePosition, courierId);

  let mode: StaffWorkspaceMode =
    saved === 'admin' || saved === 'courier'
      ? saved
      : defaultWorkspaceMode({ role: safeRole, position: safePosition, courierId });

  // 权限收缩：无管理权不能停在 admin；无配送权不能停在 courier
  if (mode === 'admin' && !adminOk) mode = 'courier';
  if (mode === 'courier' && !courierOk && adminOk) mode = 'admin';
  if (mode === 'courier' && !courierOk && !adminOk) mode = 'courier';

  return { role: safeRole, position: safePosition, courierId, mode };
}

export async function setStaffWorkspaceMode(mode: StaffWorkspaceMode): Promise<StaffWorkspaceMode> {
  const ctx = await readStaffWorkspaceContext();
  const adminOk = canUseAdminWorkspace(ctx.role);
  const courierOk = canUseCourierWorkspace(ctx.position, ctx.courierId);

  let next: StaffWorkspaceMode = mode;
  if (next === 'admin' && !adminOk) next = courierOk ? 'courier' : 'admin';
  if (next === 'courier' && !courierOk) next = adminOk ? 'admin' : 'courier';

  await AsyncStorage.setItem(STAFF_WORKSPACE_MODE_KEY, next);
  DeviceEventEmitter.emit(STAFF_WORKSPACE_CHANGED_EVENT, { mode: next });
  return next;
}

export async function ensureStaffWorkspaceModeInitialized(opts: {
  role: string;
  position: string;
  courierId?: string | null;
}): Promise<StaffWorkspaceMode> {
  const mode = defaultWorkspaceMode(opts);
  await AsyncStorage.setItem(STAFF_WORKSPACE_MODE_KEY, mode);
  return mode;
}
