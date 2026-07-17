import { describe, expect, it } from 'vitest';
import type { InventoryStoreSession } from '../services/authService';
import { isTripNumber, resolveTripNumberPrefix } from './tripNumber';

function mockStore(partial: Pick<InventoryStoreSession, 'storeCode' | 'hubCode' | 'region'>): InventoryStoreSession {
  return {
    id: '1',
    storeCode: partial.storeCode,
    storeName: partial.storeCode,
    hubCode: partial.hubCode,
    region: partial.region,
    address: '',
    storeType: 'transit_station',
    loggedInAt: '',
  };
}

describe('tripNumber', () => {
  it('maps RUILI store to RUI prefix', () => {
    expect(resolveTripNumberPrefix(mockStore({
      storeCode: 'RUILI001',
      hubCode: 'RUI',
      region: 'RUILI',
    }))).toBe('RUI');
  });

  it('maps MUSE store to MSE regional prefix', () => {
    expect(resolveTripNumberPrefix(mockStore({
      storeCode: 'MUSE001',
      hubCode: 'MSE',
      region: 'MUSE',
    }))).toBe('MSE');
  });

  it('detects trip number format', () => {
    expect(isTripNumber('RUI0001')).toBe(true);
    expect(isTripNumber('MSE0042')).toBe(true);
    expect(isTripNumber('RUI26MDY4')).toBe(false);
  });
});
