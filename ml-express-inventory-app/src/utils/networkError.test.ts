import { describe, expect, it } from 'vitest';
import { isLikelyNetworkError, withTimeout } from './networkError';

describe('isLikelyNetworkError', () => {
  it('detects common network failures', () => {
    expect(isLikelyNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isLikelyNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isLikelyNetworkError('networkTimeout')).toBe(true);
  });

  it('ignores auth errors', () => {
    expect(isLikelyNetworkError(new Error('authSessionExpired'))).toBe(false);
  });
});

describe('withTimeout', () => {
  it('rejects when promise exceeds timeout', async () => {
    await expect(
      withTimeout(
        new Promise((resolve) => setTimeout(() => resolve('late'), 50)),
        5,
      ),
    ).rejects.toThrow('networkTimeout');
  });

  it('resolves when promise completes in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok');
  });
});
