import type { PkgTrackingDetail } from '../types/tracking';
import { resolveOrderDestinationCode } from './orderDestination';

export function resolvePackLegDestinationCode(pack: PkgTrackingDetail): string {
  return (pack.leg_destination_code || pack.destination_code || '').trim().toUpperCase();
}

/** 本站目的地快递包：包内订单最终目的地均为当前 hub（与包装号前缀无关） */
export function isDestinationHubPack(pack: PkgTrackingDetail, hubCode: string): boolean {
  const hub = hubCode.trim().toUpperCase();
  if (!hub || pack.orders.length === 0) return false;
  return pack.orders.every((order) => resolveOrderDestinationCode(order) === hub);
}

export function countPendingLocalInboundOrders(pack: PkgTrackingDetail, hubCode: string): number {
  const hub = hubCode.trim().toUpperCase();
  return pack.orders.filter(
    (order) => resolveOrderDestinationCode(order) === hub && order.status === 'in_transit',
  ).length;
}

/** 目的地包：待入库订单（包内全部 in_transit） */
export function countPendingPackInboundOrders(pack: PkgTrackingDetail, hubCode: string): number {
  if (!isDestinationHubPack(pack, hubCode)) return countPendingLocalInboundOrders(pack, hubCode);
  return pack.orders.filter((order) => order.status === 'in_transit').length;
}

export function listPendingPackInboundOrders(
  pack: PkgTrackingDetail,
  hubCode: string,
): PkgTrackingDetail['orders'] {
  if (isDestinationHubPack(pack, hubCode)) {
    return pack.orders.filter((order) => order.status === 'in_transit');
  }
  const hub = hubCode.trim().toUpperCase();
  return pack.orders.filter(
    (order) => order.status === 'in_transit' && resolveOrderDestinationCode(order) === hub,
  );
}

export function areAllPackOrdersProcessed(pack: PkgTrackingDetail): boolean {
  return pack.orders.every((order) => order.status !== 'in_transit');
}
