import { probeCloudConnection } from './cloudSyncStatus';
import { isSupabaseConfigured } from './supabase';

export type HubCloudGateResult =
  | { ok: true }
  | { ok: false; reason: 'notConfigured' | 'notAuthenticated' };

/** 到站签收前：必须能连上云端追踪 */
export async function ensureHubReceiveCloudReady(): Promise<HubCloudGateResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'notConfigured' };
  }
  const conn = await probeCloudConnection();
  if (!conn.configured || !conn.authenticated) {
    return { ok: false, reason: 'notAuthenticated' };
  }
  return { ok: true };
}
