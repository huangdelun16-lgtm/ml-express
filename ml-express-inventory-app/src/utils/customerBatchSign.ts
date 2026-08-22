import type { InventoryItemListRow } from '../types/inventory';
import type { InventoryStoreSession } from '../services/authService';
import { canMarkCustomerSigned } from './customerSign';
import { isExpressPackItem } from './packItem';

export function resolveCustomerLabel(item: InventoryItemListRow): string {
  return (item.customer_name || item.recipient_name || '').trim();
}

export function resolveCustomerKey(item: InventoryItemListRow): string {
  return resolveCustomerLabel(item).toLowerCase();
}

export function isBatchSignSelectable(
  store: InventoryStoreSession | null | undefined,
  item: InventoryItemListRow,
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
