import { isServiceError, svc } from '../errors/serviceError';
import type { InventoryStoreSession } from './authService';
import type {
  ExceptionReportTarget,
  InventoryExceptionPhoto,
  InventoryExceptionRecord,
} from '../types/inventoryException';
import {
  EXCEPTION_PHOTO_MAX,
  exceptionNeedsQty,
  parseExceptionQty,
  validateInventoryExceptionDraft,
  type InventoryExceptionStatus,
  type InventoryExceptionType,
} from '../utils/inventoryException';
import { generateUuid, toNullableUuid } from '../utils/uuid';
import { withInventoryCloudWrite } from './cloudWriteGuard';
import { rewritePublicStorageUrl } from './nativeSupabaseUrl';
import { isSupabaseConfigured, supabase } from './supabase';

const BUCKET = 'inventory-exceptions';

type ExceptionRow = Omit<InventoryExceptionRecord, 'photos'>;
type PhotoRow = InventoryExceptionPhoto;

function mapException(
  row: ExceptionRow,
  photos: PhotoRow[] = [],
): InventoryExceptionRecord {
  return {
    ...row,
    express_barcode: row.express_barcode ?? '',
    pack_barcode: row.pack_barcode ?? '',
    qty_expected: row.qty_expected == null ? null : Number(row.qty_expected),
    qty_actual: row.qty_actual == null ? null : Number(row.qty_actual),
    photos: photos.map((photo) => ({
      ...photo,
      public_url: rewritePublicStorageUrl(photo.public_url),
    })),
  };
}

async function resolveItemId(target: ExceptionReportTarget): Promise<string | null> {
  if (toNullableUuid(target.itemId)) return target.itemId!.trim();
  const codes = [target.itemBarcode, target.expressBarcode]
    .map((code) => String(code || '').trim().toUpperCase())
    .filter(Boolean);
  if (codes.length === 0) return null;
  const { data } = await supabase
    .from('inventory_store_items')
    .select('id')
    .or(codes.map((code) => `barcode.eq.${code},input_barcode.eq.${code}`).join(','))
    .limit(1)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function uploadExceptionPhoto(
  storeId: string,
  exceptionId: string,
  uri: string,
  index: number,
): Promise<PhotoRow> {
  const formatted = uri.startsWith('file://') || uri.startsWith('content://') ? uri : `file://${uri}`;
  const response = await fetch(formatted);
  if (!response.ok) throw svc('exceptionPhotoUploadFailed');
  const blob = await response.blob();
  const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `${storeId}/${exceptionId}/${index}-${generateUuid()}.${ext}`;
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
  const { error } = await supabase.storage.from(BUCKET).upload(path, new Uint8Array(arrayBuffer), {
    contentType: mime,
    upsert: false,
  });
  if (error) throw svc('exceptionPhotoUploadFailed');
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    id: generateUuid(),
    exception_id: exceptionId,
    storage_path: path,
    public_url: rewritePublicStorageUrl(data.publicUrl),
    created_at: new Date().toISOString(),
  };
}

export async function createInventoryException(params: {
  store: InventoryStoreSession;
  operator: string;
  target: ExceptionReportTarget;
  type: InventoryExceptionType;
  note: string;
  photoUris: string[];
  qtyExpected?: string;
  qtyActual?: string;
}): Promise<InventoryExceptionRecord> {
  if (!isSupabaseConfigured()) throw svc('supabaseNotConfigured');
  const invalid = validateInventoryExceptionDraft({
    type: params.type,
    note: params.note,
    photoCount: params.photoUris.length,
    qtyExpected: params.qtyExpected,
    qtyActual: params.qtyActual,
  });
  if (invalid) throw svc(invalid);

  const itemBarcode = params.target.itemBarcode.trim().toUpperCase();
  if (!itemBarcode) throw svc('scanOrderBarcode');
  const hubCode = params.store.hubCode?.trim().toUpperCase() || '';
  if (!hubCode) throw svc('authJwtMissingHubCode');

  return withInventoryCloudWrite(async () => {
    const itemId = await resolveItemId(params.target);
    const insertRow = {
      item_id: itemId,
      item_barcode: itemBarcode,
      express_barcode: (params.target.expressBarcode || '').trim().toUpperCase() || null,
      pack_barcode: (params.target.packBarcode || '').trim().toUpperCase() || null,
      order_tracking_id: toNullableUuid(params.target.orderTrackingId),
      exception_type: params.type,
      status: 'open',
      qty_expected: exceptionNeedsQty(params.type) ? parseExceptionQty(params.qtyExpected) : null,
      qty_actual: exceptionNeedsQty(params.type) ? parseExceptionQty(params.qtyActual) : null,
      note: params.note.trim(),
      reported_store_id: params.store.id,
      reported_store_code: params.store.storeCode.trim().toUpperCase(),
      reported_hub_code: hubCode,
      reported_operator: params.operator.trim() || '工作人员',
    };

    const { data, error } = await supabase
      .from('inventory_exceptions')
      .insert(insertRow)
      .select('*')
      .single();
    if (error || !data) throw svc('exceptionCreateFailed');

    const exceptionId = String(data.id);
    const photos: PhotoRow[] = [];
    try {
      for (let i = 0; i < Math.min(params.photoUris.length, EXCEPTION_PHOTO_MAX); i += 1) {
        const uploaded = await uploadExceptionPhoto(
          params.store.id,
          exceptionId,
          params.photoUris[i],
          i,
        );
        const { error: photoErr } = await supabase.from('inventory_exception_photos').insert({
          exception_id: exceptionId,
          storage_path: uploaded.storage_path,
          public_url: uploaded.public_url,
        });
        if (photoErr) throw photoErr;
        photos.push(uploaded);
      }
    } catch (uploadError) {
      await supabase.from('inventory_exceptions').delete().eq('id', exceptionId);
      if (photos.length) {
        await supabase.storage.from(BUCKET).remove(photos.map((photo) => photo.storage_path));
      }
      throw isServiceError(uploadError) ? uploadError : svc('exceptionPhotoUploadFailed');
    }

    if (photos.length === 0) {
      await supabase.from('inventory_exceptions').delete().eq('id', exceptionId);
      throw svc('exceptionPhotoRequired');
    }

    return mapException(data as ExceptionRow, photos);
  });
}

export async function listInventoryExceptions(options?: {
  status?: InventoryExceptionStatus | 'all';
  itemBarcode?: string;
  packBarcode?: string;
  limit?: number;
}): Promise<InventoryExceptionRecord[]> {
  if (!isSupabaseConfigured()) throw svc('supabaseNotConfigured');
  let query = supabase
    .from('inventory_exceptions')
    .select('*, inventory_exception_photos(*)')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 80);
  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }
  if (options?.itemBarcode?.trim()) {
    query = query.eq('item_barcode', options.itemBarcode.trim().toUpperCase());
  }
  if (options?.packBarcode?.trim()) {
    query = query.eq('pack_barcode', options.packBarcode.trim().toUpperCase());
  }
  const { data, error } = await query;
  if (error) throw svc('exceptionCreateFailed');
  return (data || []).map((row) => {
    const photos = Array.isArray(row.inventory_exception_photos)
      ? (row.inventory_exception_photos as PhotoRow[])
      : [];
    const { inventory_exception_photos: _ignored, ...rest } = row as ExceptionRow & {
      inventory_exception_photos?: PhotoRow[];
    };
    return mapException(rest, photos);
  });
}

export async function listOpenExceptionBarcodes(): Promise<Set<string>> {
  const rows = await listInventoryExceptions({ status: 'open', limit: 200 });
  return new Set(
    rows.flatMap((row) =>
      [row.item_barcode, row.express_barcode].map((code) => code.trim().toUpperCase()).filter(Boolean),
    ),
  );
}

export async function resolveInventoryException(params: {
  exceptionId: string;
  operator: string;
  resolveNote?: string;
}): Promise<InventoryExceptionRecord> {
  if (!isSupabaseConfigured()) throw svc('supabaseNotConfigured');
  return withInventoryCloudWrite(async () => {
    const { data: existing, error: loadError } = await supabase
      .from('inventory_exceptions')
      .select('*, inventory_exception_photos(*)')
      .eq('id', params.exceptionId)
      .maybeSingle();
    if (loadError || !existing) throw svc('exceptionNotFound');
    if (existing.status !== 'open') throw svc('exceptionAlreadyClosed');

    const { data, error } = await supabase
      .from('inventory_exceptions')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: params.operator.trim() || '工作人员',
        resolve_note: (params.resolveNote || '').trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.exceptionId)
      .select('*, inventory_exception_photos(*)')
      .single();
    if (error || !data) throw svc('exceptionResolveFailed');
    const photos = Array.isArray(data.inventory_exception_photos)
      ? (data.inventory_exception_photos as PhotoRow[])
      : [];
    const { inventory_exception_photos: _ignored, ...rest } = data as ExceptionRow & {
      inventory_exception_photos?: PhotoRow[];
    };
    return mapException(rest, photos);
  });
}
