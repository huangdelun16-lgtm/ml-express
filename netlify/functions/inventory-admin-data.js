/**
 * Admin 跨境物流 / Inventory App 控制台数据
 * 使用 Service Role 读取 inventory_* 表（绕过 Inventory JWT RLS）
 * 需已通过 admin Cookie 认证
 *
 * section 参数拆分加载（减轻首屏）：
 * - overview：账号列表 + 统计 + 车费合计（优先 inventory_admin_overview_stats RPC）
 * - finance：中转站财务 + 跨境财务（financePage / financePageSize 分页明细）
 * - packs：运输明细（packStatus）
 * - orders：订单级追踪（orderStatus；packBarcode 时按包装号返回包内全部订单）
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { aggregateFinanceForTransitStores } = require('./utils/inventoryFinanceAggregate');
const { parseFinancePeriodQuery } = require('./utils/yangonFinancePeriod');
const { buildTripFeeGroupMap } = require('./utils/tripTransportFee');
const {
  PACK_DISPLAY_LABEL,
  matchesPackTransportFilter,
  packStatusesForQuery,
  resolvePackDisplayStatusFromTracking,
} = require('./utils/packDisplayStatus');
const {
  attachPickupToOrders,
  collectItemLookupCodes,
  escapePostgrestIlike,
  filterAwaitingPickupOrders,
  filterSignedOrders,
  uniqueCodes,
} = require('./utils/inventoryOrderPickup');
const { applyStationKeys, parseStationKeys, rowTouchesStation } = require('./utils/inventoryStationFilter');

const CONSOLE_LIST_LIMIT = 500;
const PACK_STATION_COLUMNS = [
  'origin_store_code',
  'destination_code',
  'leg_destination_code',
  'hub_received_by_store_code',
];
const ORDER_STATION_COLUMNS = ['destination_code', 'hub_received_by_store_code'];

const ORDER_TRACKING_SELECT =
  'id, pack_barcode, order_barcode, express_barcode, order_name, destination_code, qty, status, recipient_name, recipient_phone, inbound_store_name, hub_received_at, hub_received_by_store_code, hub_received_by_store_name, created_at, updated_at';
const STORE_ITEM_PICKUP_SELECT =
  'barcode, input_barcode, customer_signed_at, arrival_notified_at, hub_arrived_at';
const STORE_ITEM_PICKUP_SELECT_FALLBACK =
  'barcode, input_barcode, customer_signed_at, hub_arrived_at';


async function countRows(supabase, table, filters = []) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [op, col, val] of filters) {
    if (op === 'eq') query = query.eq(col, val);
    if (op === 'neq') query = query.neq(col, val);
    if (op === 'is') query = query.is(col, val);
    if (op === 'gt') query = query.gt(col, val);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function safeCount(supabase, table, filters = []) {
  try {
    return await countRows(supabase, table, filters);
  } catch (error) {
    console.warn(`inventory-admin-data: count ${table} skipped`, error?.message || error);
    return 0;
  }
}

function parseTransportFeeAmount(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw == null || !String(raw).trim()) return 0;
  const n = Number(String(raw).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

async function sumAllTransportFees(supabase) {
  const { data, error } = await supabase.rpc('inventory_admin_transport_fee_total');
  if (!error && data != null) {
    return Math.round(Number(data) || 0);
  }

  if (error) {
    console.warn(
      'inventory-admin-data: transport fee RPC failed, falling back',
      error.message,
    );
  }

  const { data: rows, error: scanErr } = await supabase
    .from('inventory_pkg_tracking')
    .select(
      'pack_barcode, trip_number, transport_fee, truck_loaded_at, origin_store_code, leg_destination_code, destination_code',
    )
    .neq('status', 'cancelled')
    .limit(3000);

  if (scanErr) {
    console.warn('inventory-admin-data: transport fee sum failed', scanErr.message);
    return 0;
  }

  const groupMap = buildTripFeeGroupMap(rows || []);
  let total = 0;
  for (const group of groupMap.values()) {
    total += group.fee;
  }
  return Math.round(total);
}

function normalizeOverviewStats(raw) {
  const n = (key) => Math.max(0, Number(raw?.[key]) || 0);
  return {
    stats: {
      storeItemsTotal: n('storeItemsTotal'),
      storeItemsInStock: n('storeItemsInStock'),
      packsInTransit: n('packsInTransit'),
      packsHubReceived: n('packsHubReceived'),
      packsCompleted: n('packsCompleted'),
      packsCancelled: n('packsCancelled'),
      ordersInTransit: n('ordersInTransit'),
      ordersHubReceived: n('ordersHubReceived'),
    },
    transportFeeTotal: Math.round(n('transportFeeTotal')),
  };
}

/** P3：优先单次 RPC；失败时回退到并行 count + 车费 SUM */
async function loadOverviewSnapshot(supabase) {
  const { data, error } = await supabase.rpc('inventory_admin_overview_stats');
  if (!error && data && typeof data === 'object') {
    return normalizeOverviewStats(data);
  }

  if (error) {
    console.warn(
      'inventory-admin-data: overview stats RPC failed, falling back',
      error.message,
    );
  }

  const [stats, transportFeeTotal] = await Promise.all([
    loadStats(supabase),
    sumAllTransportFees(supabase),
  ]);
  return { stats, transportFeeTotal };
}

async function loadPackedQtyByBarcode(supabase, barcodes) {
  const codes = [...new Set(barcodes.map((b) => String(b || '').trim()).filter(Boolean))];
  if (!codes.length) return {};

  const { data, error } = await supabase
    .from('inventory_packed_shipments')
    .select('bundle_barcode, item:inventory_store_items(qty_on_hand)')
    .in('bundle_barcode', codes);

  if (error) {
    console.warn('inventory-admin-data: packed shipments lookup failed', error.message);
    return {};
  }

  const map = {};
  for (const row of data || []) {
    const code = String(row.bundle_barcode || '').trim().toUpperCase();
    const qty = row.item?.qty_on_hand;
    if (code && typeof qty === 'number' && Number.isFinite(qty)) {
      map[code] = qty;
    }
  }
  return map;
}

function normalizePackRow(row, qtyOnHand) {
  const leg = String(row.leg_destination_code || '').trim().toUpperCase();
  const finalDest = String(row.destination_code || '').trim().toUpperCase();
  const feeRaw = row.transport_fee;
  let transportFee = null;
  if (typeof feeRaw === 'number' && Number.isFinite(feeRaw)) {
    transportFee = feeRaw;
  } else if (feeRaw != null && String(feeRaw).trim()) {
    transportFee = parseSettingsValue(feeRaw);
  }

  const displayStatus = resolvePackDisplayStatusFromTracking(row, qtyOnHand);

  return {
    id: row.id,
    pack_barcode: row.pack_barcode,
    pack_name: row.pack_name,
    origin_store_code: row.origin_store_code,
    origin_store_name: row.origin_store_name,
    destination_code: finalDest || row.destination_code,
    leg_destination_code: leg || null,
    item_count: row.item_count ?? 0,
    total_weight: row.total_weight ?? null,
    status: row.status,
    display_status: displayStatus,
    display_status_label:
      row.status === 'cancelled'
        ? '已取消'
        : displayStatus
          ? PACK_DISPLAY_LABEL[displayStatus]
          : null,
    transport_fee: transportFee,
    trip_number: String(row.trip_number || '').trim() || null,
    truck_outbound_date: row.truck_outbound_date ?? null,
    truck_loaded_at: row.truck_loaded_at ?? null,
    hub_received_at: row.hub_received_at ?? null,
    hub_received_by_store_code: row.hub_received_by_store_code ?? null,
    hub_received_by_store_name: row.hub_received_by_store_name ?? null,
    completed_at: row.completed_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseSettingsValue(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    try {
      return parseSettingsValue(JSON.parse(trimmed));
    } catch (_) {
      const n = Number(trimmed.replace(/[^\d.]/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
  }
  if (raw && typeof raw === 'object') {
    if ('value' in raw) return parseSettingsValue(raw.value);
    if ('amount' in raw) return parseSettingsValue(raw.amount);
  }
  return 0;
}

function emptyStoreFinance() {
  return {
    ledgerEntryCount: 0,
    codPendingTotal: 0,
    collectedTotal: 0,
    transportCostTotal: 0,
    collectedLocalTotal: 0,
    collectedAgencyTotal: 0,
    collectedAgencyByOrigin: [],
    codLocalTotal: 0,
    codAgencyTotal: 0,
    codAgencyByOrigin: [],
    reconciliation: {
      originPrepaid: 0,
      originCodTransit: 0,
      destLocalCollected: 0,
      destPendingLocal: 0,
      destPendingAgency: 0,
      destPendingTotal: 0,
      destPendingAgencyByOrigin: [],
      destAgencyCollected: 0,
      destAgencyCollectedByOrigin: [],
      transportOutbound: 0,
      transportInbound: 0,
      transportCostTotal: 0,
      agencyPayableTotal: 0,
      ownRetainTotal: 0,
      inflowTotal: 0,
      outflowTotal: 0,
      pendingInflowTotal: 0,
      transportUnpaidTotal: 0,
      transportPaidTotal: 0,
      transportInboundUnpaid: 0,
      transportInboundPaid: 0,
      netCashFlow: 0,
      netPositionHint: 0,
    },
  };
}

async function loadTransitStores(supabase) {
  const { data, error } = await supabase
    .from('delivery_stores')
    .select('id, store_name, store_code, region, address, phone, status, store_type, created_at')
    .eq('store_type', 'transit_station')
    .order('store_code', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function loadStats(supabase) {
  const [
    storeItemsTotal,
    storeItemsInStock,
    packsInTransit,
    packsHubReceived,
    packsCompleted,
    packsCancelled,
    ordersInTransit,
    ordersHubReceived,
  ] = await Promise.all([
    safeCount(supabase, 'inventory_store_items'),
    safeCount(supabase, 'inventory_store_items', [['gt', 'qty_on_hand', 0]]),
    safeCount(supabase, 'inventory_pkg_tracking', [['eq', 'status', 'in_transit']]),
    safeCount(supabase, 'inventory_pkg_tracking', [['eq', 'status', 'hub_received']]),
    safeCount(supabase, 'inventory_pkg_tracking', [['eq', 'status', 'completed']]),
    safeCount(supabase, 'inventory_pkg_tracking', [['eq', 'status', 'cancelled']]),
    safeCount(supabase, 'inventory_order_tracking', [['eq', 'status', 'in_transit']]),
    safeCount(supabase, 'inventory_order_tracking', [['eq', 'status', 'hub_received']]),
  ]);

  return {
    storeItemsTotal,
    storeItemsInStock,
    packsInTransit,
    packsHubReceived,
    packsCompleted,
    packsCancelled,
    ordersInTransit,
    ordersHubReceived,
  };
}

async function loadRecentPacks(supabase, packStatus, warnings, stationKeys = []) {
  let packsQuery = supabase
    .from('inventory_pkg_tracking')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(CONSOLE_LIST_LIMIT);

  const queryStatuses = packStatusesForQuery(packStatus);
  if (queryStatuses?.length === 1) {
    packsQuery = packsQuery.eq('status', queryStatuses[0]);
  } else if (queryStatuses?.length) {
    packsQuery = packsQuery.in('status', queryStatuses);
  }
  packsQuery = applyStationKeys(packsQuery, stationKeys, PACK_STATION_COLUMNS);

  const { data: packRows, error: packsErr } = await packsQuery;
  if (packsErr) {
    console.warn('inventory-admin-data: packs query failed', packsErr.message);
    warnings.push(`包裹追踪表暂不可用：${packsErr.message}`);
    return { packs: [], truncated: false };
  }

  const truncated = (packRows || []).length >= CONSOLE_LIST_LIMIT;
  const barcodes = (packRows || []).map((r) => r.pack_barcode);
  const qtyByBarcode = await loadPackedQtyByBarcode(supabase, barcodes);
  const packs = (packRows || [])
    .map((row) => {
      const code = String(row.pack_barcode || '').trim().toUpperCase();
      const qtyOnHand = qtyByBarcode[code];
      return normalizePackRow(row, qtyOnHand);
    })
    .filter((pack) => matchesPackTransportFilter(pack, packStatus))
    .filter((pack) => rowTouchesStation(pack, stationKeys, PACK_STATION_COLUMNS));
  return { packs, truncated };
}

function normalizeOrderRow(row) {
  return {
    id: row.id,
    pack_barcode: String(row.pack_barcode || '').trim(),
    order_barcode: String(row.order_barcode || '').trim(),
    express_barcode: String(row.express_barcode || '').trim(),
    order_name: String(row.order_name || '').trim(),
    destination_code: String(row.destination_code || '').trim().toUpperCase(),
    qty: Number(row.qty) || 1,
    status: row.status,
    recipient_name: String(row.recipient_name || '').trim(),
    recipient_phone: String(row.recipient_phone || '').trim(),
    inbound_store_name: String(row.inbound_store_name || '').trim(),
    hub_received_at: row.hub_received_at ?? null,
    hub_received_by_store_code: row.hub_received_by_store_code ?? null,
    hub_received_by_store_name: row.hub_received_by_store_name ?? null,
    customer_signed_at: row.customer_signed_at ?? null,
    arrival_notified_at: row.arrival_notified_at ?? null,
    hub_arrived_at: row.hub_arrived_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function missingArrivalNotifiedColumn(message) {
  return /arrival_notified_at/i.test(String(message || ''));
}

async function loadStoreItemPickupRows(supabase, barcodes, expresses, warnings) {
  const codes = uniqueCodes(barcodes);
  const expressCodes = uniqueCodes(expresses);
  if (!codes.length && !expressCodes.length) return [];

  const run = async (selectCols) => {
    const [byBarcode, byExpress] = await Promise.all([
      codes.length
        ? supabase
            .from('inventory_store_items')
            .select(selectCols)
            .in('barcode', codes)
            .limit(500)
        : Promise.resolve({ data: [], error: null }),
      expressCodes.length
        ? supabase
            .from('inventory_store_items')
            .select(selectCols)
            .in('input_barcode', expressCodes)
            .limit(500)
        : Promise.resolve({ data: [], error: null }),
    ]);
    return { byBarcode, byExpress };
  };

  let { byBarcode, byExpress } = await run(STORE_ITEM_PICKUP_SELECT);
  const firstError = byBarcode.error || byExpress.error;
  if (firstError && missingArrivalNotifiedColumn(firstError.message)) {
    ({ byBarcode, byExpress } = await run(STORE_ITEM_PICKUP_SELECT_FALLBACK));
  }

  if (byBarcode.error || byExpress.error) {
    const message = (byBarcode.error || byExpress.error).message;
    console.warn('inventory-admin-data: store item pickup lookup failed', message);
    warnings.push(`签收/通知字段暂不可用：${message}`);
    return [];
  }

  const byKey = new Map();
  for (const row of [...(byBarcode.data || []), ...(byExpress.data || [])]) {
    const barcode = String(row.barcode || '').trim().toUpperCase();
    const express = String(row.input_barcode || '').trim().toUpperCase();
    if (barcode) byKey.set(`b:${barcode}`, row);
    if (express) byKey.set(`e:${express}`, row);
  }
  return [...byKey.values()];
}

async function enrichOrdersWithPickup(supabase, orders, warnings) {
  if (!orders.length) return orders;
  const items = await loadStoreItemPickupRows(
    supabase,
    orders.map((order) => order.order_barcode),
    orders.map((order) => order.express_barcode),
    warnings,
  );
  return attachPickupToOrders(orders, items);
}

async function loadOrdersMatchingCodes(supabase, barcodes, expresses, warnings) {
  const codes = uniqueCodes(barcodes);
  const expressCodes = uniqueCodes(expresses);
  if (!codes.length && !expressCodes.length) return [];

  const [byOrder, byExpress] = await Promise.all([
    codes.length
      ? supabase
          .from('inventory_order_tracking')
          .select(ORDER_TRACKING_SELECT)
          .in('order_barcode', codes)
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
    expressCodes.length
      ? supabase
          .from('inventory_order_tracking')
          .select(ORDER_TRACKING_SELECT)
          .in('express_barcode', expressCodes)
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (byOrder.error || byExpress.error) {
    const message = (byOrder.error || byExpress.error).message;
    console.warn('inventory-admin-data: signed-order lookup failed', message);
    warnings.push(`订单追踪表暂不可用：${message}`);
    return [];
  }

  const byId = new Map();
  for (const row of [...(byOrder.data || []), ...(byExpress.data || [])]) {
    byId.set(row.id, normalizeOrderRow(row));
  }
  return [...byId.values()];
}

async function loadSignedRecentOrders(supabase, warnings) {
  const run = async (selectCols) =>
    supabase
      .from('inventory_store_items')
      .select(selectCols)
      .not('customer_signed_at', 'is', null)
      .order('customer_signed_at', { ascending: false })
      .limit(500);

  let { data, error } = await run(STORE_ITEM_PICKUP_SELECT);
  if (error && missingArrivalNotifiedColumn(error.message)) {
    ({ data, error } = await run(STORE_ITEM_PICKUP_SELECT_FALLBACK));
  }
  if (error) {
    console.warn('inventory-admin-data: signed items query failed', error.message);
    warnings.push(`签收记录暂不可用：${error.message}`);
    return [];
  }

  const items = data || [];
  const { barcodes, expresses } = collectItemLookupCodes(items);
  const orders = await loadOrdersMatchingCodes(supabase, barcodes, expresses, warnings);
  return filterSignedOrders(attachPickupToOrders(orders, items));
}

async function loadOrdersByPack(supabase, packBarcode, warnings) {
  const code = String(packBarcode || '').trim();
  if (!code) return [];
  const { data, error } = await supabase
    .from('inventory_order_tracking')
    .select(ORDER_TRACKING_SELECT)
    .ilike('pack_barcode', escapePostgrestIlike(code))
    .order('updated_at', { ascending: false })
    .limit(500);
  if (error) {
    console.warn('inventory-admin-data: pack orders query failed', error.message);
    warnings.push(`包装号订单暂不可用：${error.message}`);
    return [];
  }
  return enrichOrdersWithPickup(supabase, (data || []).map(normalizeOrderRow), warnings);
}

async function loadRecentOrders(supabase, orderStatus, warnings, packBarcode, stationKeys = []) {
  const pack = String(packBarcode || '').trim();
  if (pack) {
    const orders = await loadOrdersByPack(supabase, pack, warnings);
    return { orders, truncated: orders.length >= CONSOLE_LIST_LIMIT };
  }
  if (orderStatus === 'signed') {
    const orders = (await loadSignedRecentOrders(supabase, warnings)).filter((order) =>
      rowTouchesStation(order, stationKeys, ORDER_STATION_COLUMNS),
    );
    return { orders, truncated: orders.length >= CONSOLE_LIST_LIMIT };
  }

  let ordersQuery = supabase
    .from('inventory_order_tracking')
    .select(ORDER_TRACKING_SELECT)
    .order('updated_at', { ascending: false })
    .limit(CONSOLE_LIST_LIMIT);

  if (orderStatus === 'in_transit') {
    ordersQuery = ordersQuery.eq('status', 'in_transit');
  } else if (orderStatus === 'hub_received' || orderStatus === 'awaiting_pickup') {
    ordersQuery = ordersQuery.eq('status', 'hub_received');
  } else if (orderStatus === 'released_at_hub') {
    ordersQuery = ordersQuery.eq('status', 'released_at_hub');
  } else if (orderStatus === 'active') {
    ordersQuery = ordersQuery.in('status', ['in_transit', 'hub_received']);
  }
  ordersQuery = applyStationKeys(ordersQuery, stationKeys, ORDER_STATION_COLUMNS);

  const { data: orderRows, error: ordersErr } = await ordersQuery;
  if (ordersErr) {
    console.warn('inventory-admin-data: orders query failed', ordersErr.message);
    warnings.push(`订单追踪表暂不可用：${ordersErr.message}`);
    return { orders: [], truncated: false };
  }

  const truncated = (orderRows || []).length >= CONSOLE_LIST_LIMIT;
  const enriched = await enrichOrdersWithPickup(
    supabase,
    (orderRows || []).map(normalizeOrderRow),
    warnings,
  );
  const scoped = enriched.filter((order) =>
    rowTouchesStation(order, stationKeys, ORDER_STATION_COLUMNS),
  );
  return {
    orders: orderStatus === 'awaiting_pickup' ? filterAwaitingPickupOrders(scoped) : scoped,
    truncated,
  };
}

function attachFinanceToStores(storesList, financeByStoreCode) {
  return storesList.map((store) => {
    const code = String(store.store_code || '').trim().toUpperCase();
    const finance = financeByStoreCode[code] || emptyStoreFinance();
    return { ...store, finance };
  });
}

function parseFinancePagination(query) {
  const page = parseInt(query?.financePage || '1', 10);
  const pageSize = parseInt(query?.financePageSize || '10', 10);
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(100, pageSize) : 10,
  };
}

function paginateCrossBorderFinance(crossBorderFinance, page, pageSize, exportAll) {
  const allEntries = crossBorderFinance?.entries || [];
  const totalItems = crossBorderFinance?.summary?.entryCount ?? allEntries.length;
  if (exportAll) {
    return {
      summary: crossBorderFinance.summary,
      entries: allEntries,
      pagination: {
        page: 1,
        pageSize: allEntries.length || totalItems || 1,
        totalItems,
        totalPages: 1,
      },
    };
  }
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    summary: crossBorderFinance.summary,
    entries: allEntries.slice(start, start + safePageSize),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalItems,
      totalPages,
    },
  };
}

function mapExceptionPhotos(row) {
  const nested = Array.isArray(row.inventory_exception_photos)
    ? row.inventory_exception_photos
    : Array.isArray(row.photos)
      ? row.photos
      : [];
  const photos = nested
    .slice()
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .map((photo) => ({
      id: photo.id,
      public_url: photo.public_url,
      storage_path: photo.storage_path || null,
    }))
    .filter((photo) => photo.public_url);
  const { inventory_exception_photos: _ignored, ...rest } = row;
  return { ...rest, photos };
}

async function loadOpenExceptions(supabase, warnings) {
  const { data, error, count } = await supabase
    .from('inventory_exceptions')
    .select(
      'id, item_barcode, express_barcode, pack_barcode, exception_type, status, note, qty_expected, qty_actual, reported_store_code, reported_hub_code, reported_operator, created_at, inventory_exception_photos(id, public_url, storage_path, created_at)',
      { count: 'exact' },
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) {
    warnings.push('inventory_exceptions 未就绪或查询失败');
    return { openExceptionCount: 0, openExceptions: [] };
  }
  const openExceptions = (data || []).map(mapExceptionPhotos);
  return {
    openExceptionCount: count ?? openExceptions.length,
    openExceptions,
  };
}

async function handleOverview(supabase, warnings) {
  const [storesList, snapshot, exceptions] = await Promise.all([
    loadTransitStores(supabase),
    loadOverviewSnapshot(supabase),
    loadOpenExceptions(supabase, warnings),
  ]);
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'overview',
    transitStores: storesList,
    stats: snapshot.stats,
    transportFeeTotal: snapshot.transportFeeTotal,
    openExceptionCount: exceptions.openExceptionCount,
    openExceptions: exceptions.openExceptions,
    warnings,
  };
}

async function handleFinance(supabase, warnings, financePagination, financeScope) {
  const storesList = await loadTransitStores(supabase);
  const { financeByStoreCode, crossBorderFinance, warnings: financeWarnings, period } =
    await aggregateFinanceForTransitStores(supabase, storesList, financeScope);
  warnings.push(...financeWarnings);
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'finance',
    transitStores: attachFinanceToStores(storesList, financeByStoreCode),
    crossBorderFinance: paginateCrossBorderFinance(
      crossBorderFinance,
      financePagination.page,
      financePagination.pageSize,
      financeScope.exportAll,
    ),
    period,
    warnings,
  };
}

async function handlePacks(supabase, packStatus, warnings, stationKeys) {
  const { packs: recentPacks, truncated } = await loadRecentPacks(
    supabase,
    packStatus,
    warnings,
    stationKeys,
  );
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'packs',
    recentPacks,
    packStatusFilter: packStatus,
    packsTruncated: truncated,
    warnings,
  };
}

async function handleOrders(supabase, orderStatus, warnings, packBarcode, stationKeys) {
  const { orders: recentOrders, truncated } = await loadRecentOrders(
    supabase,
    orderStatus,
    warnings,
    packBarcode,
    stationKeys,
  );
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'orders',
    recentOrders,
    orderStatusFilter: orderStatus,
    packBarcode: String(packBarcode || '').trim() || undefined,
    ordersTruncated: truncated,
    warnings,
  };
}

/** 兼容旧版：一次返回全部（较慢） */
async function handleAll(supabase, packStatus, warnings, financePagination, financeScope) {
  const storesList = await loadTransitStores(supabase);
  const [
    { financeByStoreCode, crossBorderFinance, warnings: financeWarnings, period },
    snapshot,
    packsResult,
    exceptions,
  ] = await Promise.all([
    aggregateFinanceForTransitStores(supabase, storesList, financeScope),
    loadOverviewSnapshot(supabase),
    loadRecentPacks(supabase, packStatus, warnings),
    loadOpenExceptions(supabase, warnings),
  ]);
  warnings.push(...financeWarnings);
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'all',
    transitStores: attachFinanceToStores(storesList, financeByStoreCode),
    stats: snapshot.stats,
    recentPacks: packsResult.packs,
    packsTruncated: packsResult.truncated,
    transportFeeTotal: snapshot.transportFeeTotal,
    openExceptionCount: exceptions.openExceptionCount,
    openExceptions: exceptions.openExceptions,
    crossBorderFinance: paginateCrossBorderFinance(
      crossBorderFinance,
      financePagination.page,
      financePagination.pageSize,
      financeScope.exportAll,
    ),
    period,
    packStatusFilter: packStatus,
    warnings,
  };
}

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const token = getAdminTokenFromEvent(event);
  const auth = await verifyAdminToken(token, ['admin', 'manager', 'operator', 'finance'], [
    'cross_border_logistics',
  ]);
  if (!auth.valid) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: auth.error || '未授权' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '缺少 SUPABASE_SERVICE_ROLE_KEY 配置' }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const packStatus = (event.queryStringParameters?.packStatus || 'active').toLowerCase();
  const orderStatus = (
    event.queryStringParameters?.orderStatus ||
    event.queryStringParameters?.packStatus ||
    'active'
  ).toLowerCase();
  const packBarcode = String(event.queryStringParameters?.packBarcode || '').trim();
  const stationKeys = parseStationKeys(event.queryStringParameters?.stationKeys || '');
  const section = String(event.queryStringParameters?.section || 'overview').toLowerCase();
  const financePagination = parseFinancePagination(event.queryStringParameters);
  const financeScope = parseFinancePeriodQuery(event.queryStringParameters || {});
  const warnings = [];

  try {
    let body;
    if (section === 'finance') {
      body = await handleFinance(supabase, warnings, financePagination, financeScope);
    } else if (section === 'packs') {
      body = await handlePacks(supabase, packStatus, warnings, stationKeys);
    } else if (section === 'orders') {
      body = await handleOrders(supabase, orderStatus, warnings, packBarcode, stationKeys);
    } else if (section === 'all') {
      body = await handleAll(supabase, packStatus, warnings, financePagination, financeScope);
    } else {
      body = await handleOverview(supabase, warnings);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(body),
    };
  } catch (error) {
    console.error('inventory-admin-data error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '查询失败' }),
    };
  }
};
