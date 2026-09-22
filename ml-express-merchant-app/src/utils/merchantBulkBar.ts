export type BulkProductLite = {
  id: string;
  is_available?: boolean | null;
};

export type BulkSelectionSummary = {
  selected: number;
  total: number;
  allSelected: boolean;
  noneSelected: boolean;
  availableCount: number;
  unavailableCount: number;
  actionsEnabled: boolean;
};

export const BULK_FAB_LIST_PADDING = 96;
export const BULK_BAR_LIST_PADDING = 228;

export function bulkListPadding(open: boolean): number {
  return open ? BULK_BAR_LIST_PADDING : BULK_FAB_LIST_PADDING;
}

export function summarizeBulkSelection(
  products: BulkProductLite[],
  selectedIds: Iterable<string>,
): BulkSelectionSummary {
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(Array.from(selectedIds));
  let availableCount = 0;
  let unavailableCount = 0;
  for (const product of products) {
    if (!selectedSet.has(product.id)) continue;
    if (product.is_available) availableCount += 1;
    else unavailableCount += 1;
  }
  const selected = selectedSet.size;
  const total = products.length;
  return {
    selected,
    total,
    allSelected: total > 0 && selected === total,
    noneSelected: selected === 0,
    availableCount,
    unavailableCount,
    actionsEnabled: selected > 0,
  };
}

export function formatBulkHeadline(selected: number, total: number): string {
  return `${Math.max(0, selected)} / ${Math.max(0, total)}`;
}

export function shouldClaimBulkBarPan(dx: number, dy: number, capture = false): boolean {
  const threshold = capture ? 14 : 8;
  return dy > threshold && dy > Math.abs(dx) * 1.15;
}

export function shouldCloseBulkBar(dy: number, vy: number): boolean {
  return dy > 64 || vy > 0.85;
}

export type BulkChangeResult = {
  success?: boolean;
  pendingReview?: boolean;
} | null | undefined;

export type BulkChangeKind = 'failed' | 'pending' | 'saved' | 'partial';

export type BulkChangeSummary = {
  successCount: number;
  pendingCount: number;
  failedCount: number;
  kind: BulkChangeKind;
};

export function summarizeBulkChangeResults(results: readonly BulkChangeResult[]): BulkChangeSummary {
  let successCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  for (const result of results) {
    if (result?.success) {
      successCount += 1;
      if (result.pendingReview) pendingCount += 1;
    } else {
      failedCount += 1;
    }
  }
  let kind: BulkChangeKind = 'failed';
  if (successCount === 0) kind = 'failed';
  else if (failedCount > 0) kind = 'partial';
  else if (pendingCount > 0) kind = 'pending';
  else kind = 'saved';
  return { successCount, pendingCount, failedCount, kind };
}

/** 失败或没有回执的商品继续留在已选里，避免把没改成的当成已完成。 */
export function survivingBulkIds(
  ids: readonly string[],
  results: readonly BulkChangeResult[],
): string[] {
  return ids.filter((id, index) => !results[index]?.success);
}
