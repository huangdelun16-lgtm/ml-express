import { describe, expect, it } from 'vitest';
import type { PkgTrackingDetail } from '../types/tracking';
import { outboundTrackRowCount, splitOutboundByTrip } from './truckTripGroups';

function pack(overrides: Partial<PkgTrackingDetail>): PkgTrackingDetail {
  return {
    id: overrides.id ?? 'pkg-1',
    pack_barcode: overrides.pack_barcode ?? 'RUI26MDY40001',
    pack_name: 'AMT 包装',
    origin_store_id: null,
    origin_store_code: 'RUILI001',
    origin_store_name: 'RUILI',
    destination_code: 'MDY',
    leg_destination_code: 'MDY',
    status: 'in_transit',
    item_count: 1,
    total_weight: '1',
    received_order_count: 0,
    transport_fee: '',
    trip_number: 'RUI0001',
    truck_outbound_date: null,
    truck_loaded_at: null,
    hub_received_at: null,
    hub_received_by_store_code: null,
    hub_received_by_store_name: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    orders: [],
    ...overrides,
  };
}

describe('splitOutboundByTrip', () => {
  it('同一车次里只要有一包写了车费，整车就用这笔金额', () => {
    const { trips } = splitOutboundByTrip([
      pack({ id: 'a', pack_barcode: 'A', transport_fee: '0' }),
      pack({ id: 'b', pack_barcode: 'B', transport_fee: '150000' }),
    ]);
    expect(trips).toHaveLength(1);
    expect(trips[0].transportFee).toBe('150000');
    expect(trips[0].packCount).toBe(2);
    expect(outboundTrackRowCount([
      pack({ id: 'a', pack_barcode: 'A', transport_fee: '0' }),
      pack({ id: 'b', pack_barcode: 'B', transport_fee: '150000' }),
      pack({ id: 'c', pack_barcode: 'C', trip_number: '' }),
    ])).toBe(2);
  });
});
