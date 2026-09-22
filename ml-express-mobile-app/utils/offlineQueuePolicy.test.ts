import { describe, expect, it } from 'vitest';
import {
  isOfflineQueueStuck,
  shouldSkipOfflineQueueItem,
  OFFLINE_QUEUE_SOFT_RETRY_LIMIT,
} from './offlineQueuePolicy';

describe('offlineQueuePolicy', () => {
  it('never skips an item because of retry count', () => {
    expect(shouldSkipOfflineQueueItem(0)).toBe(false);
    expect(shouldSkipOfflineQueueItem(OFFLINE_QUEUE_SOFT_RETRY_LIMIT)).toBe(false);
    expect(shouldSkipOfflineQueueItem(99)).toBe(false);
  });

  it('marks items stuck at the soft retry limit', () => {
    expect(isOfflineQueueStuck(4)).toBe(false);
    expect(isOfflineQueueStuck(5)).toBe(true);
    expect(isOfflineQueueStuck(6)).toBe(true);
  });
});
