import {
  bindInventoryCloudSession,
  refreshInventoryCloudSession,
} from './authService';
import { isRetryableInventoryCloudWriteError } from '../utils/cloudAuthErrors';
import { invalidateHubReceiveCloudGate } from './hubReceiveGate';

/** 写云端前绑定 JWT；遇 RLS/会话错误强制 refresh 再试一次 */
export async function withInventoryCloudWrite<T>(fn: () => Promise<T>): Promise<T> {
  await bindInventoryCloudSession();
  try {
    return await fn();
  } catch (error) {
    if (!isRetryableInventoryCloudWriteError(error)) throw error;
    await refreshInventoryCloudSession({ force: true });
    invalidateHubReceiveCloudGate();
    await bindInventoryCloudSession();
    return await fn();
  }
}
