import type { PackedShipmentDetail } from '../types/inventory';
import type {
  OrderTrackingRecord,
  PkgTrackingDetail,
  PkgTrackingRecord,
  PkgTrackingStatus,
} from '../types/tracking';
import type { InventoryStoreSession } from './authService';
import { getSupabaseConfigHint, isSupabaseConfigured, supabase } from './supabase';
import { extractDestinationCode } from '../utils/inboundBarcode';
import { resolveOrderDestinationCode } from '../utils/orderDestination';
import { packDestinationFromBarcode } from '../utils/packageNumber';

type OriginStore = {
  id: string;
  storeCode: string;
  storeName: string;
};

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

  const hasReleased = orders.some((o) => o.status === 'released_at_hub');
  const now = new Date().toISOString();
  await supabase
    .from('inventory_pkg_tracking')
    .update({
      status: hasReleased ? 'split_at_hub' : 'completed',
      completed_at: now,
      updated_at: now,
    })
    .eq('id', pkgId);
}

function assertSupabaseReady(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(getSupabaseConfigHint() || '未配置 Supabase，无法同步云端追踪');
  }
}

/** 到站扫码查不到包裹时的说明文案 */
export function formatPkgNotFoundHint(packBarcode: string, hubCode: string): string {
  const packDest = packDestinationFromBarcode(packBarcode);
  const hub = hubCode.trim().toUpperCase();
  const lines = [
    '云端未找到该快递包追踪记录。',
    '',
    '请确认发站已完成以下步骤：',
    '1. 在「装车出库」选中该包裹并提交',
    '2. 成功提示中含「已同步云端」',
    '3. 发站与本站使用同一 Supabase 项目（.env 配置一致）',
    '4. 已执行数据库迁移 inventory_pkg_tracking',
  ];
  if (packDest && hub && packDest !== hub) {
    lines.push(
      '',
      `包装号标注目的地 ${packDest}，本站 ${hub}。若为本段运达站，请确认发站装车时目的地选 ${hub}`,
    );
  } else if (packDest) {
    lines.push('', `包装号目的地：${packDest}`);
  }
  lines.push('', '若发站已装车但未同步，可在发站「打包快递」页对该包裹「补传云端」。');
  return lines.join('\n');
}

export async function pushTruckLoadTracking(params: {
  originStore: OriginStore;
  destinationCode: string;
  outboundDate: string;
  packs: PackedShipmentDetail[];
  totalWeightKg: string;
}): Promise<void> {
  assertSupabaseReady();

  const legDest = params.destinationCode.trim().toUpperCase();
  if (!legDest) throw new Error('请填写本段装车运达站');
  const now = new Date().toISOString();

  for (const pack of params.packs) {
    const packLabelDest = packDestinationFromBarcode(pack.bundle_barcode) || legDest;

    const { data: pkgRow, error: pkgError } = await supabase
      .from('inventory_pkg_tracking')
      .upsert(
        {
          pack_barcode: pack.bundle_barcode,
          pack_name: pack.bundle_name,
          origin_store_id: params.originStore.id,
          origin_store_code: params.originStore.storeCode,
          origin_store_name: params.originStore.storeName,
          destination_code: packLabelDest,
          leg_destination_code: legDest,
          item_count: pack.items.length,
          total_weight: pack.weight ?? '',
          status: 'in_transit',
          truck_outbound_date: params.outboundDate,
          truck_loaded_at: now,
          hub_received_at: null,
          hub_received_by_store_id: null,
          hub_received_by_store_code: null,
          hub_received_by_store_name: null,
          completed_at: null,
          updated_at: now,
        },
        { onConflict: 'pack_barcode' },
      )
      .select('id')
      .single();

    if (pkgError || !pkgRow) {
      throw new Error(pkgError?.message ?? '同步快递包追踪失败');
    }

    const pkgId = String((pkgRow as { id: string }).id);

    for (const line of pack.items) {
      const orderDest = extractDestinationCode(line.destination || line.item_barcode);
      const orderPayload = {
        pkg_tracking_id: pkgId,
        pack_barcode: pack.bundle_barcode,
        order_barcode: line.item_barcode,
        express_barcode: line.input_barcode ?? '',
        order_name: line.item_name,
        destination_code: orderDest,
        qty: line.qty,
        status: 'in_transit' as const,
        hub_received_at: null,
        hub_received_by_store_code: null,
        hub_received_by_store_name: null,
        updated_at: now,
      };

      const { data: existing } = await supabase
        .from('inventory_order_tracking')
        .select('id')
        .eq('order_barcode', line.item_barcode)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('inventory_order_tracking')
          .update(orderPayload)
          .eq('order_barcode', line.item_barcode);
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
  const { data, error } = await supabase
    .from('inventory_pkg_tracking')
    .select('*')
    .or(`leg_destination_code.eq.${dest},and(leg_destination_code.is.null,destination_code.eq.${dest})`)
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
  if (!detail) throw new Error('未找到该快递包追踪记录，请确认已从发站装车出库并同步云端');

  const dest = hubCode.trim().toUpperCase();
  const legDest = resolvePackLegDestination(detail);
  if (legDest !== dest) {
    throw new Error(
      `该包裹本段运达站为 ${legDest || detail.destination_code}，本站服务区域为 ${dest}`,
    );
  }
  if (detail.status === 'completed' || detail.status === 'split_at_hub') {
    throw new Error('该快递包已分拨完成');
  }
  if (detail.status === 'cancelled') throw new Error('该快递包已取消');
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
  if (!pkg) throw new Error('关联快递包追踪记录不存在');

  const dest = hubCode.trim().toUpperCase();
  const orderDest = resolveOrderDestinationCode(order);
  if (orderDest !== dest) {
    throw new Error(
      `该订单目的地为 ${orderDest || '未知'}，本站为 ${dest}。非本站订单请使用「释放待转出」`,
    );
  }
  if (pkg.status === 'in_transit') {
    throw new Error('请先扫描快递包条码并确认到站收货，再逐单确认订单');
  }
  if (order.status === 'hub_received') {
    return { order, pkg };
  }
  if (order.status === 'released_at_hub') {
    throw new Error('该订单已释放待转出，请至「快递明细」重新打包');
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
  if (!code) throw new Error('请扫描订单条码');

  const { data: orderRows, error: orderError } = await supabase
    .from('inventory_order_tracking')
    .select('*')
    .or(`order_barcode.eq.${code},express_barcode.eq.${code}`)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (orderError) throw new Error(orderError.message);
  if (!orderRows?.length) throw new Error('未找到该订单追踪记录');

  const order = rowToOrder(orderRows[0] as Record<string, unknown>);
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
  if (!data) throw new Error('未找到该订单追踪记录');

  return applyOrderHubReceived(rowToOrder(data as Record<string, unknown>), store, hubCode);
}

/** 释放非本站订单，供中转站重新打包转出 */
export async function releaseTransitOrdersAtHub(
  packBarcode: string,
  store: InventoryStoreSession,
  hubCode: string,
): Promise<PkgTrackingDetail> {
  const pkg = await getPkgTrackingDetail(packBarcode);
  if (!pkg) throw new Error('未找到该快递包追踪记录');

  const hub = hubCode.trim().toUpperCase();
  if (pkg.status !== 'hub_received') {
    throw new Error('请先确认快递包到站，再释放待转出订单');
  }

  const toRelease = pkg.orders.filter(
    (o) => o.status === 'in_transit' && resolveOrderDestinationCode(o) !== hub,
  );
  if (toRelease.length === 0) {
    throw new Error('没有可释放的待转出订单（本站订单请逐单「确认」交付）');
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

  const { data: orderRows } = await supabase
    .from('inventory_order_tracking')
    .select('*')
    .or(`order_barcode.eq.${q},express_barcode.eq.${q}`)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (orderRows?.length) {
    const order = rowToOrder(orderRows[0] as Record<string, unknown>);
    const pkg = await getPkgTrackingDetail(order.pack_barcode);
    return { pkg, order };
  }

  return { pkg: null, order: null };
}
