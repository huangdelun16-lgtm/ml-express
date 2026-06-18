import type { InventoryStoreSession } from './authService';
import { syncPlatformInventoryCloud } from './inventoryService';
import { isSupabaseConfigured } from './supabase';

const DEBOUNCE_MS = 2500;
/** 全量同步最短间隔，避免频繁打云端 */
const MIN_INTERVAL_MS = 45_000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> | null = null;
let lastFullSyncAt = 0;

export function cancelAutoCloudSyncDebounce(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/**
 * 请求一次全量云端同步（队列重试 + 拉取 + 推送），带防抖与最短间隔。
 * 失败静默，不打扰操作；设置页可 force 立即执行。
 */
export function requestAutoCloudSync(
  store: InventoryStoreSession,
  hubCode: string,
  options?: { force?: boolean },
): void {
  if (!isSupabaseConfigured()) return;

  if (options?.force) {
    cancelAutoCloudSyncDebounce();
    void runAutoCloudSync(store, hubCode, true);
    return;
  }

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runAutoCloudSync(store, hubCode, false);
  }, DEBOUNCE_MS);
}

/** 设置页「立即同步」：等待全量同步完成 */
export async function awaitForceCloudSync(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  cancelAutoCloudSyncDebounce();
  await runAutoCloudSync(store, hubCode, true);
}

async function runAutoCloudSync(
  store: InventoryStoreSession,
  hubCode: string,
  force: boolean,
): Promise<void> {
  const now = Date.now();
  if (!force && now - lastFullSyncAt < MIN_INTERVAL_MS) return;

  if (inflight) {
    await inflight.catch(() => undefined);
    if (!force && Date.now() - lastFullSyncAt < MIN_INTERVAL_MS) return;
  }

  lastFullSyncAt = Date.now();
  inflight = syncPlatformInventoryCloud(store, hubCode).finally(() => {
    inflight = null;
  });
  await inflight.catch(() => undefined);
}
