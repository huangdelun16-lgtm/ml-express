import { describe, expect, it } from 'vitest';
import type { PkgTrackingDetail } from '../types/tracking';
import {
  areAllPackOrdersProcessed,
  countPendingLocalInboundOrders,
  countPendingPackInboundOrders,
  isDestinationHubPack,
  listPendingPackInboundOrders,
} from './hubReceivePack';

function pack(orders: PkgTrackingDetail['orders'], overrides: Partial<PkgTrackingDetail> = {}): PkgTrackingDetail {
  return {
    id: 'pkg-1',
    pack_barcode: 'RUI26LSO20001',
    pack_name: 'PKG',
    origin_store_code: 'RUILI001',
    origin_store_name: 'RUILI',
    destination_code: 'LSO',
    leg_destination_code: 'LSO',
    status: 'hub_received',
    item_count: orders.length,
    received_order_count: 0,
    transport_fee: '100000',
    orders,
    ...overrides,
  };
}

describe('hubReceivePack', () => {
  it('识别本站目的地快递包', () => {
    const detail = pack([
      { id: '1', order_barcode: 'LSO260801001', order_name: 'A', destination_code: 'LSO', status: 'in_transit', pack_barcode: 'RUI26LSO20001', qty: 1 },
      { id: '2', order_barcode: 'LSO260801002', order_name: 'B', destination_code: 'LSO', status: 'in_transit', pack_barcode: 'RUI26LSO20001', qty: 1 },
    ] as PkgTrackingDetail['orders']);
    expect(isDestinationHubPack(detail, 'LSO')).toBe(true);
    expect(countPendingLocalInboundOrders(detail, 'LSO')).toBe(2);
    expect(countPendingPackInboundOrders(detail, 'LSO')).toBe(2);
    expect(listPendingPackInboundOrders(detail, 'LSO')).toHaveLength(2);
    expect(areAllPackOrdersProcessed(detail)).toBe(false);
  });

  it('包装号前缀为 MDY 但订单均为 LSO 时仍视为目的地包', () => {
    const detail = pack([
      { id: '1', order_barcode: 'LSO260801001', order_name: 'A', destination_code: 'LSO', status: 'in_transit', pack_barcode: 'RUI26MDY20001', qty: 1 },
      { id: '2', order_barcode: 'LSO260801002', order_name: 'B', destination_code: 'LSO', status: 'in_transit', pack_barcode: 'RUI26MDY20001', qty: 1 },
    ] as PkgTrackingDetail['orders'], { pack_barcode: 'RUI26MDY20001', destination_code: 'MDY', leg_destination_code: 'LSO' });
    expect(isDestinationHubPack(detail, 'LSO')).toBe(true);
  });

  it('含中转订单的不是纯目的地包', () => {
    const detail = pack([
      { id: '1', order_barcode: 'LSO260801001', order_name: 'A', destination_code: 'LSO', status: 'in_transit', pack_barcode: 'PKG', qty: 1 },
      { id: '2', order_barcode: 'YGN260801002', order_name: 'B', destination_code: 'YGN', status: 'in_transit', pack_barcode: 'PKG', qty: 1 },
    ] as PkgTrackingDetail['orders'], { leg_destination_code: 'MDY', destination_code: 'YGN' });
    expect(isDestinationHubPack(detail, 'MDY')).toBe(false);
  });
});
