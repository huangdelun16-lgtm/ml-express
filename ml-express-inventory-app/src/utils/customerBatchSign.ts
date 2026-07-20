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

export function validateBatchSignSelection(
  selected: InventoryItemListRow[],
): string | null {
  if (selected.length === 0) return '请先勾选要签收的订单';
  const keys = new Set(selected.map(resolveCustomerKey).filter(Boolean));
  if (keys.size !== 1) return '批量签收只能选择同一客户的订单';
  return null;
}
