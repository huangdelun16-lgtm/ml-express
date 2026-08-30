import { MERCHANT_ORDER_STATUS } from '../constants/merchantOrderStatus';

export const BATCH_PRINTABLE_STATUSES = [
  MERCHANT_ORDER_STATUS.PACKING,
  MERCHANT_ORDER_STATUS.PENDING_PICKUP,
  MERCHANT_ORDER_STATUS.PENDING_COD,
] as const;

export function isPendingConfirmStatus(status?: string | null): boolean {
  return status === MERCHANT_ORDER_STATUS.PENDING_CONFIRM;
}

export function isBatchPrintableStatus(status?: string | null): boolean {
  return (BATCH_PRINTABLE_STATUSES as readonly string[]).includes(String(status || ''));
}

export function idsMatching<T extends { id?: string; status?: string }>(
  orders: T[],
  pred: (order: T) => boolean,
): string[] {
  return orders
    .filter(pred)
    .map((order) => String(order.id || '').trim())
    .filter(Boolean);
}

export function pendingConfirmIds<T extends { id?: string; status?: string }>(
  orders: T[],
): string[] {
  return idsMatching(orders, (order) => isPendingConfirmStatus(order.status));
}

export function printableIds<T extends { id?: string; status?: string }>(
  orders: T[],
): string[] {
  return idsMatching(orders, (order) => isBatchPrintableStatus(order.status));
}

export function toggleSelectedId(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
