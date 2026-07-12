import { probeCloudConnection } from './cloudConnection';
import { isCloudReachable } from '../utils/networkReachability';
import { isSupabaseConfigured } from './supabase';

export type HubCloudGateResult =
  | { ok: true }
  | { ok: false; reason: 'notConfigured' | 'notAuthenticated' | 'offline' };

/** 到站签收前：必须能连上云端追踪（弱网时快速失败） */
export async function ensureHubReceiveCloudReady(): Promise<HubCloudGateResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'notConfigured' };
  }
  if (!(await isCloudReachable())) {
    return { ok: false, reason: 'offline' };
  }
  const conn = await probeCloudConnection();
  if (!conn.configured || !conn.authenticated) {
    return { ok: false, reason: 'notAuthenticated' };
  }
  return { ok: true };
}
