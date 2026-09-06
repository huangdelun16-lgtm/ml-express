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
  | 'all';

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
  if (filter === 'all') return null;
  if (filter === 'active') return ['in_transit', 'hub_received'];
  return [filter];
}
