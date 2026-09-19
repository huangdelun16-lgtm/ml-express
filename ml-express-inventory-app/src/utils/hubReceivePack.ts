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

export function hasUnreleasedTransitOrders(pack: PkgTrackingDetail, hubCode: string): boolean {
  const hub = hubCode.trim().toUpperCase();
  return pack.orders.some(
    (order) => resolveOrderDestinationCode(order) !== hub && order.status !== 'released_at_hub',
  );
}

const ORDER_STATUS_RANK: Record<string, number> = {
  in_transit: 0,
  hub_received: 1,
  released_at_hub: 2,
  completed: 3,
  cancelled: 3,
};

function preferFresherOrders(
  confirmed: PkgTrackingDetail['orders'],
  fetched: PkgTrackingDetail['orders'],
): PkgTrackingDetail['orders'] {
  const confirmedById = new Map(confirmed.map((order) => [order.id, order]));
  return fetched.map((order) => {
    const local = confirmedById.get(order.id);
    if (!local) return order;
    return (ORDER_STATUS_RANK[local.status] ?? 0) >= (ORDER_STATUS_RANK[order.status] ?? 0)
      ? local
      : order;
  });
}

/** 刚确认到站后，GET 可能仍返回 in_transit（/__sb 代理缓存）；保留 RPC 已确认状态以便进入第 2 步 */
export function preferConfirmedHubReceivePack(
  confirmed: PkgTrackingDetail,
  fetched: PkgTrackingDetail | null | undefined,
): PkgTrackingDetail {
  if (!fetched) return confirmed;
  const stalePackStatus = confirmed.status !== 'in_transit' && fetched.status === 'in_transit';
  const orders = preferFresherOrders(confirmed.orders, fetched.orders);
  const ordersChanged = orders.some((order, index) => order.status !== fetched.orders[index]?.status);
  if (!stalePackStatus && !ordersChanged) return fetched;
  return {
    ...fetched,
    status: stalePackStatus ? confirmed.status : fetched.status,
    hub_received_at: stalePackStatus
      ? confirmed.hub_received_at ?? fetched.hub_received_at
      : fetched.hub_received_at,
    hub_received_by_store_code: stalePackStatus
      ? confirmed.hub_received_by_store_code ?? fetched.hub_received_by_store_code
      : fetched.hub_received_by_store_code,
    hub_received_by_store_name: stalePackStatus
      ? confirmed.hub_received_by_store_name ?? fetched.hub_received_by_store_name
      : fetched.hub_received_by_store_name,
    updated_at: stalePackStatus ? confirmed.updated_at || fetched.updated_at : fetched.updated_at,
    orders,
  };
}

/** 到站现场 3 步：1 确认到站 → 2 入库/分拨 → 3 支付车费 */
export type HubReceiveStep = 1 | 2 | 3;

export function resolveHubReceiveStep(pack: PkgTrackingDetail, hubCode: string): HubReceiveStep {
  if (pack.status === 'in_transit') return 1;
  if (countPendingPackInboundOrders(pack, hubCode) > 0) return 2;
  if (hasUnreleasedTransitOrders(pack, hubCode)) return 2;
  return 3;
}
