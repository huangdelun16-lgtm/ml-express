export const ORDER_TRACKING_STATUSES = [
  'in_transit',
  'hub_received',
  'released_at_hub',
] as const;

export type OrderTrackingStatus = (typeof ORDER_TRACKING_STATUSES)[number];

export type OrderStatusFilter =
  | 'active'
  | 'in_transit'
  | 'hub_received'
  | 'released_at_hub'
  | 'awaiting_pickup'
  | 'signed'
  | 'all';

export type OrderPickupKind = 'signed' | 'notified' | 'awaiting' | 'none';

export type OrderPickupFields = {
  customer_signed_at?: string | null;
  arrival_notified_at?: string | null;
  hub_received_at?: string | null;
  status?: string | null;
};

function hasTimestamp(value?: string | null): boolean {
  return Boolean(String(value || '').trim());
}

export function orderPickupVisibility(order: OrderPickupFields): {
  kind: OrderPickupKind;
  signed: boolean;
  notified: boolean;
  arrived: boolean;
} {
  const signed = hasTimestamp(order.customer_signed_at);
  const notified = hasTimestamp(order.arrival_notified_at);
  const arrived =
    order.status === 'hub_received' ||
    order.status === 'released_at_hub' ||
    hasTimestamp(order.hub_received_at);
  if (signed) return { kind: 'signed', signed, notified, arrived: true };
  if (arrived && notified) return { kind: 'notified', signed, notified, arrived };
  if (arrived) return { kind: 'awaiting', signed, notified, arrived };
  return { kind: 'none', signed, notified, arrived };
}

export function orderPickupVisibilityLabel(order: OrderPickupFields, isEn: boolean): string {
  const kind = orderPickupVisibility(order).kind;
  if (kind === 'signed') return isEn ? 'Signed' : '已签收';
  if (kind === 'notified') return isEn ? 'Arrived · notified' : '已到站且已通知';
  if (kind === 'awaiting') return isEn ? 'Arrived · not notified' : '已到站未通知';
  return '—';
}

export function orderPickupVisibilityBadgeClass(kind: OrderPickupKind): string {
  if (kind === 'signed') return 'cbl-badge cbl-badge--green';
  if (kind === 'notified') return 'cbl-badge cbl-badge--blue';
  if (kind === 'awaiting') return 'cbl-badge cbl-badge--amber';
  return 'cbl-badge cbl-badge--gray';
}

export function orderTrackingStatusLabel(status: string, isEn: boolean): string {
  if (status === 'in_transit') return isEn ? 'In transit' : '在途';
  if (status === 'hub_received') return isEn ? 'Arrived' : '已到站';
  if (status === 'released_at_hub') return isEn ? 'Released' : '已释放待转';
  return status || '—';
}

export function orderTrackingStatusBadgeClass(status: string): string {
  if (status === 'in_transit') return 'cbl-badge cbl-badge--amber';
  if (status === 'hub_received') return 'cbl-badge cbl-badge--blue';
  if (status === 'released_at_hub') return 'cbl-badge cbl-badge--green';
  return 'cbl-badge cbl-badge--gray';
}

export function orderStatusFilterValues(filter: OrderStatusFilter): string[] | null {
  if (filter === 'all' || filter === 'signed') return null;
  if (filter === 'active') return ['in_transit', 'hub_received'];
  if (filter === 'awaiting_pickup') return ['hub_received'];
  return [filter];
}
