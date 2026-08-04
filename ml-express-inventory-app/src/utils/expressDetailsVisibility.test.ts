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

  it('MDY 中转站：在 inbound 包内、未释放的中转订单不进快递明细', () => {
    const mdy = store('MDY001');
    const row = listRow({
      final_destination: 'YGN',
      owner_store_code: 'MUSE001',
      parent_pack_barcode: 'PKG26MDY105310001',
      hub_arrived: false,
      hub_transit_released: false,
    });
    expect(isVisibleInExpressDetailsList(row, mdy, 'MDY')).toBe(false);
  });

  it('MDY 中转站：释放后的中转订单可见于快递明细', () => {
    const mdy = store('MDY001');
    const row = listRow({
      final_destination: 'YGN',
      owner_store_code: 'MUSE001',
      parent_pack_barcode: '',
      hub_arrived: false,
      hub_transit_released: true,
    });
    expect(isVisibleInExpressDetailsList(row, mdy, 'MDY')).toBe(true);
  });

  it('LSO 目的站：未入库的本站订单不进快递明细', () => {
    const lso = store('LSO001');
    const row = listRow({
      final_destination: 'LSO',
      owner_store_code: 'MUSE001',
      parent_pack_barcode: 'RUI26LSO20001',
      hub_arrived: false,
    });
    expect(isVisibleInExpressDetailsList(row, lso, 'LSO')).toBe(false);
  });

  it('LSO 目的站：入库后的本站订单可见于快递明细', () => {
    const lso = store('LSO001');
    const row = listRow({
      final_destination: 'LSO',
      owner_store_code: 'MUSE001',
      parent_pack_barcode: '',
      hub_arrived: true,
      qty_on_hand: 1,
      packed: false,
    });
    expect(isVisibleInExpressDetailsList(row, lso, 'LSO')).toBe(true);
  });

  it('MUSE 多个入库订单（已打包、库存 0）仍可见于快递明细与打包列表', () => {
    const muse = store('MUSE001');
    const row = listRow({
      final_destination: 'YGN',
      owner_store_code: 'MUSE001',
      qty_on_hand: 0,
      packed: true,
      stocked_in: true,
      parent_pack_barcode: 'PKG26YGN10001',
    });
    expect(isVisibleInExpressDetailsList(row, muse, 'MUSE')).toBe(true);
    expect(
      isVisibleInPackedList(
        {
          bundle_barcode: 'PKG26YGN10001',
          owner_store_code: 'MUSE001',
        },
        muse,
        'MUSE',
      ),
    ).toBe(true);
  });

  it('RUILI 发站可见 LSO 目的地快递包', () => {
    const ruili = store('RUILI001');
    expect(
      isVisibleInPackedList(
        {
          bundle_barcode: 'RUI26LSO30001',
          owner_store_code: 'RUILI001',
        },
        ruili,
        'RUI',
      ),
    ).toBe(true);
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
    ).toBe(false);
    expect(
      shouldMergeCloudItemToLocal(
        {
          barcode: 'YGN260531120000',
          owner_store_code: 'MUSE001',
          final_destination: '',
          hub_arrived_at: '2026-08-02T00:00:00.000Z',
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
