import {
  ensureInventoryCloudAuth,
  refreshInventoryCloudSession,
} from './authService';
import {
  isInventoryCloudAuthError,
  isInventoryRlsPolicyError,
} from '../utils/cloudAuthErrors';
import { invalidateHubReceiveCloudGate } from './hubReceiveGate';

function isRetryableCloudWriteError(error: unknown): boolean {
  if (isInventoryCloudAuthError(error)) return true;
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
  return isInventoryRlsPolicyError(msg);
}

/** 写云端前刷新 JWT；遇 RLS/会话错误自动 refresh 并重试一次 */
export async function withInventoryCloudWrite<T>(fn: () => Promise<T>): Promise<T> {
  await ensureInventoryCloudAuth();
  try {
    return await fn();
  } catch (error) {
    if (!isRetryableCloudWriteError(error)) throw error;
    await refreshInventoryCloudSession();
    invalidateHubReceiveCloudGate();
    return await fn();
  }
}
