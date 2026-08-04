import { describe, expect, it, vi } from 'vitest';

vi.mock('./authService', () => ({
  ensureInventoryCloudAuth: vi.fn(async () => ({ id: '1', storeCode: 'MDY001' })),
  refreshInventoryCloudSession: vi.fn(async () => ({ id: '1', storeCode: 'MDY001' })),
}));

vi.mock('./hubReceiveGate', () => ({
  invalidateHubReceiveCloudGate: vi.fn(),
}));

describe('cloudWriteGuard', () => {
  it('retries once after RLS failure', async () => {
    const { withInventoryCloudWrite } = await import('./cloudWriteGuard');
    const { refreshInventoryCloudSession } = await import('./authService');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('new row violates row-level security policy'))
      .mockResolvedValueOnce('ok');

    await expect(withInventoryCloudWrite(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(refreshInventoryCloudSession).toHaveBeenCalledTimes(1);
  });
});
