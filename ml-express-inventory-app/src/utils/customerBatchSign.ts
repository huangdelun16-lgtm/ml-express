import type { InventoryItemListRow } from '../types/inventory';
import type { InventoryStoreSession } from '../services/authService';
import { canMarkCustomerSigned } from './customerSign';
import { parseFeeMmk } from './crossBorderFxLock';
import { parsePackagingStockInLineBarcode } from './inboundBarcode';
import { isExpressPackItem } from './packItem';

export type PackagingSignSibling = {
  id: string;
  barcode: string;
  hub_arrived_at?: string | null;
  customer_signed_at?: string | null;
  final_destination?: string | null;
  destination?: string | null;
  owner_store_code?: string | null;
};

export type SignFeeRow = {
  id: string;
  barcode: string;
  name?: string;
  total_fee?: string;
  payment_label?: string;
};

export function resolveCustomerLabel(item: InventoryItemListRow): string {
  return (item.customer_name || item.recipient_name || '').trim();
}

export function resolveCustomerKey(item: InventoryItemListRow): string {
  return resolveCustomerLabel(item).toLowerCase();
}

export function isBatchSignSelectable(
  store: InventoryStoreSession | null | undefined,
  item: PackagingSignSibling,
): boolean {
  if (!store) return false;
  if (isExpressPackItem(item)) return false;
  return canMarkCustomerSigned(store, item);
}

export function collectSameCustomerPeers(
  items: InventoryItemListRow[],
  anchor: InventoryItemListRow,
  store: InventoryStoreSession,
): InventoryItemListRow[] {
  const key = resolveCustomerKey(anchor);
  if (!key) return [anchor];
  return items.filter(
    (item) => resolveCustomerKey(item) === key && isBatchSignSelectable(store, item),
  );
}

export type BatchSignError = 'batchSignEmpty' | 'batchSignMixedCustomer';

export function validateBatchSignSelection(
  selected: InventoryItemListRow[],
): BatchSignError | null {
  if (selected.length === 0) return 'batchSignEmpty';
  const keys = new Set(selected.map(resolveCustomerKey).filter(Boolean));
  if (keys.size !== 1) return 'batchSignMixedCustomer';
  return null;
}

export function packagingStockInGroupKey(barcode: string): string | null {
  return parsePackagingStockInLineBarcode(barcode)?.base ?? null;
}

function sortByPackagingIndex<T extends PackagingSignSibling>(a: T, b: T): number {
  const pa = parsePackagingStockInLineBarcode(a.barcode);
  const pb = parsePackagingStockInLineBarcode(b.barcode);
  return (pa?.index ?? 0) - (pb?.index ?? 0);
}

function mergeById<T extends { id: string }>(primary: T[], extra: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of primary) map.set(row.id, row);
  for (const row of extra) {
    if (!map.has(row.id)) map.set(row.id, row);
  }
  return [...map.values()];
}

/** 同一基础入库号（如 MDY…(5-1)…(5-5)）未签收兄弟，按序号排列 */
export function collectPackagingStockInSiblings<T extends PackagingSignSibling>(
  items: T[],
  anchor: T,
  store: InventoryStoreSession,
): T[] {
  const key = packagingStockInGroupKey(anchor.barcode);
  if (!key) return [anchor];

  const siblings = items.filter((item) => {
    if (packagingStockInGroupKey(item.barcode) !== key) return false;
    if (item.id === anchor.id) return true;
    return isBatchSignSelectable(store, item);
  });

  if (!siblings.some((item) => item.id === anchor.id)) {
    siblings.unshift(anchor);
  }

  return siblings.sort(sortByPackagingIndex);
}

export async function resolvePackagingStockInSignIds(
  knownItems: PackagingSignSibling[],
  selected: PackagingSignSibling[],
  store: InventoryStoreSession,
  loadMore?: (keyword: string) => Promise<PackagingSignSibling[]>,
): Promise<PackagingSignSibling[]> {
  if (selected.length === 0) return [];

  const seen = new Set<string>();
  const out: PackagingSignSibling[] = [];
  let pool = [...knownItems];
  const loadedBases = new Set<string>();

  for (const anchor of selected) {
    const parsed = parsePackagingStockInLineBarcode(anchor.barcode);
    if (parsed && loadMore && !loadedBases.has(parsed.base)) {
      loadedBases.add(parsed.base);
      const current = collectPackagingStockInSiblings(pool, anchor, store);
      if (current.length < parsed.total) {
        try {
          const extra = await loadMore(parsed.base);
          pool = mergeById(pool, extra);
        } catch {
          // 补拉失败仍用当前缓存签收
        }
      }
    }
    if (!pool.some((row) => row.id === anchor.id)) {
      pool = [anchor, ...pool];
    }
    for (const row of collectPackagingStockInSiblings(pool, anchor, store)) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }

  return out.length ? out : selected;
}

/** 多个入库共享总价：同一 base 只取 max，独立订单再相加 */
export function uniqueSignFeeMmk(details: SignFeeRow[]): number {
  const grouped = new Map<string, number[]>();
  let independent = 0;
  for (const row of details) {
    const fee = parseFeeMmk(row.total_fee);
    const parsed = parsePackagingStockInLineBarcode(row.barcode);
    if (!parsed) {
      independent += fee;
      continue;
    }
    const list = grouped.get(parsed.base) ?? [];
    list.push(fee);
    grouped.set(parsed.base, list);
  }
  let groupedTotal = 0;
  for (const fees of grouped.values()) {
    groupedTotal += Math.max(0, ...fees);
  }
  return independent + groupedTotal;
}

/** 锁汇时同一多个入库组只在序号最小的那件上写入总费用 */
export function fxLockFeeMmkForItem(item: SignFeeRow, allInBatch: SignFeeRow[]): number {
  const parsed = parsePackagingStockInLineBarcode(item.barcode);
  if (!parsed) return parseFeeMmk(item.total_fee);
  const group = allInBatch.filter(
    (row) => parsePackagingStockInLineBarcode(row.barcode)?.base === parsed.base,
  );
  const primary = [...group].sort(sortByPackagingIndex)[0];
  if (primary?.id !== item.id) return 0;
  return Math.max(0, ...group.map((row) => parseFeeMmk(row.total_fee)));
}

export function packagingStockInSignBatch(
  details: Array<{ barcode: string }>,
): { base: string; declaredTotal: number; count: number } | null {
  if (details.length === 0) return null;
  const parsed = details.map((row) => parsePackagingStockInLineBarcode(row.barcode));
  if (parsed.some((row) => !row)) return null;
  const base = parsed[0]!.base;
  if (parsed.some((row) => row!.base !== base)) return null;
  return {
    base,
    declaredTotal: parsed[0]!.total,
    count: details.length,
  };
}

export type CodAlertFeeGroup =
  | { kind: 'packaging'; count: number; fee: number; barcodes: string[] }
  | { kind: 'single'; name: string; fee: number };

export function buildCodAlertFeeGroups(details: SignFeeRow[]): CodAlertFeeGroup[] {
  const cod = details.filter((row) => row.payment_label === '到付');
  const seenBases = new Set<string>();
  const groups: CodAlertFeeGroup[] = [];
  for (const row of cod) {
    const parsed = parsePackagingStockInLineBarcode(row.barcode);
    if (parsed) {
      if (seenBases.has(parsed.base)) continue;
      seenBases.add(parsed.base);
      const group = cod.filter(
        (item) => parsePackagingStockInLineBarcode(item.barcode)?.base === parsed.base,
      );
      groups.push({
        kind: 'packaging',
        count: group.length,
        fee: Math.max(0, ...group.map((item) => parseFeeMmk(item.total_fee))),
        barcodes: [...group].sort(sortByPackagingIndex).map((item) => item.barcode),
      });
      continue;
    }
    groups.push({
      kind: 'single',
      name: row.name ?? '',
      fee: parseFeeMmk(row.total_fee),
    });
  }
  return groups;
}
