export const BATCH_PRINTABLE_STATUSES = ['打包中', '待取件', '待收款'] as const;

export function isPendingConfirmStatus(status?: string | null): boolean {
  return status === '待确认';
}

export function isBatchPrintableStatus(status?: string | null): boolean {
  return (BATCH_PRINTABLE_STATUSES as readonly string[]).includes(String(status || ''));
}

export function pendingConfirmIds<T extends { id?: string; status?: string }>(
  orders: T[],
): string[] {
  return orders
    .filter((order) => isPendingConfirmStatus(order.status))
    .map((order) => String(order.id || '').trim())
    .filter(Boolean);
}

export function printableIds<T extends { id?: string; status?: string }>(
  orders: T[],
): string[] {
  return orders
    .filter((order) => isBatchPrintableStatus(order.status))
    .map((order) => String(order.id || '').trim())
    .filter(Boolean);
}

export function toggleSelectedId(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
