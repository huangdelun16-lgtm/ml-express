import { describe, expect, it, vi } from 'vitest';

vi.mock('./authService', () => ({
  bindInventoryCloudSession: vi.fn(async () => ({ id: '1', storeCode: 'MDY001' })),
  ensureInventoryCloudAuth: vi.fn(async () => ({ id: '1', storeCode: 'MDY001' })),
  refreshInventoryCloudSession: vi.fn(async () => ({ id: '1', storeCode: 'MDY001' })),
}));

vi.mock('./hubReceiveGate', () => ({
  invalidateHubReceiveCloudGate: vi.fn(),
  hubScanAuthIsFresh: vi.fn(() => false),
  clearHubScanAuthReady: vi.fn(),
  markHubScanAuthReady: vi.fn(),
}));

describe('cloudWriteGuard', () => {
  it('retries once after RLS failure', async () => {
    const { withInventoryCloudWrite } = await import('./cloudWriteGuard');
    const { bindInventoryCloudSession, refreshInventoryCloudSession } = await import('./authService');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('new row violates row-level security policy'))
      .mockResolvedValueOnce('ok');

    await expect(withInventoryCloudWrite(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(bindInventoryCloudSession).toHaveBeenCalledTimes(2);
    expect(refreshInventoryCloudSession).toHaveBeenCalledTimes(1);
    expect(refreshInventoryCloudSession).toHaveBeenCalledWith({ force: true });
  });

  it('does not log in again while the scan session is still signed in', async () => {
    const gate = await import('./hubReceiveGate');
    vi.mocked(gate.hubScanAuthIsFresh).mockReturnValue(true);
    const { withInventoryCloudWrite } = await import('./cloudWriteGuard');
    const { bindInventoryCloudSession } = await import('./authService');
    vi.mocked(bindInventoryCloudSession).mockClear();
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withInventoryCloudWrite(fn)).resolves.toBe('ok');
    expect(bindInventoryCloudSession).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
