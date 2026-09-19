import { describe, expect, it } from 'vitest';
import type { InventoryStoreSession } from '../services/authService';
import type { PackedShipmentDetail } from '../types/inventory';
import { verifyOutboundPacksForLoad } from './verifyOutboundPacks';

const store = { storeCode: 'YGN001' } as InventoryStoreSession;

function pack(barcode: string): PackedShipmentDetail {
  return { id: barcode, bundle_barcode: barcode } as PackedShipmentDetail;
}

describe('verifyOutboundPacksForLoad', () => {
  it('drops packs that are only in memory cache', async () => {
    const kept = await verifyOutboundPacksForLoad(
      [pack('PKG-CLOUD'), pack('PKG-GHOST')],
      store,
      async (row) => row.bundle_barcode === 'PKG-CLOUD',
    );
    expect(kept.map((row) => row.bundle_barcode)).toEqual(['PKG-CLOUD']);
  });

  it('drops packs whose cloud backfill throws', async () => {
    const kept = await verifyOutboundPacksForLoad(
      [pack('PKG-OK'), pack('PKG-FAIL')],
      store,
      async (row) => {
        if (row.bundle_barcode === 'PKG-FAIL') throw new Error('missing');
        return true;
      },
    );
    expect(kept.map((row) => row.bundle_barcode)).toEqual(['PKG-OK']);
  });
});
