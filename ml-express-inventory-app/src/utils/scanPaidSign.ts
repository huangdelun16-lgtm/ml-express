import { parsePackagingStockInLineBarcode } from './inboundBarcode';

export type PackagingArrivalPiece = {
  barcode: string;
  hub_arrived_at?: string | null;
};

export type PackagingArrival =
  | { kind: 'not_batch' }
  | { kind: 'complete'; expected: number; arrived: number }
  | { kind: 'incomplete'; expected: number; arrived: number; missing: number };

export type PaidSignRejectReason =
  | 'not_signable'
  | 'other_customer'
  | 'duplicate'
  | 'fee_unpaid'
  | 'incomplete_batch';

export type PaidSignAddDecision = { ok: true } | { ok: false; reason: PaidSignRejectReason };

/** 多个入库才有批次。单件或普通入库号不挡签收。 */
export function assessPackagingArrival(
  barcode: string,
  pieces: PackagingArrivalPiece[],
): PackagingArrival {
  const parsed = parsePackagingStockInLineBarcode(barcode);
  if (!parsed || parsed.total <= 1) return { kind: 'not_batch' };

  const arrivedIndexes = new Set<number>();
  for (const piece of pieces) {
    const row = parsePackagingStockInLineBarcode(piece.barcode);
    if (!row || row.base !== parsed.base || row.total !== parsed.total) continue;
    if (row.index < 1 || row.index > parsed.total) continue;
    if (!String(piece.hub_arrived_at ?? '').trim()) continue;
    arrivedIndexes.add(row.index);
  }

  const arrived = arrivedIndexes.size;
  if (arrived >= parsed.total) {
    return { kind: 'complete', expected: parsed.total, arrived };
  }
  return {
    kind: 'incomplete',
    expected: parsed.total,
    arrived,
    missing: parsed.total - arrived,
  };
}

export function signCustomerKey(item: {
  customer_name?: string | null;
  recipient_name?: string | null;
}): string {
  return (item.customer_name || item.recipient_name || '').trim().toLowerCase();
}

export function isSameSignCustomer(
  anchor: { customer_name?: string | null; recipient_name?: string | null },
  next: { customer_name?: string | null; recipient_name?: string | null },
): boolean {
  const left = signCustomerKey(anchor);
  const right = signCustomerKey(next);
  return left.length > 0 && left === right;
}

export function packagingSignGroupKey(barcode: string): string | null {
  const parsed = parsePackagingStockInLineBarcode(barcode);
  if (!parsed || parsed.total <= 1) return null;
  return `${parsed.base.trim().toUpperCase()}|${parsed.total}`;
}

export function isAlreadyInPaidSignBasket(
  basket: Array<{ id: string; barcode: string }>,
  next: { id: string; barcode: string },
): boolean {
  const code = next.barcode.trim().toUpperCase();
  if (
    basket.some((row) => row.id === next.id || row.barcode.trim().toUpperCase() === code)
  ) {
    return true;
  }
  const key = packagingSignGroupKey(next.barcode);
  if (!key) return false;
  return basket.some((row) => packagingSignGroupKey(row.barcode) === key);
}

export function decidePaidSignAdd(input: {
  signable: boolean;
  sameCustomer: boolean;
  alreadyIncluded: boolean;
  feePaid: boolean;
  arrival: PackagingArrival;
}): PaidSignAddDecision {
  if (!input.signable) return { ok: false, reason: 'not_signable' };
  if (!input.sameCustomer) return { ok: false, reason: 'other_customer' };
  if (input.alreadyIncluded) return { ok: false, reason: 'duplicate' };
  if (!input.feePaid) return { ok: false, reason: 'fee_unpaid' };
  if (input.arrival.kind === 'incomplete') return { ok: false, reason: 'incomplete_batch' };
  return { ok: true };
}
