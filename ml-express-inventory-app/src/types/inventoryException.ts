import type {
  InventoryExceptionStatus,
  InventoryExceptionType,
} from '../utils/inventoryException';

export type InventoryExceptionPhoto = {
  id: string;
  exception_id: string;
  storage_path: string;
  public_url: string;
  created_at: string;
};

export type InventoryExceptionRecord = {
  id: string;
  item_id: string | null;
  item_barcode: string;
  express_barcode: string;
  pack_barcode: string;
  order_tracking_id: string | null;
  exception_type: InventoryExceptionType;
  status: InventoryExceptionStatus;
  qty_expected: number | null;
  qty_actual: number | null;
  note: string;
  reported_store_id: string;
  reported_store_code: string;
  reported_hub_code: string;
  reported_operator: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolve_note: string | null;
  created_at: string;
  updated_at: string;
  photos: InventoryExceptionPhoto[];
};

export type ExceptionReportTarget = {
  itemId?: string | null;
  itemBarcode: string;
  expressBarcode?: string;
  packBarcode?: string;
  orderTrackingId?: string | null;
  itemName?: string;
  qtyExpected?: number | null;
};
