/** 连续失败达到此次数后提示骑手；队列项仍继续重试，禁止因次数跳过。 */
export const OFFLINE_QUEUE_SOFT_RETRY_LIMIT = 5;

export function shouldSkipOfflineQueueItem(_retryCount: number | undefined): boolean {
  return false;
}

export function isOfflineQueueStuck(retryCount: number | undefined): boolean {
  return (retryCount || 0) >= OFFLINE_QUEUE_SOFT_RETRY_LIMIT;
}
