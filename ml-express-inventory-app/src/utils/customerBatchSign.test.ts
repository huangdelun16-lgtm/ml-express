import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseUrl: () => '',
  getSupabaseAnonKey: () => '',
  supabase: {},
}));

import type { InventoryItemListRow } from '../types/inventory';
import type { InventoryStoreSession } from '../services/authService';
import {
  buildCodAlertFeeGroups,
  collectPackagingStockInSiblings,
  collectSameCustomerPeers,
  fxLockFeeMmkForItem,
  packagingStockInSignBatch,
  resolveCustomerKey,
  resolvePackagingStockInSignIds,
  uniqueSignFeeMmk,
  validateBatchSignSelection,
} from './customerBatchSign';

const store: InventoryStoreSession = {
  id: '1',
  storeCode: 'YGN001',
  storeName: 'YGN',
  storeType: 'transit_station',
  hubCode: 'YGN',
  region: 'YGN',
  address: '',
  loggedInAt: '2026-07-20T00:00:00.000Z',
};

function row(partial: Partial<InventoryItemListRow> & Pick<InventoryItemListRow, 'id'>): InventoryItemListRow {
  return {
    barcode: partial.barcode ?? partial.id,
    input_barcode: partial.input_barcode ?? '',
    name: partial.name ?? 'Item',
    spec: '',
    unit: '1 Pcs',
    weight: '',
    qty_on_hand: 1,
    min_qty: 0,
    note: '',
    recipient_name: partial.recipient_name ?? partial.customer_name ?? 'Ko Mg',
    customer_name: partial.customer_name ?? partial.recipient_name ?? 'Ko Mg',
    final_destination: 'YGN',
    destination: 'YGN',
    owner_store_code: 'YGN001',
    hub_arrived_at: '2026-07-20T00:00:00.000Z',
    customer_signed_at: '',
    packed_at: '',
    packed_bundle_barcode: '',
    hub_transit_released_at: '',
    hub_transit_shipped_at: '',
    created_at: '',
    updated_at: '',
    stocked_in: true,
    packed: false,
    hub_arrived: true,
    hub_transit_released: false,
    hub_transit_shipped: false,
    customer_signed: false,
    ...partial,
  };
}

describe('customerBatchSign', () => {
  it('groups items by customer key', () => {
    const items = [
      row({ id: 'a', customer_name: 'Ko Mg' }),
      row({ id: 'b', customer_name: 'Ko Mg' }),
      row({ id: 'c', customer_name: 'Ma Hla' }),
    ];
    expect(resolveCustomerKey(items[0])).toBe('ko mg');
    expect(collectSameCustomerPeers(items, items[0], store).map((item) => item.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('validates same-customer batch selection', () => {
    expect(
      validateBatchSignSelection([
        row({ id: 'a', customer_name: 'Ko Mg' }),
        row({ id: 'b', customer_name: 'Ko Mg' }),
      ]),
    ).toBeNull();
    expect(
      validateBatchSignSelection([
        row({ id: 'a', customer_name: 'Ko Mg' }),
        row({ id: 'b', customer_name: 'Ma Hla' }),
      ]),
    ).toBe('batchSignMixedCustomer');
  });

  it('collects unsigned packaging stock-in siblings by (n-i) barcode', () => {
    const items = [
      row({ id: 'a', barcode: 'MDY555306070926(3-1)' }),
      row({ id: 'b', barcode: 'MDY555306070926(3-2)' }),
      row({ id: 'c', barcode: 'MDY555306070926(3-3)' }),
      row({ id: 'd', barcode: 'MDY555306070926(3-2)', customer_signed_at: '2026-09-07T00:00:00.000Z' }),
      row({ id: 'e', barcode: 'OTHER(2-1)' }),
    ];
    expect(
      collectPackagingStockInSiblings(items, items[1], store).map((item) => item.id),
    ).toEqual(['a', 'b', 'c']);
  });

  it('loads missing (n-i) siblings when the current list is incomplete', async () => {
    const anchor = row({ id: 'b', barcode: 'MDY555306070926(3-2)' });
    const extra = [
      row({ id: 'a', barcode: 'MDY555306070926(3-1)' }),
      row({ id: 'c', barcode: 'MDY555306070926(3-3)' }),
    ];
    const resolved = await resolvePackagingStockInSignIds(
      [anchor],
      [anchor],
      store,
      async () => extra,
    );
    expect(resolved.map((item) => item.barcode)).toEqual([
      'MDY555306070926(3-1)',
      'MDY555306070926(3-2)',
      'MDY555306070926(3-3)',
    ]);
  });

  it('counts a shared packaging-stock-in fee once and locks it on the first sibling', () => {
    const details = [
      { id: 'a', barcode: 'MDY1(3-1)', total_fee: '125000', payment_label: '到付', name: 'A' },
      { id: 'b', barcode: 'MDY1(3-2)', total_fee: '125000', payment_label: '到付', name: 'B' },
      { id: 'c', barcode: 'MDY1(3-3)', total_fee: '125000', payment_label: '到付', name: 'C' },
      { id: 'd', barcode: 'SOLO-1', total_fee: '10000', payment_label: '到付', name: 'Solo' },
    ];
    expect(uniqueSignFeeMmk(details.slice(0, 3))).toBe(125000);
    expect(uniqueSignFeeMmk(details)).toBe(135000);
    expect(fxLockFeeMmkForItem(details[0], details.slice(0, 3))).toBe(125000);
    expect(fxLockFeeMmkForItem(details[1], details.slice(0, 3))).toBe(0);
    expect(fxLockFeeMmkForItem(details[2], details.slice(0, 3))).toBe(0);
    expect(packagingStockInSignBatch(details.slice(0, 3))).toEqual({
      base: 'MDY1',
      declaredTotal: 3,
      count: 3,
    });
    expect(buildCodAlertFeeGroups(details.slice(0, 3))).toEqual([
      {
        kind: 'packaging',
        count: 3,
        fee: 125000,
        barcodes: ['MDY1(3-1)', 'MDY1(3-2)', 'MDY1(3-3)'],
      },
    ]);
  });
});
