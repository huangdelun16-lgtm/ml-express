import { describe, expect, it } from 'vitest';
import type { InventoryItemListRow } from '../types/inventory';
import type { InventoryStoreSession } from '../services/authService';
import {
  collectSameCustomerPeers,
  resolveCustomerKey,
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
});
