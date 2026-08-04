import type { InventoryItem, PackedShipment, StockMovement } from '../types/inventory';
import { normalizePackDestination } from '../constants/destinationOptions';
import { svc } from '../errors/serviceError';
import { ensureInventoryCloudAuth, type InventoryStoreSession } from './authService';
import { isSupabaseConfigured, supabase } from './supabase';
import { ownershipKeyFromStoreCode } from '../utils/storeOwnership';
import { generateUuid, toNullableUuid } from '../utils/uuid';
import { isInventoryOperationLogDuplicateError } from '../utils/inventoryReliability';

export type CloudStoreItemRow = {
  id: string;
  barcode: string;
  input_barcode: string;
  name: string;
  spec: string;
  unit: string;
  weight: string;
  qty_on_hand: number;
  min_qty: number;
  note: string;
  owner_store_id: string | null;
  owner_store_code: string;
  recipient_name: string;
  final_destination: string;
  hub_arrived_at: string | null;
  customer_signed_at: string | null;
  customer_sign_phone: string;
  customer_sign_pickup_type: string;
  customer_sign_proxy_name: string;
  customer_signature_data: string;
  customer_signed_by_operator: string;
  packed_at: string | null;
  packed_bundle_barcode: string;
  hub_transit_released_at: string | null;
  hub_transit_shipped_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CloudMovementRow = {
  id: string;
  item_id: string;
  barcode: string;
  item_name: string;
  type: string;
  qty: number;
  qty_before: number;
  qty_after: number;
  operator: string;
  note: string;
  recipient_name: string;
  recipient_phone: string;
  destination: string;
  detail_address: string;
  packaging: string;
  input_barcode: string;
  origin_store_id: string | null;
  origin_store_code: string;
  origin_store_name: string;
  created_at: string;
};

export type CloudPackLineRow = {
  id: string;
  pack_id: string;
  item_id: string | null;
  item_barcode: string;
  item_name: string;
  qty: number;
  created_at: string;
};

export type CloudPackRow = {
  id: string;
  bundle_item_id: string | null;
  bundle_barcode: string;
  bundle_name: string;
  operator: string;
  note: string;
  owner_store_id: string | null;
  owner_store_code: string;
  transport_fee: string;
  truck_leg_destination: string;
  loaded_at: string | null;
  created_at: string;
  updated_at: string;
  inventory_packed_shipment_items?: CloudPackLineRow[];
};

type AtomicRpcResult = {
  idempotent?: boolean;
  item?: Record<string, unknown>;
  bundle_item?: Record<string, unknown>;
  pack?: Record<string, unknown>;
  pack_id?: string;
  line_items?: Record<string, unknown>[];
  count?: number;
  trip_number?: string;
};

function cloudUuid(): string {
  return generateUuid();
}

function toNullableTs(value?: string | null): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseRpcJsonResult(data: unknown): AtomicRpcResult {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as AtomicRpcResult;
    } catch {
      return {};
    }
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) return data as AtomicRpcResult;
  return {};
}

function rowToCloudItem(row: Record<string, unknown>): CloudStoreItemRow {
  if (!row || typeof row !== 'object') {
    throw new Error('invalid cloud item row');
  }
  return {
    id: String(row.id),
    barcode: String(row.barcode),
    input_barcode: String(row.input_barcode ?? ''),
    name: String(row.name ?? ''),
    spec: String(row.spec ?? ''),
    unit: String(row.unit ?? '1 Pcs'),
    weight: String(row.weight ?? ''),
    qty_on_hand: Number(row.qty_on_hand) || 0,
    min_qty: Number(row.min_qty) || 0,
    note: String(row.note ?? ''),
    owner_store_id: row.owner_store_id ? String(row.owner_store_id) : null,
    owner_store_code: String(row.owner_store_code ?? ''),
    recipient_name: String(row.recipient_name ?? ''),
    final_destination: String(row.final_destination ?? ''),
    hub_arrived_at: row.hub_arrived_at ? String(row.hub_arrived_at) : null,
    customer_signed_at: row.customer_signed_at ? String(row.customer_signed_at) : null,
    customer_sign_phone: String(row.customer_sign_phone ?? ''),
    customer_sign_pickup_type: String(row.customer_sign_pickup_type ?? ''),
    customer_sign_proxy_name: String(row.customer_sign_proxy_name ?? ''),
    customer_signature_data: String(row.customer_signature_data ?? ''),
    customer_signed_by_operator: String(row.customer_signed_by_operator ?? ''),
    packed_at: row.packed_at ? String(row.packed_at) : null,
    packed_bundle_barcode: String(row.packed_bundle_barcode ?? ''),
    hub_transit_released_at: row.hub_transit_released_at
      ? String(row.hub_transit_released_at)
      : null,
    hub_transit_shipped_at: row.hub_transit_shipped_at
      ? String(row.hub_transit_shipped_at)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function itemToRpcPayload(item: InventoryItem, ownerStoreId?: string | null): Record<string, unknown> {
  return {
    ...item,
    owner_store_id: ownerStoreId ?? null,
    owner_store_code: item.owner_store_code?.trim() ?? '',
    hub_arrived_at: toNullableTs(item.hub_arrived_at),
    customer_signed_at: toNullableTs(item.customer_signed_at),
    customer_sign_phone: item.customer_sign_phone?.trim() ?? '',
    customer_sign_pickup_type: item.customer_sign_pickup_type?.trim() ?? '',
    customer_sign_proxy_name: item.customer_sign_proxy_name?.trim() ?? '',
    customer_signature_data: item.customer_signature_data?.trim() ?? '',
    customer_signed_by_operator: item.customer_signed_by_operator?.trim() ?? '',
    packed_at: toNullableTs(item.packed_at),
    hub_transit_released_at: toNullableTs(item.hub_transit_released_at),
    hub_transit_shipped_at: toNullableTs(item.hub_transit_shipped_at),
  };
}

/** 库存与流水在同一 PostgreSQL 事务中提交；operationId 可安全重试。 */
export async function applyCloudStockMovementAtomic(
  store: InventoryStoreSession,
  item: InventoryItem,
  movement: StockMovement,
  operationId: string,
): Promise<CloudStoreItemRow> {
  if (!isSupabaseConfigured()) throw svc('supabaseTrackingNotConfigured');
  const authStore = await ensureInventoryCloudAuth();
  const ownedByAuthStore =
    ownershipKeyFromStoreCode(item.owner_store_code || store.storeCode) ===
    ownershipKeyFromStoreCode(authStore.storeCode);
  const { data, error } = await supabase.rpc('inventory_apply_stock_movement', {
    p_operation_id: operationId,
    p_item: itemToRpcPayload(item, ownedByAuthStore ? toNullableUuid(authStore.id) : null),
    p_movement: { ...movement, origin_store_id: toNullableUuid(movement.origin_store_id) },
  });
  if (error) {
    if (isInventoryOperationLogDuplicateError(error)) {
      const { data: row, error: fetchErr } = await supabase
        .from('inventory_store_items')
        .select('*')
        .eq('barcode', item.barcode.trim())
        .maybeSingle();
      if (!fetchErr && row) return rowToCloudItem(row as Record<string, unknown>);
    }
    throw new Error(error.message);
  }
  if (!data) throw svc('syncItemFailed');
  const result = data as AtomicRpcResult;
  if (!result.item) throw svc('syncItemFailed');
  return rowToCloudItem(result.item);
}

/** 商品扣减、流水、包和明细在同一事务中提交。 */
export async function createCloudPackedShipmentAtomic(params: {
  store: InventoryStoreSession;
  bundle: InventoryItem;
  pack: PackedShipment;
  lines: { item_id: string; item_barcode: string; qty: number }[];
  originStore: { id: string; storeCode: string; storeName: string };
  operationId: string;
}): Promise<{ bundleItem: CloudStoreItemRow; packId: string }> {
  if (!isSupabaseConfigured()) throw svc('supabaseTrackingNotConfigured');
  const authStore = await ensureInventoryCloudAuth();
  const { data, error } = await supabase.rpc('inventory_create_packed_shipment', {
    p_operation_id: params.operationId,
    p_bundle: itemToRpcPayload(params.bundle, toNullableUuid(authStore.id)),
    p_pack: {
      ...params.pack,
      owner_store_id: toNullableUuid(authStore.id),
      origin_store_id: toNullableUuid(params.originStore.id),
      origin_store_name: params.originStore.storeName,
    },
    p_lines: params.lines,
  });
  if (error || !data) throw error?.message ? new Error(error.message) : svc('syncPackFailed');
  const result = parseRpcJsonResult(data);
  const bundleRow = asRecord(result.bundle_item);
  const packId = result.pack_id ? String(result.pack_id) : '';
  if (!bundleRow || !packId) {
    throw new Error('打包 RPC 未返回快递包数据，请检查网络后重试');
  }
  return { bundleItem: rowToCloudItem(bundleRow), packId };
}

/** 多个入库：订单直接已入库+已打包（库存 0），整包重量写在快递包上。 */
export async function packagingStockInBatchAtomic(params: {
  store: InventoryStoreSession;
  operationId: string;
  payload: Record<string, unknown>;
}): Promise<{
  bundleItem: CloudStoreItemRow;
  packId: string;
  pack: CloudPackRow;
  lineItems: CloudStoreItemRow[];
}> {
  if (!isSupabaseConfigured()) throw svc('supabaseTrackingNotConfigured');
  await ensureInventoryCloudAuth();
  const { data, error } = await supabase.rpc('inventory_packaging_stock_in_batch', {
    p_operation_id: params.operationId,
    p_payload: params.payload,
  });
  if (error) {
    throw new Error(error.message || '多个入库 RPC 失败');
  }
  const result = parseRpcJsonResult(data);
  const bundleRow = asRecord(result.bundle_item);
  const packId = result.pack_id ? String(result.pack_id) : '';
  if (!bundleRow || !packId) {
    throw new Error(
      '多个入库 RPC 未返回快递包数据。请在 Supabase 执行 migration：20260802120000、20260802130000、20260802140000',
    );
  }

  const packRow = asRecord(result.pack);
  let lineRows = Array.isArray(result.line_items)
    ? result.line_items.map(asRecord).filter((row): row is Record<string, unknown> => row !== null)
    : [];

  if (lineRows.length === 0 && Array.isArray(params.payload.lines)) {
    const bundleCode = String(bundleRow.barcode ?? '').trim().toUpperCase();
    const dest = String(params.payload.destination ?? bundleRow.final_destination ?? '').trim().toUpperCase();
    const storeCode = String(params.payload.store_code ?? bundleRow.owner_store_code ?? '').trim().toUpperCase();
    const recipient = String(params.payload.recipient_name ?? bundleRow.recipient_name ?? '');
    const lineNote = String(params.payload.line_note ?? '');
    const inboundAt = String(params.payload.inbound_at ?? bundleRow.created_at ?? new Date().toISOString());
    lineRows = (params.payload.lines as Record<string, unknown>[]).map((line) => ({
      id: String(line.id ?? `${packId}:${String(line.barcode ?? '').trim().toUpperCase()}`),
      barcode: String(line.barcode ?? '').trim().toUpperCase(),
      input_barcode: String(line.input_barcode ?? ''),
      name: String(line.name ?? line.input_barcode ?? ''),
      spec: '',
      unit: `${Math.max(Number(line.qty) || 1, 1)} Pcs`,
      weight: '',
      qty_on_hand: 0,
      min_qty: 0,
      note: lineNote,
      owner_store_code: storeCode,
      recipient_name: recipient,
      final_destination: dest,
      packed_at: inboundAt,
      packed_bundle_barcode: bundleCode,
      created_at: inboundAt,
      updated_at: inboundAt,
    }));
  }

  const parseLineQty = (line: Record<string, unknown>) => {
    const direct = Number(line.qty);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const unit = String(line.unit ?? '');
    const matched = unit.match(/^(\d+(?:\.\d+)?)/);
    return matched ? Number(matched[1]) || 1 : 1;
  };

  const bundleItem = rowToCloudItem(bundleRow);
  return {
    bundleItem,
    packId,
    pack: {
      id: packId,
      bundle_item_id: String(bundleRow.id ?? packRow?.bundle_item_id ?? ''),
      bundle_barcode: String(bundleRow.barcode ?? packRow?.bundle_barcode ?? ''),
      bundle_name: String(bundleRow.name ?? packRow?.bundle_name ?? ''),
      operator: String(packRow?.operator ?? params.payload.operator ?? ''),
      note: String(packRow?.note ?? bundleRow.note ?? ''),
      owner_store_id: packRow?.owner_store_id ? String(packRow.owner_store_id) : null,
      owner_store_code: String(packRow?.owner_store_code ?? bundleRow.owner_store_code ?? ''),
      transport_fee: String(packRow?.transport_fee ?? ''),
      truck_leg_destination: String(packRow?.truck_leg_destination ?? ''),
      loaded_at: packRow?.loaded_at ? String(packRow.loaded_at) : null,
      created_at: String(packRow?.created_at ?? bundleRow.created_at ?? ''),
      updated_at: String(packRow?.updated_at ?? bundleRow.updated_at ?? ''),
      inventory_packed_shipment_items: lineRows.map((line) => ({
        id: `${packId}:${String(line.barcode ?? '')}`,
        pack_id: packId,
        item_id: line.id ? String(line.id) : null,
        item_barcode: String(line.barcode ?? ''),
        item_name: String(line.name ?? ''),
        qty: parseLineQty(line),
        created_at: String(line.created_at ?? ''),
      })),
    },
    lineItems: lineRows.map((line) => rowToCloudItem(line)),
  };
}

/** 包库存、装车标记和云端追踪在同一事务中提交。 */
export async function loadCloudShipmentsAtomic(params: {
  operationId: string;
  payload: Record<string, unknown>;
}): Promise<AtomicRpcResult> {
  if (!isSupabaseConfigured()) throw svc('supabaseTrackingNotConfigured');
  const { data, error } = await supabase.rpc('inventory_load_shipments', {
    p_operation_id: params.operationId,
    p_payload: params.payload,
  });
  if (error) throw new Error(error.message || '装车出库 RPC 失败');
  const result = parseRpcJsonResult(data);
  return {
    count: Number(result.count) || 0,
    trip_number: result.trip_number ? String(result.trip_number) : undefined,
    idempotent: Boolean(result.idempotent),
  };
}

/** 装车前校验：快递包必须已写入 Supabase（不能仅存在于 App 内存缓存） */
export async function fetchCloudPackByBarcode(barcode: string): Promise<{ id: string; bundle_barcode: string } | null> {
  if (!isSupabaseConfigured()) return null;
  await ensureInventoryCloudAuth();
  const code = barcode.trim().toUpperCase();
  if (!code) return null;
  const { data, error } = await supabase
    .from('inventory_packed_shipments')
    .select('id, bundle_barcode')
    .eq('bundle_barcode', code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return { id: String((data as { id: string }).id), bundle_barcode: String((data as { bundle_barcode: string }).bundle_barcode) };
  return null;
}

/** 按条码拉取单个快递包及明细（目的站读到站包 note / 包内序号） */
export async function fetchCloudPackDetailByBarcode(barcode: string): Promise<CloudPackRow | null> {
  if (!isSupabaseConfigured()) return null;
  await ensureInventoryCloudAuth();
  const code = barcode.trim().toUpperCase();
  if (!code) return null;
  const { data: pack, error: packErr } = await supabase
    .from('inventory_packed_shipments')
    .select('*')
    .eq('bundle_barcode', code)
    .maybeSingle();
  if (packErr) throw new Error(packErr.message);
  if (!pack) return null;

  const packId = String((pack as { id: string }).id);
  const { data: lines, error: lineErr } = await supabase
    .from('inventory_packed_shipment_items')
    .select('*')
    .eq('pack_id', packId);
  if (lineErr) throw new Error(lineErr.message);

  return {
    ...(pack as CloudPackRow),
    inventory_packed_shipment_items: (lines ?? []) as CloudPackLineRow[],
  };
}

export async function assertCloudPacksExist(barcodes: string[]): Promise<void> {
  const missing: string[] = [];
  for (const raw of barcodes) {
    const code = raw.trim().toUpperCase();
    if (!code) continue;
    const row = await fetchCloudPackByBarcode(code);
    if (!row) missing.push(code);
  }
  if (missing.length === 0) return;
  throw new Error(
    missing.length === 1
      ? `快递包 ${missing[0]} 未在云端登记，无法装车。请返回「快递明细」重新打包该批订单后再试。`
      : `以下快递包未在云端登记，无法装车：${missing.join('、')}。请重新打包后再装车。`,
  );
}

export async function fetchCloudStoreItems(
  _store: InventoryStoreSession,
  _hubCode: string,
): Promise<CloudStoreItemRow[]> {
  if (!isSupabaseConfigured()) return [];
  await ensureInventoryCloudAuth();
  const itemMap = new Map<string, CloudStoreItemRow>();

  // 依赖 RLS（owner / hub 目的地 / 到站 custody），不用 eq(owner_store_code) 避免店码格式不一致漏行
  const { data, error } = await supabase
    .from('inventory_store_items')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(800);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const item = rowToCloudItem(row as Record<string, unknown>);
    itemMap.set(item.id, item);
  }

  return Array.from(itemMap.values());
}

const MOVEMENT_BATCH_SIZE = 80;

export async function fetchCloudMovementsForItems(itemIds: string[]): Promise<CloudMovementRow[]> {
  if (!isSupabaseConfigured() || itemIds.length === 0) return [];
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];
  const rows: CloudMovementRow[] = [];

  for (let i = 0; i < uniqueIds.length; i += MOVEMENT_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + MOVEMENT_BATCH_SIZE);
    const { data, error } = await supabase
      .from('inventory_stock_movements')
      .select('*')
      .in('item_id', batch)
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    rows.push(
      ...(data ?? []).map((row) => ({
        id: String((row as CloudMovementRow).id),
        item_id: String((row as CloudMovementRow).item_id),
        barcode: String((row as CloudMovementRow).barcode),
        item_name: String((row as CloudMovementRow).item_name ?? ''),
        type: String((row as CloudMovementRow).type),
        qty: Number((row as CloudMovementRow).qty) || 0,
        qty_before: Number((row as CloudMovementRow).qty_before) || 0,
        qty_after: Number((row as CloudMovementRow).qty_after) || 0,
        operator: String((row as CloudMovementRow).operator ?? ''),
        note: String((row as CloudMovementRow).note ?? ''),
        recipient_name: String((row as CloudMovementRow).recipient_name ?? ''),
        recipient_phone: String((row as CloudMovementRow).recipient_phone ?? ''),
        destination: String((row as CloudMovementRow).destination ?? ''),
        detail_address: String((row as CloudMovementRow).detail_address ?? ''),
        packaging: String((row as CloudMovementRow).packaging ?? ''),
        input_barcode: String((row as CloudMovementRow).input_barcode ?? ''),
        origin_store_id: (row as CloudMovementRow).origin_store_id
          ? String((row as CloudMovementRow).origin_store_id)
          : null,
        origin_store_code: String((row as CloudMovementRow).origin_store_code ?? ''),
        origin_store_name: String((row as CloudMovementRow).origin_store_name ?? ''),
        created_at: String((row as CloudMovementRow).created_at),
      })),
    );
  }

  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** 今日出入库汇总（首页统计专用，比拉全量流水轻） */
export async function fetchCloudTodayMovementTotals(): Promise<{ todayIn: number; todayOut: number }> {
  if (!isSupabaseConfigured()) return { todayIn: 0, todayOut: 0 };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('inventory_stock_movements')
    .select('type, qty')
    .gte('created_at', start.toISOString())
    .limit(3000);
  if (error) throw new Error(error.message);
  let todayIn = 0;
  let todayOut = 0;
  for (const row of data ?? []) {
    const type = String((row as { type: string }).type);
    const qty = Number((row as { qty: number }).qty) || 0;
    if (type === 'in') todayIn += qty;
    else if (type === 'out') todayOut += qty;
  }
  return { todayIn, todayOut };
}

export async function fetchCloudPackedShipments(
  _store: InventoryStoreSession,
  _hubCode?: string,
): Promise<CloudPackRow[]> {
  if (!isSupabaseConfigured()) return [];
  await ensureInventoryCloudAuth();
  const { data: packs, error: packErr } = await supabase
    .from('inventory_packed_shipments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (packErr) throw new Error(packErr.message);
  if (!packs?.length) return [];

  const packIds = packs.map((p) => String((p as { id: string }).id));
  const { data: lines, error: lineErr } = await supabase
    .from('inventory_packed_shipment_items')
    .select('*')
    .in('pack_id', packIds);
  if (lineErr) throw new Error(lineErr.message);

  const linesByPack = new Map<string, CloudPackLineRow[]>();
  for (const row of lines ?? []) {
    const line = row as CloudPackLineRow;
    const packId = String(line.pack_id);
    const bucket = linesByPack.get(packId) ?? [];
    bucket.push(line);
    linesByPack.set(packId, bucket);
  }

  return packs.map((row) => ({
    ...(row as CloudPackRow),
    inventory_packed_shipment_items: linesByPack.get(String((row as { id: string }).id)) ?? [],
  }));
}

export async function upsertCloudStoreItem(
  _store: InventoryStoreSession,
  item: InventoryItem,
): Promise<string> {
  if (!isSupabaseConfigured()) return item.id;
  const authStore = await ensureInventoryCloudAuth();
  const authStoreCode = authStore.storeCode.trim().toUpperCase();
  const itemOwnerRaw = item.owner_store_code?.trim() || authStoreCode;
  const ownedByAuthStore =
    ownershipKeyFromStoreCode(itemOwnerRaw) === ownershipKeyFromStoreCode(authStoreCode);
  const finalDestRaw = item.final_destination?.trim() ?? '';
  const finalDestination = normalizePackDestination(finalDestRaw) || finalDestRaw;

  const payload = {
    barcode: item.barcode.trim(),
    input_barcode: item.input_barcode?.trim() ?? '',
    name: item.name.trim(),
    spec: item.spec?.trim() ?? '',
    unit: item.unit?.trim() || '1 Pcs',
    weight: item.weight?.trim() ?? '',
    qty_on_hand: item.qty_on_hand,
    min_qty: item.min_qty ?? 0,
    note: item.note?.trim() ?? '',
    owner_store_id: ownedByAuthStore ? toNullableUuid(authStore.id) : null,
    owner_store_code: ownedByAuthStore ? authStore.storeCode : itemOwnerRaw,
    recipient_name: item.recipient_name?.trim() ?? '',
    final_destination: finalDestination,
    hub_arrived_at: toNullableTs(item.hub_arrived_at),
    customer_signed_at: toNullableTs(item.customer_signed_at),
    customer_sign_phone: item.customer_sign_phone?.trim() ?? '',
    customer_sign_pickup_type: item.customer_sign_pickup_type?.trim() ?? '',
    customer_sign_proxy_name: item.customer_sign_proxy_name?.trim() ?? '',
    customer_signature_data: item.customer_signature_data?.trim() ?? '',
    customer_signed_by_operator: item.customer_signed_by_operator?.trim() ?? '',
    packed_at: toNullableTs(item.packed_at),
    packed_bundle_barcode: item.packed_bundle_barcode?.trim() ?? '',
    hub_transit_released_at: toNullableTs(item.hub_transit_released_at),
    hub_transit_shipped_at: toNullableTs(item.hub_transit_shipped_at),
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('inventory_store_items')
    .upsert(payload, { onConflict: 'barcode' })
    .select('id')
    .single();
  if (error || !data) throw error?.message ? new Error(error.message) : svc('syncItemFailed');
  return String((data as { id: string }).id);
}

export async function insertCloudStockMovement(
  cloudItemId: string,
  movement: StockMovement,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { data: existing } = await supabase
    .from('inventory_stock_movements')
    .select('id')
    .eq('item_id', cloudItemId)
    .eq('type', movement.type)
    .eq('created_at', movement.created_at)
    .eq('qty', movement.qty)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from('inventory_stock_movements').insert({
    id: cloudUuid(),
    item_id: cloudItemId,
    barcode: movement.barcode,
    item_name: movement.item_name,
    type: movement.type,
    qty: movement.qty,
    qty_before: movement.qty_before,
    qty_after: movement.qty_after,
    operator: movement.operator,
    note: movement.note,
    recipient_name: movement.recipient_name,
    recipient_phone: movement.recipient_phone,
    destination: movement.destination,
    detail_address: movement.detail_address,
    packaging: movement.packaging,
    input_barcode: movement.input_barcode,
    origin_store_id: toNullableUuid(movement.origin_store_id),
    origin_store_code: movement.origin_store_code,
    origin_store_name: movement.origin_store_name,
    created_at: movement.created_at,
  });
  if (error) throw new Error(error.message);
}

export async function upsertCloudPackedShipment(
  _store: InventoryStoreSession,
  pack: PackedShipment,
  bundleCloudItemId: string | null,
  lines: { item_barcode: string; item_name: string; qty: number; cloud_item_id?: string | null }[],
  loadedAt: string | null,
): Promise<string> {
  if (!isSupabaseConfigured()) return pack.id;
  const authStore = await ensureInventoryCloudAuth();
  const authStoreCode = authStore.storeCode.trim().toUpperCase();
  const packOwnerRaw = pack.owner_store_code?.trim() || authStoreCode;
  const ownedByAuthStore =
    ownershipKeyFromStoreCode(packOwnerRaw) === ownershipKeyFromStoreCode(authStoreCode);

  const payload = {
    bundle_barcode: pack.bundle_barcode,
    bundle_name: pack.bundle_name,
    bundle_item_id: bundleCloudItemId,
    operator: pack.operator,
    note: pack.note ?? '',
    owner_store_id: ownedByAuthStore ? toNullableUuid(authStore.id) : null,
    owner_store_code: ownedByAuthStore ? authStore.storeCode : packOwnerRaw,
    transport_fee: pack.transport_fee?.trim() ?? '',
    truck_leg_destination: pack.truck_leg_destination?.trim() ?? '',
    loaded_at: loadedAt,
    created_at: pack.created_at,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('inventory_packed_shipments')
    .upsert(payload, { onConflict: 'bundle_barcode' })
    .select('id')
    .single();
  if (error || !data) throw error?.message ? new Error(error.message) : svc('syncPackFailed');
  const packId = String((data as { id: string }).id);

  await supabase.from('inventory_packed_shipment_items').delete().eq('pack_id', packId);
  if (lines.length > 0) {
    const { error: lineErr } = await supabase.from('inventory_packed_shipment_items').insert(
      lines.map((line) => ({
        id: cloudUuid(),
        pack_id: packId,
        item_id: toNullableUuid(line.cloud_item_id),
        item_barcode: line.item_barcode,
        item_name: line.item_name,
        qty: line.qty,
      })),
    );
    if (lineErr) throw new Error(lineErr.message);
  }
  return packId;
}

export async function getCloudItemIdByBarcode(barcode: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const code = barcode.trim();
  if (!code) return null;
  const { data, error } = await supabase
    .from('inventory_store_items')
    .select('id')
    .eq('barcode', code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? String((data as { id: string }).id) : null;
}

export async function fetchCloudItemUpdatedAt(barcode: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const code = barcode.trim();
  if (!code) return null;
  const { data, error } = await supabase
    .from('inventory_store_items')
    .select('updated_at')
    .eq('barcode', code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? String((data as { updated_at: string }).updated_at) : null;
}

/** 拆包：删除云端快递包登记（仅未装车出库的包） */
export async function deleteCloudPackedShipment(bundleBarcode: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const code = bundleBarcode.trim().toUpperCase();
  if (!code) return;

  const { data: packRow, error: findErr } = await supabase
    .from('inventory_packed_shipments')
    .select('id, loaded_at')
    .eq('bundle_barcode', code)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (packRow) {
    const loadedAt = (packRow as { loaded_at?: string | null }).loaded_at;
    if (loadedAt?.trim()) {
      throw svc('cloudPackAlreadyLoaded');
    }
    const packId = String((packRow as { id: string }).id);
    const { error: lineErr } = await supabase
      .from('inventory_packed_shipment_items')
      .delete()
      .eq('pack_id', packId);
    if (lineErr) throw new Error(lineErr.message);
    const { error: packErr } = await supabase
      .from('inventory_packed_shipments')
      .delete()
      .eq('id', packId);
    if (packErr) throw new Error(packErr.message);
  }

  const { data: trackRow } = await supabase
    .from('inventory_pkg_tracking')
    .select('id, status, truck_loaded_at')
    .eq('pack_barcode', code)
    .maybeSingle();
  if (trackRow) {
    const status = String((trackRow as { status: string }).status);
    const truckLoaded = (trackRow as { truck_loaded_at?: string | null }).truck_loaded_at;
    if (truckLoaded?.trim() || status === 'in_transit' || status === 'hub_received' || status === 'completed') {
      throw svc('cloudPackInTrackingCannotUnpack');
    }
    await supabase.from('inventory_order_tracking').delete().eq('pack_barcode', code);
    await supabase.from('inventory_pkg_tracking').delete().eq('pack_barcode', code);
  }

  const bundleCloudId = await getCloudItemIdByBarcode(code);
  if (bundleCloudId) {
    await supabase.from('inventory_stock_movements').delete().eq('item_id', bundleCloudId);
    const { error: itemErr } = await supabase
      .from('inventory_store_items')
      .delete()
      .eq('id', bundleCloudId);
    if (itemErr) throw new Error(itemErr.message);
  }
}

export async function upsertCloudTransportFeePayment(params: {
  packBarcode: string;
  fee: string;
  legDestination: string;
  originStoreCode: string;
  operator: string;
  storeCode: string;
  paidAt: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const packBarcode = params.packBarcode.trim().toUpperCase();
  if (!packBarcode) throw svc('invalidPackBarcode');

  const { error } = await supabase.from('inventory_hub_transport_fee_payments').upsert(
    {
      pack_barcode: packBarcode,
      fee: params.fee.trim(),
      leg_destination_code: params.legDestination.trim().toUpperCase(),
      origin_store_code: params.originStoreCode.trim().toUpperCase(),
      operator: params.operator.trim(),
      store_code: params.storeCode.trim().toUpperCase(),
      paid_at: params.paidAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'pack_barcode' },
  );
  if (error) throw new Error(error.message);
}
