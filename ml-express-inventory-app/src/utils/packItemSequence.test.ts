import { describe, expect, it } from 'vitest';
import {
  formatPackItemLabel,
  findParentPackForItem,
  isPackagingStockInPack,
  resolvePackItemSequence,
  resolvePackagingStockInItemLabel,
} from './packItemSequence';
import type { PackedShipmentDetail } from '../types/inventory';

function pack(overrides: Partial<PackedShipmentDetail> = {}): PackedShipmentDetail {
  return {
    id: 'p1',
    bundle_item_id: 'b1',
    bundle_barcode: 'PKG26YGN10001',
    bundle_name: 'Test pack',
    operator: 'op',
    note: '多个入库 · 总费用 50000 MMK · 09',
    owner_store_code: 'MUSE001',
    created_at: '2026-01-01',
    spec: '',
    unit: '3 Pcs',
    weight: '10',
    bundle_qty_on_hand: 1,
    loaded: false,
    items: [
      {
        id: 'l1',
        pack_id: 'p1',
        item_id: 'i1',
        item_barcode: 'MDY001',
        input_barcode: 'E1',
        item_name: 'A',
        destination: 'YGN',
        customer_name: 'C',
        qty: 1,
      },
      {
        id: 'l2',
        pack_id: 'p1',
        item_id: 'i2',
        item_barcode: 'MDY002',
        input_barcode: 'E2',
        item_name: 'B',
        destination: 'YGN',
        customer_name: 'C',
        qty: 1,
      },
      {
        id: 'l3',
        pack_id: 'p1',
        item_id: 'i3',
        item_barcode: 'MDY003',
        input_barcode: 'E3',
        item_name: 'C',
        destination: 'YGN',
        customer_name: 'C',
        qty: 1,
      },
    ],
    ...overrides,
  };
}

describe('packItemSequence', () => {
  it('识别多个入库快递包 note', () => {
    expect(isPackagingStockInPack({ note: '多个入库 · 总费用 100 MMK · 09' })).toBe(true);
    expect(isPackagingStockInPack({ note: 'Multiple stock in · total 100 MMK · 09' })).toBe(true);
    expect(isPackagingStockInPack({ note: '普通打包备注' })).toBe(false);
  });

  it('按包内明细顺序返回 3-1 / 3-2 / 3-3', () => {
    const p = pack();
    expect(resolvePackItemSequence('i1', 'MDY001', p)).toEqual({ total: 3, index: 1 });
    expect(resolvePackItemSequence('i2', 'MDY002', p)).toEqual({ total: 3, index: 2 });
    expect(resolvePackItemSequence('i3', 'MDY003', p)).toEqual({ total: 3, index: 3 });
    expect(formatPackItemLabel({ total: 3, index: 2 })).toBe('3-2');
  });

  it('单件包或普通打包不生成序号', () => {
    const single = pack({ items: pack().items.slice(0, 1), note: '多个入库 · x' });
    expect(resolvePackItemSequence('i1', 'MDY001', single)).toBeNull();

    const regular = pack({ note: '打包出库' });
    expect(resolvePackagingStockInItemLabel('i2', 'MDY002', regular)).toBeUndefined();
  });

  it('多个入库包内订单返回标签', () => {
    expect(resolvePackagingStockInItemLabel('i2', 'MDY002', pack())).toBe('3-2');
  });

  it('入库条码已含 (3-2) 后缀时直接解析序号', () => {
    expect(resolvePackagingStockInItemLabel('i2', 'MDY131412040826(3-2)', null)).toBe('3-2');
  });

  it('入库流水含「 · 打包入 」时无 pack.note 也可识别多个入库', () => {
    const synthetic = pack({ note: '' });
    expect(
      resolvePackagingStockInItemLabel(
        'i2',
        'MDY002',
        synthetic,
        'line · 打包入 PKG26YGN10001',
      ),
    ).toBe('3-2');
  });

  it('findParentPackForItem 从同包订单合成包内序号上下文', () => {
    const items = [
      { id: 'i1', barcode: 'MDY001', packed_bundle_barcode: 'PKG26YGN10001', name: 'A', input_barcode: '', final_destination: 'YGN', recipient_name: '', owner_store_code: 'MUSE001', spec: '', unit: '', weight: '', qty_on_hand: 0, min_qty: 0, note: '', hub_arrived_at: '2026-01-02', customer_signed_at: '', customer_sign_phone: '', customer_sign_pickup_type: '', customer_sign_proxy_name: '', customer_signature_data: '', customer_signed_by_operator: '', packed_at: '2026-01-01', hub_transit_released_at: '', hub_transit_shipped_at: '', created_at: '', updated_at: '' },
      { id: 'i2', barcode: 'MDY002', packed_bundle_barcode: 'PKG26YGN10001', name: 'B', input_barcode: '', final_destination: 'YGN', recipient_name: '', owner_store_code: 'MUSE001', spec: '', unit: '', weight: '', qty_on_hand: 0, min_qty: 0, note: '', hub_arrived_at: '2026-01-02', customer_signed_at: '', customer_sign_phone: '', customer_sign_pickup_type: '', customer_sign_proxy_name: '', customer_signature_data: '', customer_signed_by_operator: '', packed_at: '2026-01-01', hub_transit_released_at: '', hub_transit_shipped_at: '', created_at: '', updated_at: '' },
      { id: 'i3', barcode: 'MDY003', packed_bundle_barcode: 'PKG26YGN10001', name: 'C', input_barcode: '', final_destination: 'YGN', recipient_name: '', owner_store_code: 'MUSE001', spec: '', unit: '', weight: '', qty_on_hand: 0, min_qty: 0, note: '', hub_arrived_at: '2026-01-02', customer_signed_at: '', customer_sign_phone: '', customer_sign_pickup_type: '', customer_sign_proxy_name: '', customer_signature_data: '', customer_signed_by_operator: '', packed_at: '2026-01-01', hub_transit_released_at: '', hub_transit_shipped_at: '', created_at: '', updated_at: '' },
    ] as import('../types/inventory').InventoryItem[];

    const parent = findParentPackForItem(items[1], [], items);
    expect(parent?.items).toHaveLength(3);
    expect(resolvePackagingStockInItemLabel('i2', 'MDY002', parent, 'x · 打包入 PKG')).toBe('3-2');
  });
});
