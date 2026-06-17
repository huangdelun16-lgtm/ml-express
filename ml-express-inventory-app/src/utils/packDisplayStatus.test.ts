import { describe, expect, it } from 'vitest';
import type { PackedShipmentDetail } from '../types/inventory';
import {
  canSelectPackedShipmentForTruckLoad,
  resolvePackDisplayStatus,
} from './packDisplayStatus';

function packDetail(overrides: Partial<PackedShipmentDetail> = {}): PackedShipmentDetail {
  return {
    id: 'pack-1',
    bundle_item_id: 'bi-1',
    bundle_barcode: 'PKG26YGN105310001',
    bundle_name: 'YGN 包',
    operator: '',
    note: '',
    owner_store_code: 'MUSE001',
    transport_fee: '',
    truck_leg_destination: 'YGN',
    created_at: '',
    spec: '',
    unit: '1 Pcs',
    weight: '',
    bundle_qty_on_hand: 1,
    loaded: false,
    items: [],
    ...overrides,
  };
}

describe('packDisplayStatus', () => {
  it('云端 in_transit 时不可装车', () => {
    expect(
      canSelectPackedShipmentForTruckLoad({ loaded: false, cloud_status: 'in_transit' }),
    ).toBe(false);
  });

  it('已到站且本地已装车标记时显示已完成', () => {
    const status = resolvePackDisplayStatus(
      packDetail({ loaded: true }),
      'hub_received',
    );
    expect(status).toBe('completed');
  });

  it('未装车且云端未锁定时可装车', () => {
    expect(canSelectPackedShipmentForTruckLoad({ loaded: false, cloud_status: null })).toBe(true);
  });
});
