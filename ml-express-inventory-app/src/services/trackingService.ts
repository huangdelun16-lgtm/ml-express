import type { PackedShipmentDetail } from '../types/inventory';
import type {
  OrderTrackingRecord,
  PkgTrackingDetail,
  PkgTrackingRecord,
  PkgTrackingStatus,
} from '../types/tracking';
import type { InventoryStoreSession } from './authService';
import { svc } from '../errors/serviceError';
import { isSupabaseConfigured, supabase } from './supabase';
import { extractDestinationCode } from '../utils/inboundBarcode';
import { resolveOrderDestinationCode } from '../utils/orderDestination';
import { packDestinationFromBarcode } from '../utils/packageNumber';
import { toNullableUuid } from '../utils/uuid';

type OriginStore = {
  id: string;
  storeCode: string;
  storeName: string;
};

/** 已到站或已完结的 PKG 追踪不可被装车 upsert 打回在途 */
function isPkgTrackingLockedForTruckLoad(status: PkgTrackingStatus): boolean {
  return status !== 'in_transit';
}

/** 已交付或已释放的中转订单不可被装车同步打回在途 */
function isOrderTrackingLockedForTruckLoad(status: OrderTrackingRecord['status']): boolean {
  return status === 'hub_received' || status === 'released_at_hub';
}

function rowToPkg(row: Record<string, unknown>): PkgTrackingRecord {
  return {
    id: String(row.id),
    pack_barcode: String(row.pack_barcode),
    pack_name: String(row.pack_name ?? ''),
    origin_store_id: row.origin_store_id ? String(row.origin_store_id) : null,
    origin_store_code: String(row.origin_store_code),
    origin_store_name: String(row.origin_store_name ?? ''),
    destination_code: String(row.destination_code),
    leg_destination_code: String(row.leg_destination_code ?? row.destination_code ?? ''),
    item_count: Number(row.item_count) || 0,
    total_weight: String(row.total_weight ?? ''),
    status: row.status as PkgTrackingRecord['status'],
    truck_outbound_date: row.truck_outbound_date ? String(row.truck_outbound_date) : null,
    truck_loaded_at: row.truck_loaded_at ? String(row.truck_loaded_at) : null,
    hub_received_at: row.hub_received_at ? String(row.hub_received_at) : null,
    hub_received_by_store_code: row.hub_received_by_store_code
      ? String(row.hub_received_by_store_code)
      : null,
    hub_received_by_store_name: row.hub_received_by_store_name
      ? String(row.hub_received_by_store_name)
      : null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    transport_fee: String(row.transport_fee ?? ''),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToOrder(row: Record<string, unknown>): OrderTrackingRecord {
  return {
    id: String(row.id),
    pkg_tracking_id: String(row.pkg_tracking_id),
    pack_barcode: String(row.pack_barcode),
    order_barcode: String(row.order_barcode),
    express_barcode: String(row.express_barcode ?? ''),
    order_name: String(row.order_name ?? ''),
    destination_code: String(row.destination_code ?? ''),
    qty: Number(row.qty) || 1,
    status: row.status as OrderTrackingRecord['status'],
    recipient_name: String(row.recipient_name ?? ''),
    recipient_phone: String(row.recipient_phone ?? ''),
    packaging: String(row.packaging ?? ''),
    spec: String(row.spec ?? ''),
    weight: String(row.weight ?? ''),
    detail_address: String(row.detail_address ?? ''),
    inbound_note: String(row.inbound_note ?? ''),
    inbound_store_name: String(row.inbound_store_name ?? ''),
    inbound_at: row.inbound_at ? String(row.inbound_at) : null,
    hub_received_at: row.hub_received_at ? String(row.hub_received_at) : null,
    hub_received_by_store_code: row.hub_received_by_store_code
      ? String(row.hub_received_by_store_code)
      : null,
    hub_received_by_store_name: row.hub_received_by_store_name
      ? String(row.hub_received_by_store_name)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function toDetail(pkg: PkgTrackingRecord, orders: OrderTrackingRecord[]): PkgTrackingDetail {
  return {
    ...pkg,
    orders,
    received_order_count: orders.filter(
      (o) => o.status === 'hub_received' || o.status === 'released_at_hub',
    ).length,
  };
}

function resolvePackLegDestination(pkg: PkgTrackingRecord): string {
  return (pkg.leg_destination_code || pkg.destination_code).trim().toUpperCase();
}

function isOrderProcessed(status: OrderTrackingRecord['status']): boolean {
  return status === 'hub_received' || status === 'released_at_hub';
}

async function fetchOrderTrackingChunk(
  column: 'order_barcode' | 'express_barcode',
  codes: string[],
): Promise<OrderTrackingRecord[]> {
  if (codes.length === 0) return [];
  const { data, error } = await supabase.from('inventory_order_tracking').select('*').in(column, codes);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToOrder(r as Record<string, unknown>));
}

/** 按扫码值查询订单追踪行（先 order_barcode，再 express_barcode） */
async function fetchOrderTrackingRowsByScanCode(
  code: string,
  limit = 5,
): Promise<Record<string, unknown>[]> {
  const trimmed = code.trim();
  if (!trimmed) return [];

  const { data: byOrder, error: orderErr } = await supabase
    .from('inventory_order_tracking')
    .select('*')
    .eq('order_barcode', trimmed)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (orderErr) throw new Error(orderErr.message);
  if (byOrder?.length) return byOrder as Record<string, unknown>[];

  const { data: byExpress, error: expressErr } = await supabase
    .from('inventory_order_tracking')
    .select('*')
    .eq('express_barcode', trimmed)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (expressErr) throw new Error(expressErr.message);
  return (byExpress ?? []) as Record<string, unknown>[];
}

/** 批量按入库条码查询云端订单追踪 */
export async function fetchOrderTrackingByBarcodes(
  orderBarcodes: string[],
): Promise<OrderTrackingRecord[]> {
  assertSupabaseReady();
  const codes = [...new Set(orderBarcodes.map((c) => c.trim()).filter(Boolean))];
  const results: OrderTrackingRecord[] = [];
  const chunkSize = 80;
  for (let i = 0; i < codes.length; i += chunkSize) {
    results.push(...(await fetchOrderTrackingChunk('order_barcode', codes.slice(i, i + chunkSize))));
  }
  return results;
}

/** 批量按快递单号查询云端订单追踪 */
export async function fetchOrderTrackingByExpressBarcodes(
  expressBarcodes: string[],
): Promise<OrderTrackingRecord[]> {
  assertSupabaseReady();
  const codes = [...new Set(expressBarcodes.map((c) => c.trim()).filter(Boolean))];
  const results: OrderTrackingRecord[] = [];
  const chunkSize = 80;
  for (let i = 0; i < codes.length; i += chunkSize) {
    results.push(...(await fetchOrderTrackingChunk('express_barcode', codes.slice(i, i + chunkSize))));
  }
  return results;
}

/** 按订单条码查询云端追踪（供到站账号补全本地 Invoice） */
export async function getOrderTrackingByBarcode(
  scanCode: string,
  hubCode?: string,
): Promise<OrderTrackingRecord | null> {
  assertSupabaseReady();
  const code = scanCode.trim();
  if (!code) return null;

  const rows = await fetchOrderTrackingRowsByScanCode(code, 5);
  if (!rows.length) return null;

  if (hubCode?.trim()) {
    return await pickOrderTrackingForHubScan(rows, hubCode);
  }
  return rowToOrder(rows[0]);
}

/** 多条追踪命中时：优先本站在途包内尚未交付的订单 */
async function pickOrderTrackingForHubScan(
  rows: Record<string, unknown>[],
  hubCode: string,
): Promise<OrderTrackingRecord | null> {
  if (!rows.length) return null;
  const hub = hubCode.trim().toUpperCase();
  const orders = rows.map((r) => rowToOrder(r));

  const inTransit = orders.filter((o) => o.status === 'in_transit');
  if (inTransit.length === 1) return inTransit[0];

  if (inTransit.length > 1) {
    for (const order of inTransit) {
      const pkg = await getPkgTrackingDetail(order.pack_barcode);
      if (!pkg) continue;
      if (resolvePackLegDestination(pkg) !== hub) continue;
      if (pkg.status === 'hub_received' || pkg.status === 'split_at_hub') {
        return order;
      }
    }
    return inTransit[0];
  }

  const hubReceived = orders.find((o) => o.status === 'hub_received');
  if (hubReceived) return hubReceived;

  return orders[0];
}

async function fetchOrdersForPack(packBarcode: string): Promise<OrderTrackingRecord[]> {
  const { data, error } = await supabase
    .from('inventory_order_tracking')
    .select('*')
    .eq('pack_barcode', packBarcode)
    .order('order_name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToOrder(r as Record<string, unknown>));
}

async function maybeFinalizePkg(pkgId: string, packBarcode: string): Promise<void> {
  const orders = await fetchOrdersForPack(packBarcode);
  if (orders.length === 0) return;
  const allDone = orders.every((o) => isOrderProcessed(o.status));
  if (!allDone) return;

  const { data: pkgRow, error: pkgFetchErr } = await supabase
    .from('inventory_pkg_tracking')
    .select('status')
    .eq('id', pkgId)
    .maybeSingle();
  if (pkgFetchErr) throw new Error(pkgFetchErr.message);

  const currentStatus = String(pkgRow?.status ?? '') as PkgTrackingStatus;
  if (
    currentStatus === 'completed' ||
    currentStatus === 'split_at_hub' ||
    currentStatus === 'cancelled'
  ) {
    return;
  }

  const hasReleased = orders.some((o) => o.status === 'released_at_hub');
  const finalStatus: PkgTrackingStatus = hasReleased ? 'split_at_hub' : 'completed';
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('inventory_pkg_tracking')
    .update({
      status: finalStatus,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', pkgId)
    .in('status', ['hub_received', 'completed']);

  if (error) throw new Error(error.message);
}

function assertSupabaseReady(): void {
  if (!isSupabaseConfigured()) {
    throw svc('supabaseTrackingNotConfigured');
  }
}

export type OrderInboundSnapshot = {
  recipient_name: string;
  recipient_phone: string;
  packaging: string;
  spec: string;
  weight: string;
  detail_address: string;
  inbound_note: string;
  inbound_store_name: string;
  inbound_at: string | null;
};

export async function pushTruckLoadTracking(params: {
  originStore: OriginStore;
  destinationCode: string;
  outboundDate: string;
  packs: PackedShipmentDetail[];
  totalWeightKg: string;
  orderSnapshots?: Record<string, OrderInboundSnapshot>;
  transportFees?: Record<string, string>;
}): Promise<void> {
  assertSupabaseReady();

  const legDest = params.destinationCode.trim().toUpperCase();
  if (!legDest) throw svc('legDestRequired');
  const now = new Date().toISOString();

  for (const pack of params.packs) {
    const packLabelDest = packDestinationFromBarcode(pack.bundle_barcode) || legDest;
    const transportFee =
      params.transportFees?.[pack.bundle_barcode]?.trim() ||
      params.transportFees?.[pack.bundle_barcode.toUpperCase()]?.trim() ||
      '';

    const { data: existingPkgRow, error: existingPkgErr } = await supabase
      .from('inventory_pkg_tracking')
      .select('*')
      .eq('pack_barcode', pack.bundle_barcode)
      .maybeSingle();
    if (existingPkgErr) throw new Error(existingPkgErr.message);

    if (existingPkgRow) {
      const existingStatus = String(existingPkgRow.status) as PkgTrackingStatus;
      if (isPkgTrackingLockedForTruckLoad(existingStatus)) {
        continue;
      }
    }

    let pkgRow: { id: string };
    if (existingPkgRow) {
      const { data, error: pkgError } = await supabase
        .from('inventory_pkg_tracking')
        .update({
          pack_name: pack.bundle_name,
          origin_store_id: toNullableUuid(params.originStore.id),
          origin_store_code: params.originStore.storeCode,
          origin_store_name: params.originStore.storeName,
          destination_code: packLabelDest,
          leg_destination_code: legDest,
          item_count: pack.items.length,
          total_weight: pack.weight ?? '',
          transport_fee: transportFee,
          truck_outbound_date: params.outboundDate,
          truck_loaded_at: now,
          updated_at: now,
        })
        .eq('pack_barcode', pack.bundle_barcode)
        .eq('status', 'in_transit')
        .select('id')
        .single();
      if (pkgError || !data) {
        throw svc('pkgSyncFailed');
      }
      pkgRow = data as { id: string };
    } else {
      const { data, error: pkgError } = await supabase
        .from('inventory_pkg_tracking')
        .insert({
          pack_barcode: pack.bundle_barcode,
          pack_name: pack.bundle_name,
          origin_store_id: toNullableUuid(params.originStore.id),
          origin_store_code: params.originStore.storeCode,
          origin_store_name: params.originStore.storeName,
          destination_code: packLabelDest,
          leg_destination_code: legDest,
          item_count: pack.items.length,
          total_weight: pack.weight ?? '',
          transport_fee: transportFee,
          status: 'in_transit',
          truck_outbound_date: params.outboundDate,
          truck_loaded_at: now,
          updated_at: now,
        })
        .select('id')
        .single();
      if (pkgError || !data) {
        throw svc('pkgSyncFailed');
      }
      pkgRow = data as { id: string };
    }

    const pkgId = String(pkgRow.id);

    for (const line of pack.items) {
      const orderDest = extractDestinationCode(line.destination || line.item_barcode);
      const snap = params.orderSnapshots?.[line.item_barcode];

      const { data: existingRow } = await supabase
        .from('inventory_order_tracking')
        .select('*')
        .eq('order_barcode', line.item_barcode)
        .eq('pack_barcode', pack.bundle_barcode)
        .maybeSingle();
      const existingOrder = existingRow
        ? rowToOrder(existingRow as Record<string, unknown>)
        : null;

      if (existingOrder && isOrderTrackingLockedForTruckLoad(existingOrder.status)) {
        continue;
      }

      const pick = (snapVal: string | undefined, existingVal: string | undefined, fallback = '') =>
        snapVal?.trim() || existingVal?.trim() || fallback.trim();

      const orderPayload = {
        pkg_tracking_id: pkgId,
        pack_barcode: pack.bundle_barcode,
        order_barcode: line.item_barcode,
        express_barcode: pick(line.input_barcode, existingOrder?.express_barcode),
        order_name: line.item_name,
        destination_code: orderDest,
        qty: line.qty,
        status: 'in_transit' as const,
        recipient_name: pick(snap?.recipient_name, existingOrder?.recipient_name, line.customer_name),
        recipient_phone: pick(snap?.recipient_phone, existingOrder?.recipient_phone),
        packaging: pick(snap?.packaging, existingOrder?.packaging),
        spec: pick(snap?.spec, existingOrder?.spec),
        weight: pick(snap?.weight, existingOrder?.weight),
        detail_address: pick(snap?.detail_address, existingOrder?.detail_address),
        inbound_note: pick(snap?.inbound_note, existingOrder?.inbound_note),
        inbound_store_name:
          pick(snap?.inbound_store_name, existingOrder?.inbound_store_name, params.originStore.storeName),
        inbound_at: snap?.inbound_at ?? existingOrder?.inbound_at ?? null,
        hub_received_at: null,
        hub_received_by_store_code: null,
        hub_received_by_store_name: null,
        updated_at: now,
      };

      if (existingOrder) {
        const { error } = await supabase
          .from('inventory_order_tracking')
          .update(orderPayload)
          .eq('order_barcode', line.item_barcode)
          .eq('pack_barcode', pack.bundle_barcode)
          .eq('status', 'in_transit');
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('inventory_order_tracking').insert(orderPayload);
        if (error) throw new Error(error.message);
      }
    }
  }
}

export async function getPkgTrackingDetail(packBarcode: string): Promise<PkgTrackingDetail | null> {
  assertSupabaseReady();
  const code = packBarcode.trim().toUpperCase();
  const { data, error } = await supabase
    .from('inventory_pkg_tracking')
    .select('*')
    .eq('pack_barcode', code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const pkg = rowToPkg(data as Record<string, unknown>);
  const orders = await fetchOrdersForPack(code);
  return toDetail(pkg, orders);
}

export async function listInboundPackages(
  hubCode: string,
  statuses: PkgTrackingStatus[] = ['in_transit', 'hub_received'],
): Promise<PkgTrackingDetail[]> {
  if (!isSupabaseConfigured()) return [];
  const dest = hubCode.trim().toUpperCase();

  const { data: byLeg, error: legErr } = await supabase
    .from('inventory_pkg_tracking')
    .select('*')
    .eq('leg_destination_code', dest)
    .in('status', statuses)
    .order('truck_loaded_at', { ascending: false });
  if (legErr) throw new Error(legErr.message);

  const { data: byDest, error: destErr } = await supabase
    .from('inventory_pkg_tracking')
    .select('*')
    .is('leg_destination_code', null)
    .eq('destination_code', dest)
    .in('status', statuses)
    .order('truck_loaded_at', { ascending: false });
  if (destErr) throw new Error(destErr.message);

  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const row of [...byLeg ?? [], ...byDest ?? []]) {
    const id = String((row as { id: string }).id);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(row as Record<string, unknown>);
  }

  const result: PkgTrackingDetail[] = [];
  for (const row of merged) {
    const pkg = rowToPkg(row);
    const orders = await fetchOrdersForPack(pkg.pack_barcode);
    result.push(toDetail(pkg, orders));
  }
  return result;
}

export async function listOutboundPackagesFromOrigin(
  storeCode: string,
  statuses: PkgTrackingStatus[] = ['in_transit', 'hub_received'],
): Promise<PkgTrackingDetail[]> {
  if (!isSupabaseConfigured()) return [];
  const code = storeCode.trim().toUpperCase();
  const { data, error } = await supabase
    .from('inventory_pkg_tracking')
    .select('*')
    .eq('origin_store_code', code)
    .in('status', statuses)
    .order('truck_loaded_at', { ascending: false });
  if (error) throw new Error(error.message);

  const result: PkgTrackingDetail[] = [];
  for (const row of data ?? []) {
    const pkg = rowToPkg(row as Record<string, unknown>);
    const orders = await fetchOrdersForPack(pkg.pack_barcode);
    result.push(toDetail(pkg, orders));
  }
  return result;
}

export async function confirmPkgHubReceived(
  packBarcode: string,
  store: InventoryStoreSession,
  hubCode: string,
): Promise<PkgTrackingDetail> {
  const detail = await getPkgTrackingDetail(packBarcode);
  if (!detail) throw svc('pkgNotFoundNeedLoad');

  const dest = hubCode.trim().toUpperCase();
  const legDest = resolvePackLegDestination(detail);
  if (legDest !== dest) {
    throw svc('pkgLegDestMismatch', {
      legDest: legDest || detail.destination_code,
      hub: dest,
    });
  }
  if (detail.status === 'completed' || detail.status === 'split_at_hub') {
    throw svc('pkgSplitCompleted');
  }
  if (detail.status === 'cancelled') throw svc('pkgCancelled');
  if (detail.status === 'hub_received') return detail;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('inventory_pkg_tracking')
    .update({
      status: 'hub_received',
      hub_received_at: now,
      hub_received_by_store_id: store.id,
      hub_received_by_store_code: store.storeCode,
      hub_received_by_store_name: store.storeName,
      updated_at: now,
    })
    .eq('pack_barcode', detail.pack_barcode);

  if (error) throw new Error(error.message);
  return (await getPkgTrackingDetail(detail.pack_barcode))!;
}

async function applyOrderHubReceived(
  order: OrderTrackingRecord,
  store: InventoryStoreSession,
  hubCode: string,
): Promise<{ order: OrderTrackingRecord; pkg: PkgTrackingDetail }> {
  const pkg = await getPkgTrackingDetail(order.pack_barcode);
  if (!pkg) throw svc('linkedPkgNotFound');

  const dest = hubCode.trim().toUpperCase();
  const orderDest = resolveOrderDestinationCode(order);
  const legDest = resolvePackLegDestination(pkg);
  if (orderDest === dest) {
    // 本站最终目的地：到站交付
  } else if (legDest === dest) {
    // 经本站中转：在本站扫码「入库」登记到站
  } else {
    throw svc('orderDestLegMismatch', {
      orderDest: orderDest || '?',
      legDest: legDest || '?',
      hub: dest,
    });
  }
  if (pkg.status === 'in_transit') {
    throw svc('scanPkgFirstBeforeOrders');
  }
  if (order.status === 'hub_received') {
    return { order, pkg };
  }
  if (order.status === 'released_at_hub') {
    throw svc('orderReleasedRepack');
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('inventory_order_tracking')
    .update({
      status: 'hub_received',
      hub_received_at: now,
      hub_received_by_store_code: store.storeCode,
      hub_received_by_store_name: store.storeName,
      updated_at: now,
    })
    .eq('id', order.id);

  if (error) throw new Error(error.message);
  await maybeFinalizePkg(pkg.id, pkg.pack_barcode);

  const updatedPkg = (await getPkgTrackingDetail(pkg.pack_barcode))!;
  const updatedOrder =
    updatedPkg.orders.find((o) => o.id === order.id) ?? { ...order, status: 'hub_received' as const };
  return { order: updatedOrder, pkg: updatedPkg };
}

export async function confirmOrderHubReceived(
  scanCode: string,
  store: InventoryStoreSession,
  hubCode: string,
): Promise<{ order: OrderTrackingRecord; pkg: PkgTrackingDetail }> {
  const code = scanCode.trim();
  if (!code) throw svc('scanOrderBarcode');

  const rows = await fetchOrderTrackingRowsByScanCode(code, 5);
  if (!rows.length) throw svc('orderNotFound');

  const order = await pickOrderTrackingForHubScan(rows, hubCode);
  if (!order) throw svc('orderNotFound');
  return applyOrderHubReceived(order, store, hubCode);
}

/** 在收单列表中直接确认订单已在快递包内 */
export async function confirmOrderInPackById(
  orderId: string,
  store: InventoryStoreSession,
  hubCode: string,
): Promise<{ order: OrderTrackingRecord; pkg: PkgTrackingDetail }> {
  const { data, error } = await supabase
    .from('inventory_order_tracking')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw svc('orderNotFound');

  return applyOrderHubReceived(rowToOrder(data as Record<string, unknown>), store, hubCode);
}

/** 中转站重新打包后：云端订单从 released_at_hub 挂到新快递包，避免同步时重复释放恢复 */
export async function markHubTransitOrdersRepacked(
  lines: { order_barcode: string }[],
  newPackBarcode: string,
  hubCode: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const hub = hubCode.trim().toUpperCase();
  const packCode = newPackBarcode.trim().toUpperCase();
  if (!hub || !packCode || lines.length === 0) return;

  const now = new Date().toISOString();
  const { data: pkgRow } = await supabase
    .from('inventory_pkg_tracking')
    .select('id')
    .eq('pack_barcode', packCode)
    .maybeSingle();

  for (const line of lines) {
    const orderCode = line.order_barcode.trim().toUpperCase();
    if (!orderCode) continue;

    const { data: orderRow, error: fetchError } = await supabase
      .from('inventory_order_tracking')
      .select('id, destination_code, status')
      .eq('order_barcode', orderCode)
      .eq('status', 'released_at_hub')
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!orderRow) continue;

    const dest = resolveOrderDestinationCode({
      destination_code: String((orderRow as { destination_code?: string }).destination_code ?? ''),
      order_barcode: orderCode,
    });
    if (!dest || dest === hub) continue;

    const { error } = await supabase
      .from('inventory_order_tracking')
      .update({
        pack_barcode: packCode,
        pkg_tracking_id: (pkgRow as { id?: string } | null)?.id ?? null,
        status: 'in_transit',
        hub_received_at: null,
        hub_received_by_store_code: null,
        hub_received_by_store_name: null,
        updated_at: now,
      })
      .eq('id', String((orderRow as { id: string }).id));
    if (error) throw new Error(error.message);
  }
}

/** 释放非本站订单，供中转站重新打包转出 */
export async function releaseTransitOrdersAtHub(
  packBarcode: string,
  store: InventoryStoreSession,
  hubCode: string,
  options?: { allowCompleted?: boolean },
): Promise<PkgTrackingDetail> {
  const pkg = await getPkgTrackingDetail(packBarcode);
  if (!pkg) throw svc('pkgNotFoundNeedLoad');

  const hub = hubCode.trim().toUpperCase();
  const packOk =
    pkg.status === 'hub_received' ||
    (options?.allowCompleted && pkg.status === 'completed');
  if (!packOk) {
    throw svc('scanPkgBeforeRelease');
  }

  const toRelease = pkg.orders.filter(
    (o) =>
      (o.status === 'in_transit' || o.status === 'hub_received') &&
      resolveOrderDestinationCode(o) !== hub,
  );
  if (toRelease.length === 0) {
    throw svc('noOrdersToRelease');
  }

  const now = new Date().toISOString();
  for (const order of toRelease) {
    const { error } = await supabase
      .from('inventory_order_tracking')
      .update({
        status: 'released_at_hub',
        hub_received_at: now,
        hub_received_by_store_code: store.storeCode,
        hub_received_by_store_name: store.storeName,
        updated_at: now,
      })
      .eq('id', order.id);
    if (error) throw new Error(error.message);
  }

  await maybeFinalizePkg(pkg.id, pkg.pack_barcode);
  return (await getPkgTrackingDetail(packBarcode))!;
}

/** 批量查询快递包云端状态（打包列表用） */
export async function listPkgTrackingStatusMap(
  barcodes: string[],
): Promise<Record<string, PkgTrackingRecord['status']>> {
  if (!isSupabaseConfigured() || barcodes.length === 0) return {};
  const codes = [...new Set(barcodes.map((b) => b.trim().toUpperCase()).filter(Boolean))];
  const { data, error } = await supabase
    .from('inventory_pkg_tracking')
    .select('pack_barcode, status')
    .in('pack_barcode', codes);
  if (error) throw new Error(error.message);
  const map: Record<string, PkgTrackingRecord['status']> = {};
  for (const row of data ?? []) {
    const code = String((row as { pack_barcode: string }).pack_barcode);
    map[code] = (row as { status: PkgTrackingRecord['status'] }).status;
  }
  return map;
}

/** 清空云端快递包 / 订单追踪（测试重置用） */
export async function clearAllCloudTracking(): Promise<{ orders: number; packs: number }> {
  assertSupabaseReady();

  const { count: orderCount, error: orderError } = await supabase
    .from('inventory_order_tracking')
    .delete({ count: 'exact' })
    .not('id', 'is', null);

  if (orderError) throw new Error(orderError.message);

  const { count: packCount, error: packError } = await supabase
    .from('inventory_pkg_tracking')
    .delete({ count: 'exact' })
    .not('id', 'is', null);

  if (packError) throw new Error(packError.message);

  return {
    orders: orderCount ?? 0,
    packs: packCount ?? 0,
  };
}

export async function findTrackingByAnyCode(code: string): Promise<{
  pkg: PkgTrackingDetail | null;
  order: OrderTrackingRecord | null;
}> {
  if (!isSupabaseConfigured()) return { pkg: null, order: null };
  const q = code.trim();
  if (!q) return { pkg: null, order: null };

  if (q.toUpperCase().startsWith('PKG')) {
    const pkg = await getPkgTrackingDetail(q);
    return { pkg, order: null };
  }

  const rows = await fetchOrderTrackingRowsByScanCode(q, 1);
  if (rows.length) {
    const order = rowToOrder(rows[0]);
    const pkg = await getPkgTrackingDetail(order.pack_barcode);
    return { pkg, order };
  }

  return { pkg: null, order: null };
}
