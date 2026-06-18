import { describe, expect, it } from 'vitest';
import type { InventoryStoreSession } from '../services/authService';
import { resolveStoreHubCode, listOutboundDestinationOptions, isOwnStationOutboundDestination } from './storeZone';

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

describe('listOutboundDestinationOptions', () => {
  it('excludes MDY hub for MDY station', () => {
    const opts = listOutboundDestinationOptions(
      session({ storeCode: 'MDY001', region: 'mandalay', hubCode: 'MDY' }),
    );
    expect(opts).not.toContain('MDY');
    expect(opts).toContain('YGN');
  });

  it('excludes MSE for MUSE station (木姐)', () => {
    const opts = listOutboundDestinationOptions(
      session({ storeCode: 'MUSE001', region: 'muse', hubCode: 'MSE' }),
    );
    expect(opts).not.toContain('MSE');
    expect(opts).toContain('MDY');
  });
});

describe('isOwnStationOutboundDestination', () => {
  it('matches own hub code', () => {
    expect(
      isOwnStationOutboundDestination(
        'MDY',
        session({ storeCode: 'MDY001', hubCode: 'MDY' }),
      ),
    ).toBe(true);
  });

  it('matches MSE for muse hub', () => {
    expect(
      isOwnStationOutboundDestination(
        'MSE',
        session({ storeCode: 'MUSE001', hubCode: 'MSE' }),
      ),
    ).toBe(true);
  });
});
