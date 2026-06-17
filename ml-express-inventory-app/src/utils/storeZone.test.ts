import { describe, expect, it } from 'vitest';
import type { InventoryStoreSession } from '../services/authService';
import { resolveStoreHubCode } from './storeZone';

function session(partial: Partial<InventoryStoreSession>): InventoryStoreSession {
  return {
    id: '1',
    storeCode: 'MUSE001',
    storeName: 'MUSE',
    region: '',
    address: '',
    storeType: 'transit_station',
    loggedInAt: '',
    ...partial,
  };
}

describe('resolveStoreHubCode', () => {
  it('prefers JWT hubCode over store_code prefix', () => {
    expect(
      resolveStoreHubCode(
        session({ storeCode: 'MUSE001', region: 'MUSE', hubCode: 'YGN' }),
      ),
    ).toBe('YGN');
  });

  it('falls back to region when hubCode missing', () => {
    expect(resolveStoreHubCode(session({ storeCode: 'YGN002', region: 'YGN' }))).toBe('YGN');
  });
});
