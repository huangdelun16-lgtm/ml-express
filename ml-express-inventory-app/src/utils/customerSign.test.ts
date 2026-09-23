import { describe, expect, it } from 'vitest';
import type { InventoryStoreSession } from '../services/authService';
import { canMarkCustomerSigned, isDestinationHubViewer } from './customerSign';

function store(partial: Partial<InventoryStoreSession> & Pick<InventoryStoreSession, 'storeCode'>): InventoryStoreSession {
  return {
    id: '1',
    storeName: partial.storeCode,
    storeType: 'transit_station',
    hubCode: partial.hubCode,
    region: partial.region ?? partial.hubCode ?? '',
    address: '',
    loggedInAt: '2026-09-06T00:00:00.000Z',
    ...partial,
  };
}

describe('isDestinationHubViewer', () => {
  it('shows customer quote only on the destination hub', () => {
    const mdyOrder = { destination: 'MDY', final_destination: 'MDY' };
    expect(isDestinationHubViewer(store({ storeCode: 'MDY001', hubCode: 'MDY' }), mdyOrder)).toBe(true);
    expect(isDestinationHubViewer(store({ storeCode: 'MUSE001', hubCode: 'MSE' }), mdyOrder)).toBe(false);
    expect(isDestinationHubViewer(store({ storeCode: 'YGN001', hubCode: 'YGN' }), mdyOrder)).toBe(false);
  });

  it('treats Muse / MSE as the same destination hub', () => {
    const museOrder = { destination: 'MUSE', final_destination: 'MSE' };
    expect(isDestinationHubViewer(store({ storeCode: 'MUSE001', hubCode: 'MSE' }), museOrder)).toBe(true);
    expect(isDestinationHubViewer(store({ storeCode: 'MDY001', hubCode: 'MDY' }), museOrder)).toBe(false);
  });

  it('lets the truck leg hub sign a customer from another region', () => {
    const polAtMdy = {
      barcode: 'POL260801001',
      hub_arrived_at: '2026-09-22T00:00:00.000Z',
      final_destination: 'POL',
      destination: 'POL',
      delivery_hub_code: 'MDY',
      owner_store_code: 'MUSE001',
    };
    const mdy = store({ storeCode: 'MDY001', hubCode: 'MDY' });
    const pol = store({ storeCode: 'POL001', hubCode: 'POL' });
    expect(canMarkCustomerSigned(mdy, polAtMdy)).toBe(true);
    expect(canMarkCustomerSigned(pol, polAtMdy)).toBe(false);
    expect(isDestinationHubViewer(mdy, polAtMdy)).toBe(true);
    expect(isDestinationHubViewer(pol, polAtMdy)).toBe(false);
  });

  it('lets admin see the quote and hides it when destination is missing', () => {
    expect(
      isDestinationHubViewer(store({ storeCode: 'ADMIN001', hubCode: 'ADMIN' }), { destination: 'MDY' }),
    ).toBe(true);
    expect(isDestinationHubViewer(store({ storeCode: 'MDY001', hubCode: 'MDY' }), { destination: '' })).toBe(
      false,
    );
  });
});
