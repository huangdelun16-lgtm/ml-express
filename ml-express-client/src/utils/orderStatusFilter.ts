/** Chip key for delivered/complete. Both package statuses belong here. */
export const COMPLETED_STATUS_FILTER = '已送达';

const COMPLETED_STATUSES = new Set(['已送达', '已完成']);

export function normalizeOrderStatusFilter(filter?: string | null): string {
  if (!filter) return 'all';
  if (filter === '已完成') return COMPLETED_STATUS_FILTER;
  return filter;
}

export function orderMatchesStatusFilter(
  status: string | undefined | null,
  filter: string,
): boolean {
  if (!filter || filter === 'all') return true;
  const key = normalizeOrderStatusFilter(filter);
  const s = String(status || '');
  if (key === COMPLETED_STATUS_FILTER) return COMPLETED_STATUSES.has(s);
  return s === key;
}
