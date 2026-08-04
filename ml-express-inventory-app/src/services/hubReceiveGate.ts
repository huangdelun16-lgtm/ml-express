import { probeCloudConnection } from './cloudConnection';
import { refreshInventoryCloudSession } from './authService';
import { isCloudReachable } from '../utils/networkReachability';
import { isSupabaseConfigured } from './supabase';

export type HubCloudGateResult =
  | { ok: true }
  | { ok: false; reason: 'notConfigured' | 'notAuthenticated' | 'offline' };

/** 连续扫码入库时复用最近一次校验，避免每次点击都探测网络 + 刷新 JWT */
const GATE_OK_TTL_MS = 45_000;
let lastGateOkAt = 0;

export function invalidateHubReceiveCloudGate(): void {
  lastGateOkAt = 0;
}

/** 到站签收前：必须能连上云端追踪（弱网时快速失败） */
export async function ensureHubReceiveCloudReady(options?: {
  force?: boolean;
  /** 写操作前强制 refresh JWT，避免缓存 gate 导致 RLS 误报 */
  forWrite?: boolean;
}): Promise<HubCloudGateResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'notConfigured' };
  }
  if (options?.forWrite) {
    if (!(await isCloudReachable())) {
      return { ok: false, reason: 'offline' };
    }
    try {
      await refreshInventoryCloudSession();
      lastGateOkAt = Date.now();
      return { ok: true };
    } catch {
      return { ok: false, reason: 'notAuthenticated' };
    }
  }
  if (!options?.force && Date.now() - lastGateOkAt < GATE_OK_TTL_MS) {
    return { ok: true };
  }
  if (!(await isCloudReachable())) {
    return { ok: false, reason: 'offline' };
  }
  const conn = await probeCloudConnection();
  if (!conn.configured || !conn.authenticated) {
    return { ok: false, reason: 'notAuthenticated' };
  }
  lastGateOkAt = Date.now();
  return { ok: true };
}
