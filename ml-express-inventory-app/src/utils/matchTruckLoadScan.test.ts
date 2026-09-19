import { describe, expect, it } from 'vitest';
import type { PackedShipmentDetail } from '../types/inventory';
import {
  classifyUnresolvedTruckLoadScan,
  findPendingPackByScan,
  isOrderInboundReady,
  matchPendingTruckLoadScan,
} from './matchTruckLoadScan';

function pack(overrides: Partial<PackedShipmentDetail> = {}): PackedShipmentDetail {
  return {
    id: 'pack-1',
    bundle_item_id: 'bi-1',
    bundle_barcode: 'PKG26YGN105310001',
    bundle_name: 'YGN 包',
    operator: '',
    note: '',
    owner_store_code: 'MUSE001',
    created_at: '',
    spec: '',
    unit: '1 Pcs',
    weight: '',
    bundle_qty_on_hand: 1,
    loaded: false,
    items: [
      {
        id: 'line-1',
        pack_id: 'pack-1',
        item_id: 'item-1',
        item_barcode: 'YGN2601010001',
        input_barcode: 'SF1234567890',
        item_name: 'A',
        destination: 'YGN',
        customer_name: 'U Aung',
        qty: 1,
      },
    ],
    ...overrides,
  };
}

describe('matchTruckLoadScan', () => {
  it('匹配包装号或订单入库码/快递单', () => {
    const pending = [pack()];
    expect(findPendingPackByScan('pkg26ygn105310001', pending)?.match).toBe('pack');
    expect(findPendingPackByScan('YGN2601010001', pending)?.match).toBe('order');
    expect(findPendingPackByScan('sf1234567890', pending)?.match).toBe('order');
  });

  it('已选包装再次扫码视为重复', () => {
    const pending = [pack()];
    expect(matchPendingTruckLoadScan('YGN2601010001', pending, ['pack-1']).kind).toBe('miss');
    expect(matchPendingTruckLoadScan('YGN2601010001', pending, ['pack-1'])).toEqual({
      kind: 'miss',
      reason: 'already_selected',
    });
  });

  it('未入库订单不能装车', () => {
    expect(isOrderInboundReady({ qty_on_hand: 0 })).toBe(false);
    expect(
      classifyUnresolvedTruckLoadScan({
        item: { qty_on_hand: 0 },
        pack: null,
      }),
    ).toBe('not_inbound');
  });

  it('已入库未打包不能装车', () => {
    expect(
      classifyUnresolvedTruckLoadScan({
        item: { qty_on_hand: 1 },
        pack: null,
      }),
    ).toBe('not_packed');
  });

  it('已装车或在途包装拒绝', () => {
    expect(
      classifyUnresolvedTruckLoadScan({
        item: { qty_on_hand: 0, packed_at: '2026-09-01' },
        pack: { loaded: true },
      }),
    ).toBe('already_loaded');
    expect(
      classifyUnresolvedTruckLoadScan({
        item: null,
        pack: { loaded: false, cloud_status: 'in_transit' },
      }),
    ).toBe('already_loaded');
  });
});
