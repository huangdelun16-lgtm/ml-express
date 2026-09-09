import type { PackedShipmentDetail } from '../types/inventory';
import type { PkgTrackingDetail, PkgTrackingStatus } from '../types/tracking';
import {
  countPendingPackInboundOrders,
  hasUnreleasedTransitOrders,
} from './hubReceivePack';
import { resolvePackDisplayStatus, type PackDisplayStatus } from './packDisplayStatus';

export function isProcessedTrackingOrderStatus(status: string): boolean {
  return status === 'hub_received' || status === 'released_at_hub';
}

/** 包内订单已全部到站确认（含包装行仍卡在 in_transit 的情况） */
export function areAllPackOrdersConfirmed(pack: {
  orders: Array<{ status: string }>;
  received_order_count: number;
  item_count: number;
}): boolean {
  if (pack.orders.length > 0) {
    return pack.orders.every((order) => isProcessedTrackingOrderStatus(order.status));
  }
  return pack.item_count > 0 && pack.received_order_count >= pack.item_count;
}

/** 订单已齐而包装行未跟上时，按已到站/已分拨展示 */
export function effectivePkgTrackingStatus(pack: PkgTrackingDetail): PkgTrackingStatus {
  if (pack.status !== 'in_transit') return pack.status;
  if (!areAllPackOrdersConfirmed(pack)) return 'in_transit';
  const hasReleased = pack.orders.some((order) => order.status === 'released_at_hub');
  return hasReleased ? 'split_at_hub' : 'hub_received';
}

/**
 * 本站待收：还有本站收货或分拨工作才显示。
 * 已确认 n/n 则离开列表，即使包装 status 仍是 in_transit。
 */
export function isActiveInboundTrackingPack(pack: PkgTrackingDetail, hubCode: string): boolean {
  if (pack.status === 'completed' || pack.status === 'cancelled' || pack.status === 'split_at_hub') {
    return false;
  }
  if (countPendingPackInboundOrders(pack, hubCode) > 0) return true;
  if (hasUnreleasedTransitOrders(pack, hubCode)) return true;
  if (areAllPackOrdersConfirmed(pack)) return false;
  return pack.status === 'in_transit' || pack.status === 'hub_received';
}

/** 本站发出：目的站已确认完全部订单后不再占在途列表 */
export function isActiveOutboundTrackingPack(pack: PkgTrackingDetail): boolean {
  if (pack.status === 'completed' || pack.status === 'cancelled' || pack.status === 'split_at_hub') {
    return false;
  }
  if (areAllPackOrdersConfirmed(pack)) return false;
  return pack.status === 'in_transit' || pack.status === 'hub_received';
}

export function resolveTrackPackDisplayStatus(
  pack: PackedShipmentDetail,
  cloudPkg: PkgTrackingDetail | null | undefined,
): PackDisplayStatus {
  return resolvePackDisplayStatus(pack, cloudPkg ? effectivePkgTrackingStatus(cloudPkg) : null);
}
