import {
  bindInventoryCloudSession,
  refreshInventoryCloudSession,
} from './authService';
import { isRetryableInventoryCloudWriteError } from '../utils/cloudAuthErrors';
import { invalidateHubReceiveCloudGate, hubScanAuthIsFresh, clearHubScanAuthReady, markHubScanAuthReady } from './hubReceiveGate';

/** 写云端前绑定 JWT；扫码会话里已经登录过就直接写，失败再重新登录 */
export async function withInventoryCloudWrite<T>(fn: () => Promise<T>): Promise<T> {
  if (hubScanAuthIsFresh()) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableInventoryCloudWriteError(error)) throw error;
      clearHubScanAuthReady();
      await refreshInventoryCloudSession({ force: true });
      invalidateHubReceiveCloudGate();
      await bindInventoryCloudSession();
      markHubScanAuthReady();
      return await fn();
    }
  }
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
