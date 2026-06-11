import type { InventoryItem } from '../types/inventory';

export function isExpressPackItem(item: Pick<InventoryItem, 'barcode'>): boolean {
  return item.barcode.trim().toUpperCase().startsWith('PKG');
}
