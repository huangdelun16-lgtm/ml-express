import { describe, expect, it } from 'vitest';
import type { PackedShipmentDetail } from '../types/inventory';
import type { PkgTrackingDetail } from '../types/tracking';
import {
  areAllPackOrdersConfirmed,
  effectivePkgTrackingStatus,
  isActiveInboundTrackingPack,
  isActiveOutboundTrackingPack,
  resolveTrackPackDisplayStatus,
} from './shipmentTrackVisibility';

function order(
  overrides: Partial<PkgTrackingDetail['orders'][number]> & { status: PkgTrackingDetail['orders'][number]['status'] },
): PkgTrackingDetail['orders'][number] {
  return {
    id: overrides.id ?? '1',
    pkg_tracking_id: 'pkg-1',
    pack_barcode: 'RUI26MDY40001',
    order_barcode: overrides.order_barcode ?? 'MDY001',
    express_barcode: '',
    order_name: 'A',
    destination_code: overrides.destination_code ?? 'MDY',
    qty: 1,
    status: overrides.status,
    recipient_name: '',
    recipient_phone: '',
    packaging: '',
    spec: '',
    weight: '',
    detail_address: '',
    inbound_note: '',
    inbound_store_name: '',
    inbound_at: null,
    hub_received_at: null,
    hub_received_by_store_code: null,
    hub_received_by_store_name: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function pack(
  orders: PkgTrackingDetail['orders'],
  overrides: Partial<PkgTrackingDetail> = {},
): PkgTrackingDetail {
  const received = orders.filter((row) => row.status === 'hub_received' || row.status === 'released_at_hub').length;
  return {
    id: 'pkg-1',
    pack_barcode: 'RUI26MDY40001',
    pack_name: 'AMT 包装',
    origin_store_id: null,
    origin_store_code: 'RUILI001',
    origin_store_name: 'RUILI',
    destination_code: 'MDY',
    leg_destination_code: 'MDY',
    status: 'in_transit',
    item_count: orders.length,
    total_weight: '0',
    received_order_count: received,
    transport_fee: '0',
    trip_number: 'RUI0001',
    truck_outbound_date: null,
    truck_loaded_at: null,
    hub_received_at: null,
    hub_received_by_store_code: null,
    hub_received_by_store_name: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    orders,
    ...overrides,
  };
}

function localPack(overrides: Partial<PackedShipmentDetail> = {}): PackedShipmentDetail {
  return {
    id: 'pack-1',
    bundle_item_id: 'bi-1',
    bundle_barcode: 'RUI26MDY40001',
    bundle_name: 'AMT 包装',
    operator: '',
    note: '',
    owner_store_code: 'MDY001',
    transport_fee: '',
    truck_leg_destination: 'MDY',
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

describe('shipmentTrackVisibility', () => {
  it('已确认 4/4 但包装仍 in_transit 时，本站待收不再显示', () => {
    const detail = pack([
      order({ id: '1', status: 'hub_received' }),
      order({ id: '2', status: 'hub_received' }),
      order({ id: '3', status: 'hub_received' }),
      order({ id: '4', status: 'hub_received' }),
    ]);
    expect(areAllPackOrdersConfirmed(detail)).toBe(true);
    expect(effectivePkgTrackingStatus(detail)).toBe('hub_received');
    expect(isActiveInboundTrackingPack(detail, 'MDY')).toBe(false);
    expect(isActiveOutboundTrackingPack(detail)).toBe(false);
  });

  it('仍有本站待入库订单时留在待收', () => {
    const detail = pack([
      order({ id: '1', status: 'hub_received' }),
      order({ id: '2', status: 'in_transit' }),
    ]);
    expect(isActiveInboundTrackingPack(detail, 'MDY')).toBe(true);
    expect(effectivePkgTrackingStatus(detail)).toBe('in_transit');
  });

  it('包装已 hub_received 但仍有待入库订单时继续显示', () => {
    const detail = pack(
      [
        order({ id: '1', status: 'hub_received' }),
        order({ id: '2', status: 'in_transit' }),
      ],
      { status: 'hub_received' },
    );
    expect(isActiveInboundTrackingPack(detail, 'MDY')).toBe(true);
  });

  it('中转站还有未释放过路单时不离开待收', () => {
    const detail = pack(
      [
        order({ id: '1', status: 'in_transit', destination_code: 'YGN', order_barcode: 'YGN001' }),
        order({ id: '2', status: 'in_transit', destination_code: 'YGN', order_barcode: 'YGN002' }),
      ],
      { destination_code: 'YGN', leg_destination_code: 'MDY' },
    );
    expect(isActiveInboundTrackingPack(detail, 'MDY')).toBe(true);
  });

  it('订单未拉到且没有确认计数时，在途包装仍显示，避免漏单', () => {
    const detail = pack([], { item_count: 4, received_order_count: 0, status: 'in_transit' });
    expect(areAllPackOrdersConfirmed(detail)).toBe(false);
    expect(isActiveInboundTrackingPack(detail, 'MDY')).toBe(true);
  });

  it('追踪快递：本地未装车但云端订单已齐，显示已到站而不是未装车', () => {
    const cloud = pack([
      order({ id: '1', status: 'hub_received' }),
      order({ id: '2', status: 'hub_received' }),
    ]);
    expect(resolveTrackPackDisplayStatus(localPack({ loaded: false }), cloud)).toBe('arrived');
    expect(resolveTrackPackDisplayStatus(localPack({ loaded: true }), cloud)).toBe('completed');
  });

  it('终态包装不进入在途列表', () => {
    const completed = pack([order({ id: '1', status: 'hub_received' })], { status: 'completed' });
    expect(isActiveInboundTrackingPack(completed, 'MDY')).toBe(false);
    expect(isActiveOutboundTrackingPack(completed)).toBe(false);
  });
});
