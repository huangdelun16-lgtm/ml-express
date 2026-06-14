import type { InventoryItem, PackedShipment, StockMovement } from '../types/inventory';
import type { InventoryStoreSession } from './authService';
import { isSupabaseConfigured, supabase } from './supabase';

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

function cloudUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toNullableTs(value?: string | null): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function rowToCloudItem(row: Record<string, unknown>): CloudStoreItemRow {
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
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function fetchCloudStoreItems(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<CloudStoreItemRow[]> {
  if (!isSupabaseConfigured()) return [];
  const storeCode = store.storeCode.trim().toUpperCase();
  const hub = hubCode.trim().toUpperCase();
  const { data, error } = await supabase
    .from('inventory_store_items')
    .select('*')
    .or(`owner_store_code.eq.${storeCode},final_destination.eq.${hub}`)
    .order('updated_at', { ascending: false })
    .limit(800);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToCloudItem(row as Record<string, unknown>));
}

export async function fetchCloudMovementsForItems(itemIds: string[]): Promise<CloudMovementRow[]> {
  if (!isSupabaseConfigured() || itemIds.length === 0) return [];
  const { data, error } = await supabase
    .from('inventory_stock_movements')
    .select('*')
    .in('item_id', itemIds)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
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
  }));
}

export async function fetchCloudPackedShipments(
  store: InventoryStoreSession,
): Promise<CloudPackRow[]> {
  if (!isSupabaseConfigured()) return [];
  const storeCode = store.storeCode.trim().toUpperCase();
  const { data, error } = await supabase
    .from('inventory_packed_shipments')
    .select('*, inventory_packed_shipment_items(*)')
    .eq('owner_store_code', storeCode)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row as CloudPackRow);
}

export async function upsertCloudStoreItem(
  store: InventoryStoreSession,
  item: InventoryItem,
): Promise<string> {
  if (!isSupabaseConfigured()) return item.id;
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
    owner_store_id: store.id,
    owner_store_code: item.owner_store_code?.trim() || store.storeCode,
    recipient_name: item.recipient_name?.trim() ?? '',
    final_destination: item.final_destination?.trim() ?? '',
    hub_arrived_at: toNullableTs(item.hub_arrived_at),
    customer_signed_at: toNullableTs(item.customer_signed_at),
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('inventory_store_items')
    .upsert(payload, { onConflict: 'barcode' })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? '同步商品失败');
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
    origin_store_id: movement.origin_store_id?.trim() || null,
    origin_store_code: movement.origin_store_code,
    origin_store_name: movement.origin_store_name,
    created_at: movement.created_at,
  });
  if (error) throw new Error(error.message);
}

export async function upsertCloudPackedShipment(
  store: InventoryStoreSession,
  pack: PackedShipment,
  bundleCloudItemId: string | null,
  lines: { item_barcode: string; item_name: string; qty: number; cloud_item_id?: string | null }[],
  loadedAt: string | null,
): Promise<string> {
  if (!isSupabaseConfigured()) return pack.id;
  const payload = {
    bundle_barcode: pack.bundle_barcode,
    bundle_name: pack.bundle_name,
    bundle_item_id: bundleCloudItemId,
    operator: pack.operator,
    note: pack.note ?? '',
    owner_store_id: store.id,
    owner_store_code: pack.owner_store_code?.trim() || store.storeCode,
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
  if (error || !data) throw new Error(error?.message ?? '同步快递包失败');
  const packId = String((data as { id: string }).id);

  await supabase.from('inventory_packed_shipment_items').delete().eq('pack_id', packId);
  if (lines.length > 0) {
    const { error: lineErr } = await supabase.from('inventory_packed_shipment_items').insert(
      lines.map((line) => ({
        id: cloudUuid(),
        pack_id: packId,
        item_id: line.cloud_item_id ?? null,
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
