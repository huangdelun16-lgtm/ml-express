export const INVENTORY_EXCEPTION_TYPES = [
  'damage',
  'shortage',
  'excess',
  'lost',
  'wrong_item',
  'return_origin',
] as const;

export type InventoryExceptionType = (typeof INVENTORY_EXCEPTION_TYPES)[number];

export const INVENTORY_EXCEPTION_STATUSES = ['open', 'resolved', 'cancelled'] as const;
export type InventoryExceptionStatus = (typeof INVENTORY_EXCEPTION_STATUSES)[number];

export const EXCEPTION_NOTE_MIN = 2;
export const EXCEPTION_NOTE_MAX = 500;
export const EXCEPTION_PHOTO_MIN = 1;
export const EXCEPTION_PHOTO_MAX = 6;

export type InventoryExceptionValidationCode =
  | 'exceptionTypeRequired'
  | 'exceptionNoteRequired'
  | 'exceptionPhotoRequired'
  | 'exceptionPhotoLimit'
  | 'exceptionQtyInvalid';

export type InventoryExceptionDraft = {
  type: string;
  note: string;
  photoCount: number;
  qtyExpected?: string | number | null;
  qtyActual?: string | number | null;
};

export function isInventoryExceptionType(value: string): value is InventoryExceptionType {
  return (INVENTORY_EXCEPTION_TYPES as readonly string[]).includes(value);
}

export function exceptionNeedsQty(type: string): boolean {
  return type === 'shortage' || type === 'excess';
}

export function parseExceptionQty(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const n = Number(text.replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function validateInventoryExceptionDraft(
  draft: InventoryExceptionDraft,
): InventoryExceptionValidationCode | null {
  if (!isInventoryExceptionType(String(draft.type || '').trim())) {
    return 'exceptionTypeRequired';
  }
  const note = String(draft.note || '').trim();
  if (note.length < EXCEPTION_NOTE_MIN || note.length > EXCEPTION_NOTE_MAX) {
    return 'exceptionNoteRequired';
  }
  const photos = Number(draft.photoCount) || 0;
  if (photos < EXCEPTION_PHOTO_MIN) return 'exceptionPhotoRequired';
  if (photos > EXCEPTION_PHOTO_MAX) return 'exceptionPhotoLimit';

  if (exceptionNeedsQty(draft.type)) {
    const expected = parseExceptionQty(draft.qtyExpected);
    const actual = parseExceptionQty(draft.qtyActual);
    if (expected == null || actual == null) return 'exceptionQtyInvalid';
    if (draft.type === 'shortage' && !(actual < expected)) return 'exceptionQtyInvalid';
    if (draft.type === 'excess' && !(actual > expected)) return 'exceptionQtyInvalid';
  }
  return null;
}

export function canResolveInventoryException(status: string): boolean {
  return status === 'open';
}

export function countOpenInventoryExceptions(
  rows: Array<{ status?: string | null }>,
): number {
  return rows.filter((row) => row.status === 'open').length;
}

export function exceptionTargetFromItem(item: {
  id?: string;
  barcode: string;
  input_barcode?: string;
  packed_bundle_barcode?: string;
  parent_pack_barcode?: string;
  name?: string;
  qty_on_hand?: number;
}): {
  itemId?: string;
  itemBarcode: string;
  expressBarcode?: string;
  packBarcode?: string;
  itemName?: string;
  qtyExpected?: number | null;
} {
  return {
    itemId: item.id,
    itemBarcode: item.barcode,
    expressBarcode: item.input_barcode,
    packBarcode: item.parent_pack_barcode || item.packed_bundle_barcode,
    itemName: item.name,
    qtyExpected: item.qty_on_hand ?? null,
  };
}

export function exceptionTargetFromHubOrder(line: {
  id: string;
  order_barcode: string;
  express_barcode?: string;
  pack_barcode?: string;
  order_name?: string;
  qty?: number;
}): {
  itemBarcode: string;
  expressBarcode?: string;
  packBarcode?: string;
  orderTrackingId: string;
  itemName?: string;
  qtyExpected?: number | null;
} {
  return {
    itemBarcode: line.order_barcode,
    expressBarcode: line.express_barcode,
    packBarcode: line.pack_barcode,
    orderTrackingId: line.id,
    itemName: line.order_name,
    qtyExpected: line.qty ?? null,
  };
}
