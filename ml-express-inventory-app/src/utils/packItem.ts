import type { InventoryItem } from '../types/inventory';

import { isPackageBarcode } from './packageNumber';

export function isExpressPackItem(item: Pick<InventoryItem, 'barcode'>): boolean {
  return isPackageBarcode(item.barcode);
}
