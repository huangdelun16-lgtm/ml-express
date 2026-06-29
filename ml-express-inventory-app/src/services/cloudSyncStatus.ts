import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InventoryStoreSession } from './authService';
import { ensureInventoryCloudAuth } from './authService';
import { cancelAutoCloudSyncDebounce } from './cloudAutoSync';
import { getCloudSyncQueueSnapshot, type CloudSyncOpType } from './inventoryCloudQueue';
import { syncPlatformInventoryCloud } from './inventoryService';
import { nowIso } from './database';
import { isSupabaseConfigured } from './supabase';

const SYNC_META_KEY = 'inventory_last_cloud_sync_v1';

export type CloudSyncMeta = {
  storeCode: string;
  at: string;
  ok: boolean;
  pendingAfter?: number;
  error?: string;
};

export type CloudConnectionStatus = {
  configured: boolean;
  authenticated: boolean;
  errorCode?: string;
};

export type CloudSyncStatus = {
  connection: CloudConnectionStatus;
  pending: number;
  queueError: string | null;
  oldestOpType: string | null;
  highestPriorityType: CloudSyncOpType | null;
  pendingTruckLoad: number;
  pendingPack: number;
  pendingItem: number;
  lastSync: CloudSyncMeta | null;
};

export async function getLastCloudSyncMeta(storeCode: string): Promise<CloudSyncMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CloudSyncMeta;
    if (!parsed?.at || parsed.storeCode?.trim().toUpperCase() !== storeCode.trim().toUpperCase()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function saveCloudSyncMeta(meta: CloudSyncMeta): Promise<void> {
  await AsyncStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

export async function probeCloudConnection(): Promise<CloudConnectionStatus> {
  if (!isSupabaseConfigured()) {
    return { configured: false, authenticated: false, errorCode: 'supabaseNotConfigured' };
  }
  try {
    await ensureInventoryCloudAuth();
    return { configured: true, authenticated: true };
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code: unknown }).code)
        : e instanceof Error
          ? e.message
          : 'authSessionExpired';
    return { configured: true, authenticated: false, errorCode: code };
  }
}

export async function getCloudSyncStatus(
  store: InventoryStoreSession | null | undefined,
): Promise<CloudSyncStatus> {
  const connection = await probeCloudConnection();
  const storeCode = store?.storeCode?.trim() ?? '';
  const snapshot = storeCode
    ? await getCloudSyncQueueSnapshot(storeCode)
    : {
        pending: 0,
        lastError: null,
        oldestType: null,
        highestPriorityType: null,
        pendingTruckLoad: 0,
        pendingPack: 0,
        pendingItem: 0,
      };
  const lastSync = storeCode ? await getLastCloudSyncMeta(storeCode) : null;

  return {
    connection,
    pending: snapshot.pending,
    queueError: snapshot.lastError,
    oldestOpType: snapshot.oldestType,
    highestPriorityType: snapshot.highestPriorityType,
    pendingTruckLoad: snapshot.pendingTruckLoad,
    pendingPack: snapshot.pendingPack,
    pendingItem: snapshot.pendingItem,
    lastSync,
  };
}

/** 设置页「立即同步」：处理队列 + 推拉云端，并记录结果 */
export async function runManualCloudSync(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<{ pending: number }> {
  if (!isSupabaseConfigured()) {
    throw new Error('supabaseNotConfigured');
  }

  cancelAutoCloudSyncDebounce();
  const storeCode = store.storeCode.trim().toUpperCase();
  const at = nowIso();

  try {
    await syncPlatformInventoryCloud(store, hubCode);
    const snapshot = await getCloudSyncQueueSnapshot(storeCode);
    const ok = snapshot.pending === 0;
    await saveCloudSyncMeta({
      storeCode,
      at,
      ok,
      pendingAfter: snapshot.pending,
      error: ok ? undefined : snapshot.lastError ?? 'syncFailed',
    });
    if (!ok && snapshot.lastError) {
      throw new Error(snapshot.lastError);
    }
    return { pending: snapshot.pending };
  } catch (e: unknown) {
    const snapshot = await getCloudSyncQueueSnapshot(storeCode);
    const message =
      e instanceof Error
        ? e.message
        : snapshot.lastError ?? 'syncFailed';
    await saveCloudSyncMeta({
      storeCode,
      at,
      ok: false,
      pendingAfter: snapshot.pending,
      error: message,
    });
    throw e instanceof Error ? e : new Error(message);
  }
}

export async function recordAutoCloudSyncResult(
  store: InventoryStoreSession,
): Promise<void> {
  const storeCode = store.storeCode.trim().toUpperCase();
  const snapshot = await getCloudSyncQueueSnapshot(storeCode);
  await saveCloudSyncMeta({
    storeCode,
    at: nowIso(),
    ok: snapshot.pending === 0,
    pendingAfter: snapshot.pending,
    error: snapshot.lastError ?? undefined,
  });
}
