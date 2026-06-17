import { describe, expect, it } from 'vitest';
import type { InventoryStoreSession } from '../services/authService';
import type { InventoryItemListRow } from '../types/inventory';
import {
  isVisibleInExpressDetailsList,
  isVisibleInPackedList,
  shouldMergeCloudItemToLocal,
} from './expressDetailsVisibility';

function store(code: string): InventoryStoreSession {
  return {
    id: '1',
    storeCode: code,
    storeName: code,
    region: '',
    address: '',
    storeType: 'hub',
    loggedInAt: '',
  };
}

function listRow(overrides: Partial<InventoryItemListRow>): InventoryItemListRow {
  return {
    id: 'item-1',
    barcode: 'YGN260531120000',
    input_barcode: '',
    name: '测试商品',
    spec: '',
    unit: '1 Pcs',
    weight: '',
    qty_on_hand: 1,
    min_qty: 0,
    note: '',
    owner_store_code: 'MUSE001',
    final_destination: 'YGN',
    created_at: '',
    updated_at: '',
    stocked_in: true,
    packed: true,
    hub_arrived: false,
    hub_transit_released: false,
    hub_transit_shipped: false,
    customer_signed: false,
    parent_pack_barcode: 'PKG26MDY105310001',
    ...overrides,
  };
}

describe('expressDetailsVisibility', () => {
  it('MUSE 发站可见本店各目的地订单', () => {
    const muse = store('MUSE001');
    const row = listRow({ final_destination: 'YGN', owner_store_code: 'MUSE001' });
    expect(isVisibleInExpressDetailsList(row, muse, 'MUSE')).toBe(true);
  });

  it('YGN 目的站不显示经 MDY 中转的订单', () => {
    const ygn = store('YGN001');
    const row = listRow({
      final_destination: 'MDY',
      owner_store_code: 'MUSE001',
      parent_pack_barcode: 'PKG26MDY105310001',
    });
    expect(isVisibleInExpressDetailsList(row, ygn, 'YGN')).toBe(false);
  });

  it('MDY 中转站可见经本站中转的订单', () => {
    const mdy = store('MDY001');
    const row = listRow({
      final_destination: 'YGN',
      owner_store_code: 'MUSE001',
      parent_pack_barcode: 'PKG26MDY105310001',
    });
    expect(isVisibleInExpressDetailsList(row, mdy, 'MDY')).toBe(true);
  });

  it('YGN 打包列表不显示发往 MDY 的包', () => {
    const ygn = store('YGN001');
    expect(
      isVisibleInPackedList(
        {
          bundle_barcode: 'PKG26MDY105310001',
          owner_store_code: 'MUSE001',
          truck_leg_destination: 'MDY',
        },
        ygn,
        'YGN',
      ),
    ).toBe(false);
  });

  it('shouldMergeCloudItemToLocal 从条码推断目的地', () => {
    const ygn = store('YGN001');
    expect(
      shouldMergeCloudItemToLocal(
        {
          barcode: 'YGN260531120000',
          owner_store_code: 'MUSE001',
          final_destination: '',
          packed_bundle_barcode: 'PKG26YGN105310001',
        },
        ygn,
        'YGN',
      ),
    ).toBe(true);
    expect(
      shouldMergeCloudItemToLocal(
        {
          barcode: 'MDY260531120000',
          owner_store_code: 'MUSE001',
          final_destination: '',
          packed_bundle_barcode: 'PKG26MDY105310001',
        },
        ygn,
        'YGN',
      ),
    ).toBe(false);
  });
});
