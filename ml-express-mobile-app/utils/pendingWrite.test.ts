import { describe, expect, it } from 'vitest';
import {
  isWriteOk,
  isWriteQueued,
  pendingWriteFailed,
  pendingWriteQueuedResult,
  pendingWriteSynced,
  pendingWriteUserMessage,
} from './pendingWrite';

describe('pendingWrite', () => {
  it('treats queued writes as accepted but not fully synced', () => {
    const queued = pendingWriteQueuedResult();
    expect(isWriteOk(queued)).toBe(true);
    expect(isWriteQueued(queued)).toBe(true);
    expect(isWriteQueued(pendingWriteSynced())).toBe(false);
    expect(isWriteOk(pendingWriteFailed())).toBe(false);
  });

  it('does not use the synced success copy when the write is only queued', () => {
    const msg = pendingWriteUserMessage('zh', pendingWriteQueuedResult(), '包裹已送达');
    expect(msg).toContain('待同步');
    expect(msg).not.toContain('已送达');
  });
});
