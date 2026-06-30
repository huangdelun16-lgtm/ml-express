import { describe, expect, it } from 'vitest';
import type { InventoryStoreSession } from '../services/authService';
import {
  canEditItemCustomerProfile,
  isItemCustomerProfileLocked,
} from './itemCustomerProfileEdit';

const museStore: InventoryStoreSession = {
  id: '1',
  storeCode: 'MUSE001',
  storeName: 'MUSE',
  region: 'MUSE',
  address: '',
  storeType: 'hub',
  loggedInAt: '',
  hubCode: 'MUSE',
};

const ygnStore: InventoryStoreSession = {
  id: '2',
  storeCode: 'YGN001',
  storeName: 'YGN',
  region: 'YGN',
  address: '',
  storeType: 'hub',
  loggedInAt: '',
  hubCode: 'YGN',
};

describe('isItemCustomerProfileLocked', () => {
  it('locks after destination hub receive marker', () => {
    expect(
      isItemCustomerProfileLocked({
        barcode: 'YGN260001',
        hub_arrived_at: '2026-06-21T00:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('locks after customer signed', () => {
    expect(
      isItemCustomerProfileLocked({
        barcode: 'YGN260001',
        customer_signed_at: '2026-06-21T00:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('allows edit while in transit', () => {
    expect(
      isItemCustomerProfileLocked({
        barcode: 'YGN260001',
        owner_store_code: 'MUSE001',
        final_destination: 'YGN',
        packed_bundle_barcode: 'PKG26YGN105310001',
      }),
    ).toBe(false);
  });
});

describe('canEditItemCustomerProfile', () => {
  const inTransitYgnOrder = {
    barcode: 'YGN260001',
    owner_store_code: 'MUSE001',
    final_destination: 'YGN',
    destination: 'YGN',
    packed_bundle_barcode: 'PKG26YGN105310001',
  };

  it('allows origin hub before destination pack sign', () => {
    expect(canEditItemCustomerProfile(museStore, inTransitYgnOrder, 'MUSE')).toBe(true);
  });

  it('allows destination hub before pack sign', () => {
    expect(canEditItemCustomerProfile(ygnStore, inTransitYgnOrder, 'YGN')).toBe(true);
  });

  it('denies unrelated hub', () => {
    expect(
      canEditItemCustomerProfile(
        { ...ygnStore, storeCode: 'MDY001', hubCode: 'MDY' },
        inTransitYgnOrder,
        'MDY',
      ),
    ).toBe(false);
  });

  it('denies origin after destination hub receive', () => {
    expect(
      canEditItemCustomerProfile(museStore, {
        ...inTransitYgnOrder,
        hub_arrived_at: '2026-06-21T00:00:00.000Z',
      }),
    ).toBe(false);
  });
});
