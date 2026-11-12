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
const { selectExportCostRows } = require('./utils/exportCostFinance');
const { loadHqTodoCounts, loadPendingExportCosts, loadHqQueue } = require('./utils/inventoryHqMirror');
const { fetchPeriodSignedIncome } = require('./utils/inventoryCustomerAggregate');
const { parseFinancePeriodQuery } = require('./utils/yangonFinancePeriod');
const {
  collectInvoiceYears,
  invoiceSearchOr,
  invoiceYearRange,
  invoiceYearsToScan,
  parseSignedInvoiceListQuery,
  yangonYear,
} = require('./utils/signedInvoiceList');
const { buildTripFeeGroupMap, parseTripTransportFee } = require('./utils/tripTransportFee');
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
const {
  collapseExpressList,
  expressDetailSubject,
  isPackageBarcode,
  loadExpressGroupContext,
  mapExpressGroup,
  mapExpressItem,
} = require('./utils/expressDetailsGroups');
const {
  ORDER_SEARCH_COLUMNS,
  PACK_SEARCH_COLUMNS,
  listRange,
  packListIsSimple,
  parseConsoleListQuery,
  searchOrFilter,
} = require('./utils/inventoryConsoleList');

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
  'barcode, input_barcode, name, weight, spec, customer_signed_at, arrival_notified_at, hub_arrived_at';
const STORE_ITEM_PICKUP_SELECT_FALLBACK =
  'barcode, input_barcode, name, weight, spec, customer_signed_at, hub_arrived_at';


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

async function attachPackTrips(supabase, orders) {
  const codes = uniqueCodes((orders || []).map((order) => order.pack_barcode));
  if (!codes.length) return orders || [];
  const { data, error } = await supabase
    .from('inventory_pkg_tracking')
    .select('pack_barcode, trip_number')
    .in('pack_barcode', codes);
  if (error || !data) return orders || [];
  const trips = new Map(
    data.map((row) => [
      String(row.pack_barcode || '').trim().toUpperCase(),
      String(row.trip_number || '').trim(),
    ]),
  );
  return (orders || []).map((order) => ({
    ...order,
    trip_number:
      String(order.trip_number || '').trim() ||
      trips.get(String(order.pack_barcode || '').trim().toUpperCase()) ||
      '',
  }));
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

function mapPackExportCost(row) {
  if (!row) return null;
  const currency = String(row.pay_currency || '').toUpperCase() === 'MMK' ? 'MMK' : 'CNY';
  return {
    payCurrency: currency,
    unitPriceCny: Number(row.unit_price_cny) || 0,
    totalCny: Number(row.total_cny) || 0,
    totalMmk: Number(row.total_mmk) || 0,
    weightKg: Number(row.weight_kg) || 0,
  };
}

async function loadPackGlance(supabase, packBarcode, warnings) {
  const code = String(packBarcode || '').trim();
  const empty = {
    packName: '',
    tripNumber: '',
    transportFee: null,
    exportCost: null,
  };
  if (!code) return empty;
  try {
    const { data: packs, error: packError } = await supabase
      .from('inventory_pkg_tracking')
      .select('pack_name, trip_number, transport_fee')
      .ilike('pack_barcode', escapePostgrestIlike(code))
      .limit(1);
    if (packError) throw packError;
    const pack = packs?.[0] || null;
    let fee = pack ? parseTripTransportFee(pack.transport_fee) : null;
    const trip = String(pack?.trip_number || '').trim();
    if (trip && !(Number(fee) > 0)) {
      const { data: siblings, error: siblingError } = await supabase
        .from('inventory_pkg_tracking')
        .select('transport_fee')
        .eq('trip_number', trip)
        .limit(40);
      if (siblingError) throw siblingError;
      let shared = 0;
      for (const row of siblings || []) shared = Math.max(shared, parseTripTransportFee(row.transport_fee));
      if (shared > 0) fee = shared;
    }

    const upper = code.toUpperCase();
    const { data: byKey, error: keyError } = await supabase
      .from('inventory_export_costs')
      .select('subject_kind, subject_key, display_barcode, unit_price_cny, total_cny, total_mmk, pay_currency, weight_kg')
      .eq('subject_kind', 'package')
      .eq('subject_key', upper)
      .limit(1);
    if (keyError) throw keyError;
    let cost = byKey?.[0] || null;
    if (!cost) {
      const { data: byDisplay, error: displayError } = await supabase
        .from('inventory_export_costs')
        .select('subject_kind, subject_key, display_barcode, unit_price_cny, total_cny, total_mmk, pay_currency, weight_kg')
        .eq('subject_kind', 'package')
        .ilike('display_barcode', escapePostgrestIlike(code))
        .limit(1);
      if (displayError) throw displayError;
      cost = byDisplay?.[0] || null;
    }

    return {
      packName: String(pack?.pack_name || '').trim(),
      tripNumber: trip,
      transportFee: pack ? fee : null,
      exportCost: mapPackExportCost(cost),
    };
  } catch (error) {
    console.warn('inventory-admin-data: pack glance failed', error?.message || error);
    warnings.push(`包裹车次或出口成本暂不可用：${error?.message || error}`);
    return empty;
  }
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
    const orders = await attachPackTrips(supabase, await loadOrdersByPack(supabase, pack, warnings));
    return { orders, truncated: orders.length >= CONSOLE_LIST_LIMIT };
  }
  if (orderStatus === 'signed') {
    const orders = await attachPackTrips(
      supabase,
      (await loadSignedRecentOrders(supabase, warnings)).filter((order) =>
        rowTouchesStation(order, stationKeys, ORDER_STATION_COLUMNS),
      ),
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
  const scoped = await attachPackTrips(
    supabase,
    enriched.filter((order) => rowTouchesStation(order, stationKeys, ORDER_STATION_COLUMNS)),
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

const SCAN_OFFSET_CAP = 4000;

function applyListSearch(query, q, columns) {
  const filter = searchOrFilter(q, columns);
  return filter ? query.or(filter) : query;
}

function appendUniqueRows(matched, seen, rows) {
  for (const row of rows || []) {
    const id = String(row?.id || row?.order_barcode || row?.pack_barcode || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    matched.push(row);
  }
}

function applyPackListStatus(query, packStatus) {
  if (!packStatus || packStatus === 'all') return query.neq('status', 'cancelled');
  const statuses = packStatusesForQuery(packStatus);
  if (statuses?.length === 1) return query.eq('status', statuses[0]);
  if (statuses?.length) return query.in('status', statuses);
  return query;
}

function applyOrderListStatus(query, orderStatus) {
  if (orderStatus === 'in_transit') return query.eq('status', 'in_transit');
  if (orderStatus === 'hub_received' || orderStatus === 'awaiting_pickup') {
    return query.eq('status', 'hub_received');
  }
  if (orderStatus === 'released_at_hub') return query.eq('status', 'released_at_hub');
  if (orderStatus === 'active') return query.in('status', ['in_transit', 'hub_received']);
  return query;
}

async function mapPackRows(supabase, rows) {
  const barcodes = (rows || []).map((row) => row.pack_barcode);
  const qtyByBarcode = await loadPackedQtyByBarcode(supabase, barcodes);
  return (rows || []).map((row) => {
    const code = String(row.pack_barcode || '').trim().toUpperCase();
    return normalizePackRow(row, qtyByBarcode[code]);
  });
}

function visiblePacks(packs, packStatus, stationKeys) {
  return packs
    .filter((pack) => matchesPackTransportFilter(pack, packStatus))
    .filter((pack) => rowTouchesStation(pack, stationKeys, PACK_STATION_COLUMNS));
}

async function loadPackPage(supabase, packStatus, warnings, stationKeys, list) {
  const base = (withCount) => {
    let query = supabase
      .from('inventory_pkg_tracking')
      .select('*', withCount ? { count: 'exact' } : undefined)
      .order('updated_at', { ascending: false });
    query = applyPackListStatus(query, packStatus);
    query = applyStationKeys(query, stationKeys, PACK_STATION_COLUMNS);
    return applyListSearch(query, list.q, PACK_SEARCH_COLUMNS);
  };

  if (packListIsSimple(packStatus)) {
    const { from, to } = listRange(list.page, list.pageSize);
    const { data, error, count } = await base(true).range(from, to);
    if (error) {
      warnings.push(`包裹追踪表暂不可用：${error.message}`);
      return { packs: [], total: 0, hasMore: false };
    }
    const packs = visiblePacks(await mapPackRows(supabase, data || []), packStatus, stationKeys);
    const total = count ?? packs.length;
    return { packs, total, hasMore: from + (data || []).length < total };
  }

  const want = (list.page - 1) * list.pageSize + list.pageSize + 1;
  const matched = [];
  const seen = new Set();
  let offset = 0;
  let hitCap = false;
  const batch = 80;
  while (matched.length < want) {
    if (offset >= SCAN_OFFSET_CAP) {
      hitCap = true;
      warnings.push('包裹较多，请用搜索或站点缩小范围后再翻页。');
      break;
    }
    const { data, error } = await base(false).range(offset, offset + batch - 1);
    if (error) {
      warnings.push(`包裹追踪表暂不可用：${error.message}`);
      break;
    }
    if (!data?.length) break;
    appendUniqueRows(
      matched,
      seen,
      visiblePacks(await mapPackRows(supabase, data), packStatus, stationKeys),
    );
    offset += data.length;
    if (data.length < batch) break;
  }
  const start = (list.page - 1) * list.pageSize;
  return {
    packs: matched.slice(start, start + list.pageSize),
    total: -1,
    hasMore: hitCap || matched.length > start + list.pageSize,
  };
}

async function loadOrderPage(supabase, orderStatus, warnings, stationKeys, list) {
  if (orderStatus === 'signed') {
    return scanSignedOrderPage(supabase, warnings, stationKeys, list);
  }
  if (orderStatus === 'awaiting_pickup') {
    return scanAwaitingOrderPage(supabase, warnings, stationKeys, list);
  }

  const { from, to } = listRange(list.page, list.pageSize);
  let query = supabase
    .from('inventory_order_tracking')
    .select(ORDER_TRACKING_SELECT, { count: 'exact' })
    .order('updated_at', { ascending: false });
  query = applyOrderListStatus(query, orderStatus);
  query = applyStationKeys(query, stationKeys, ORDER_STATION_COLUMNS);
  query = applyListSearch(query, list.q, ORDER_SEARCH_COLUMNS);
  const { data, error, count } = await query.range(from, to);
  if (error) {
    warnings.push(`订单追踪表暂不可用：${error.message}`);
    return { orders: [], total: 0, hasMore: false };
  }
  const enriched = await enrichOrdersWithPickup(
    supabase,
    (data || []).map(normalizeOrderRow),
    warnings,
  );
  const orders = await attachPackTrips(
    supabase,
    enriched.filter((order) => rowTouchesStation(order, stationKeys, ORDER_STATION_COLUMNS)),
  );
  const total = count ?? orders.length;
  return { orders, total, hasMore: from + (data || []).length < total };
}

async function scanAwaitingOrderPage(supabase, warnings, stationKeys, list) {
  const want = (list.page - 1) * list.pageSize + list.pageSize + 1;
  const matched = [];
  const seen = new Set();
  let offset = 0;
  let hitCap = false;
  const batch = 80;
  while (matched.length < want) {
    if (offset >= SCAN_OFFSET_CAP) {
      hitCap = true;
      warnings.push('待签收订单较多，请用搜索或站点缩小范围后再翻页。');
      break;
    }
    let query = supabase
      .from('inventory_order_tracking')
      .select(ORDER_TRACKING_SELECT)
      .eq('status', 'hub_received')
      .order('updated_at', { ascending: false });
    query = applyStationKeys(query, stationKeys, ORDER_STATION_COLUMNS);
    query = applyListSearch(query, list.q, ORDER_SEARCH_COLUMNS);
    const { data, error } = await query.range(offset, offset + batch - 1);
    if (error) {
      warnings.push(`订单追踪表暂不可用：${error.message}`);
      break;
    }
    if (!data?.length) break;
    const enriched = await enrichOrdersWithPickup(
      supabase,
      (data || []).map(normalizeOrderRow),
      warnings,
    );
    appendUniqueRows(
      matched,
      seen,
      filterAwaitingPickupOrders(enriched).filter((order) =>
        rowTouchesStation(order, stationKeys, ORDER_STATION_COLUMNS),
      ),
    );
    offset += data.length;
    if (data.length < batch) break;
  }
  const start = (list.page - 1) * list.pageSize;
  return {
    orders: matched.slice(start, start + list.pageSize),
    total: -1,
    hasMore: hitCap || matched.length > start + list.pageSize,
  };
}

async function scanOrdersThenKeepSigned(supabase, warnings, stationKeys, list) {
  const want = (list.page - 1) * list.pageSize + list.pageSize + 1;
  const matched = [];
  const seen = new Set();
  let offset = 0;
  let hitCap = false;
  const batch = 80;
  while (matched.length < want) {
    if (offset >= SCAN_OFFSET_CAP) {
      hitCap = true;
      warnings.push('匹配订单较多，请缩小搜索后再翻页。');
      break;
    }
    let query = supabase
      .from('inventory_order_tracking')
      .select(ORDER_TRACKING_SELECT)
      .order('updated_at', { ascending: false });
    query = applyStationKeys(query, stationKeys, ORDER_STATION_COLUMNS);
    query = applyListSearch(query, list.q, ORDER_SEARCH_COLUMNS);
    const { data, error } = await query.range(offset, offset + batch - 1);
    if (error) {
      warnings.push(`订单追踪表暂不可用：${error.message}`);
      break;
    }
    if (!data?.length) break;
    const enriched = await enrichOrdersWithPickup(
      supabase,
      (data || []).map(normalizeOrderRow),
      warnings,
    );
    appendUniqueRows(
      matched,
      seen,
      filterSignedOrders(enriched).filter((order) =>
        rowTouchesStation(order, stationKeys, ORDER_STATION_COLUMNS),
      ),
    );
    offset += data.length;
    if (data.length < batch) break;
  }
  const start = (list.page - 1) * list.pageSize;
  return {
    orders: matched.slice(start, start + list.pageSize),
    total: -1,
    hasMore: hitCap || matched.length > start + list.pageSize,
  };
}

async function scanSignedOrderPage(supabase, warnings, stationKeys, list) {
  if (String(list.q || '').trim()) {
    return scanOrdersThenKeepSigned(supabase, warnings, stationKeys, list);
  }
  const want = (list.page - 1) * list.pageSize + list.pageSize + 1;
  const matched = [];
  const seen = new Set();
  let offset = 0;
  let hitCap = false;
  const batch = 80;
  while (matched.length < want) {
    if (offset >= SCAN_OFFSET_CAP) {
      hitCap = true;
      warnings.push('签收记录较多，请用搜索或站点缩小范围后再翻页。');
      break;
    }
    const run = async (selectCols) =>
      supabase
        .from('inventory_store_items')
        .select(selectCols)
        .not('customer_signed_at', 'is', null)
        .order('customer_signed_at', { ascending: false })
        .range(offset, offset + batch - 1);
    let { data, error } = await run(STORE_ITEM_PICKUP_SELECT);
    if (error && missingArrivalNotifiedColumn(error.message)) {
      ({ data, error } = await run(STORE_ITEM_PICKUP_SELECT_FALLBACK));
    }
    if (error) {
      warnings.push(`签收记录暂不可用：${error.message}`);
      break;
    }
    if (!data?.length) break;
    const { barcodes, expresses } = collectItemLookupCodes(data);
    const orders = await loadOrdersMatchingCodes(supabase, barcodes, expresses, warnings);
    const signed = filterSignedOrders(attachPickupToOrders(orders, data)).filter((order) =>
      rowTouchesStation(order, stationKeys, ORDER_STATION_COLUMNS),
    );
    const q = list.q.trim().toLowerCase();
    appendUniqueRows(
      matched,
      seen,
      signed.filter((order) => {
        if (!q) return true;
        const hay = [
          order.order_barcode,
          order.express_barcode,
          order.pack_barcode,
          order.order_name,
          order.recipient_name,
          order.recipient_phone,
          order.destination_code,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      }),
    );
    offset += data.length;
    if (data.length < batch) break;
  }
  const start = (list.page - 1) * list.pageSize;
  return {
    orders: matched.slice(start, start + list.pageSize),
    total: -1,
    hasMore: hitCap || matched.length > start + list.pageSize,
  };
}

async function handleOverview(supabase, warnings) {
  const [storesList, snapshot, exceptions, hqTodos] = await Promise.all([
    loadTransitStores(supabase),
    loadOverviewSnapshot(supabase),
    loadOpenExceptions(supabase, warnings),
    loadHqTodoCounts(supabase),
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
    pendingPackCount: hqTodos.pendingPack,
    pendingTruckLoadCount: hqTodos.pendingTruckLoad,
    pendingNotifyCount: hqTodos.pendingNotify,
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

async function handlePacks(supabase, packStatus, warnings, stationKeys, list) {
  if (list) {
    const { packs: recentPacks, total, hasMore } = await loadPackPage(
      supabase,
      packStatus,
      warnings,
      stationKeys,
      list,
    );
    return {
      ok: true,
      at: new Date().toISOString(),
      section: 'packs',
      recentPacks,
      packStatusFilter: packStatus,
      packsTruncated: false,
      listTotal: total,
      listHasMore: hasMore,
      warnings,
    };
  }
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

async function handleOrders(supabase, orderStatus, warnings, packBarcode, stationKeys, list) {
  if (list && !String(packBarcode || '').trim()) {
    const { orders: recentOrders, total, hasMore } = await loadOrderPage(
      supabase,
      orderStatus,
      warnings,
      stationKeys,
      list,
    );
    return {
      ok: true,
      at: new Date().toISOString(),
      section: 'orders',
      recentOrders,
      orderStatusFilter: orderStatus,
      ordersTruncated: false,
      listTotal: total,
      listHasMore: hasMore,
      warnings,
    };
  }
  const packCode = String(packBarcode || '').trim();
  const [{ orders: recentOrders, truncated }, packGlance] = await Promise.all([
    loadRecentOrders(supabase, orderStatus, warnings, packBarcode, stationKeys),
    packCode ? loadPackGlance(supabase, packCode, warnings) : Promise.resolve(null),
  ]);
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'orders',
    recentOrders,
    orderStatusFilter: orderStatus,
    packBarcode: packCode || undefined,
    packGlance: packGlance || undefined,
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

const SIGNED_INVOICE_COLUMNS =
  'id, invoice_no, issued_on, customer_name, phone, trip_label, piece_count, total_fee_cny, total_fee_mmk, document, signed_at, store_code';

function missingInvoiceTable(error) {
  return /does not exist|schema cache/i.test(String(error?.message || ''));
}

async function countInvoiceYear(supabase, year) {
  const bounds = invoiceYearRange(year);
  const { count, error } = await supabase
    .from('inventory_signed_invoices')
    .select('id', { count: 'exact', head: true })
    .gte('issued_on', bounds.from)
    .lte('issued_on', bounds.to);
  if (error) throw error;
  return count || 0;
}

async function handleSignedInvoices(supabase, warnings, params) {
  const now = new Date();
  const query = parseSignedInvoiceListQuery(params, now);
  const currentYear = yangonYear(now);
  try {
    const yearCounts = await Promise.all(
      invoiceYearsToScan(currentYear).map(async (year) => ({
        year,
        count: await countInvoiceYear(supabase, year),
      })),
    );
    let request = supabase
      .from('inventory_signed_invoices')
      .select(SIGNED_INVOICE_COLUMNS, { count: 'exact' });
    if (!query.searching) {
      const bounds = invoiceYearRange(query.year);
      request = request.gte('issued_on', bounds.from).lte('issued_on', bounds.to);
    }
    const search = invoiceSearchOr(query.q);
    if (search) request = request.or(search);
    const range = listRange(query.page, query.pageSize);
    const { data, error, count } = await request
      .order('issued_on', { ascending: false })
      .order('invoice_no', { ascending: false })
      .range(range.from, range.to);
    if (error) throw error;
    return {
      invoices: data || [],
      total: count || 0,
      page: query.page,
      pageSize: query.pageSize,
      year: query.searching ? null : query.year,
      years: collectInvoiceYears(currentYear, yearCounts),
      searching: query.searching,
      warnings,
    };
  } catch (error) {
    if (missingInvoiceTable(error)) {
      warnings.push(error.message);
      return {
        invoices: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        year: query.year,
        years: collectInvoiceYears(currentYear, []),
        searching: query.searching,
        warnings,
      };
    }
    throw error;
  }
}

const EXPRESS_ITEM_SELECT =
  'id, barcode, input_barcode, name, spec, unit, weight, qty_on_hand, recipient_name, final_destination, owner_store_code, note, packed_at, packed_bundle_barcode, hub_arrived_at, customer_signed_at, hub_transit_released_at, hub_transit_shipped_at, created_at, updated_at';

function expressGroupIo(supabase) {
  const quiet = async (run) => {
    try {
      const { data, error } = await run();
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  };
  return {
    shipmentItemsByBarcode(codes) {
      return quiet(() => supabase.from('inventory_packed_shipment_items').select('item_barcode, pack_id').in('item_barcode', codes).limit(300));
    },
    shipmentItemsByPack(packIds) {
      return quiet(() => supabase.from('inventory_packed_shipment_items').select('item_barcode, pack_id').in('pack_id', packIds).limit(300));
    },
    shipmentsById(ids) {
      return quiet(() => supabase.from('inventory_packed_shipments').select('id, bundle_barcode').in('id', ids).limit(100));
    },
    shipmentsByBarcode(codes) {
      return quiet(() => supabase.from('inventory_packed_shipments').select('id, bundle_barcode').in('bundle_barcode', codes).limit(100));
    },
    async itemsByBarcode(codes) {
      const { data, error } = await supabase.from('inventory_store_items').select(EXPRESS_ITEM_SELECT).in('barcode', codes);
      if (error) throw error;
      return data || [];
    },
    itemsLikeBase(base) {
      return quiet(() => supabase.from('inventory_store_items').select(EXPRESS_ITEM_SELECT).like('barcode', `${base}(%`).limit(30));
    },
    packNotes(itemIds) {
      return quiet(() => supabase.from('inventory_stock_movements').select('item_id, note').in('item_id', itemIds).ilike('note', '%打包入%').limit(100));
    },
  };
}

function expressException(rows, marks) {
  if (rows.some((row) => rowExceptionStatus(row, marks) === 'open')) return 'open';
  if (rows.some((row) => rowExceptionStatus(row, marks) === 'resolved')) return 'resolved';
  return '';
}

async function exceptionStatusByCodes(supabase, rows) {
  const codes = uniqueCodes(rows.flatMap((row) => [row.barcode, row.input_barcode]));
  const marks = new Map();
  if (!codes.length) return marks;
  const [byItem, byExpress] = await Promise.all([
    supabase.from('inventory_exceptions').select('item_barcode, express_barcode, status').in('item_barcode', codes).limit(200),
    supabase.from('inventory_exceptions').select('item_barcode, express_barcode, status').in('express_barcode', codes).limit(200),
  ]);
  for (const row of [...(byItem.data || []), ...(byExpress.data || [])]) {
    const status = String(row.status || '');
    for (const code of uniqueCodes([row.item_barcode, row.express_barcode])) {
      if (marks.get(code) === 'open') continue;
      if (status === 'open' || status === 'resolved') marks.set(code, status);
    }
  }
  return marks;
}

function rowExceptionStatus(row, marks) {
  const codes = uniqueCodes([row.barcode, row.input_barcode]);
  if (codes.some((code) => marks.get(code) === 'open')) return 'open';
  if (codes.some((code) => marks.get(code) === 'resolved')) return 'resolved';
  return '';
}

async function loadExpressDetail(supabase, id) {
  const { data: item, error } = await supabase
    .from('inventory_store_items')
    .select(EXPRESS_ITEM_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!item) return null;
  const context = await loadExpressGroupContext([item], expressGroupIo(supabase));
  const subject = expressDetailSubject(item, context.relatedRows, context.packByItemBarcode);
  const lines = subject.lines.length ? subject.lines : [item];
  const grouped = lines.length > 1 || isPackageBarcode(subject.packBarcode);
  const marks = await exceptionStatusByCodes(supabase, lines);
  const exception = expressException(lines, marks);
  const base = grouped
    ? mapExpressGroup(lines, subject.packBarcode, exception, subject.shells)
    : mapExpressItem(lines[0], exception);
  const lineIds = lines.map((row) => row.id);
  const { data: movements } = await supabase
    .from('inventory_stock_movements')
    .select('item_id, recipient_name, recipient_phone, destination, detail_address, packaging, note, origin_store_name, created_at')
    .in('item_id', lineIds)
    .eq('type', 'in')
    .order('created_at', { ascending: false })
    .limit(20);
  const movement = (movements || []).find((row) => String(row.recipient_phone || '').trim()) || movements?.[0] || null;
  const barcodes = uniqueCodes(lines.map((row) => row.barcode));
  const { data: exceptions } = barcodes.length
    ? await supabase
      .from('inventory_exceptions')
      .select('id, exception_type, status, note, created_at, resolved_at')
      .in('item_barcode', barcodes)
      .order('created_at', { ascending: false })
      .limit(8)
    : { data: [] };
  return {
    ...base,
    phone: String(movement?.recipient_phone || '').trim(),
    address: String(movement?.detail_address || '').trim(),
    packaging: String(movement?.packaging || '').trim(),
    inboundNote: String(movement?.note || lines.map((row) => row.note).find(Boolean) || '').trim(),
    inboundStore: String(movement?.origin_store_name || '').trim(),
    inboundAt: movement?.created_at || base.inboundAt || '',
    customerName: base.customerName || String(movement?.recipient_name || '').trim(),
    destination: base.destination || String(movement?.destination || '').trim(),
    exceptions: (exceptions || []).map((row) => ({
      id: row.id,
      type: row.exception_type,
      status: row.status,
      note: row.note || '',
      createdAt: row.created_at || '',
      resolvedAt: row.resolved_at || '',
    })),
  };
}

async function handleExpressDetails(supabase, query) {
  const id = String(query.id || '').trim();
  if (id) {
    const detail = await loadExpressDetail(supabase, id);
    return { detail };
  }
  const list = parseConsoleListQuery(query);
  const { from } = listRange(list.page, list.pageSize);
  let request = supabase
    .from('inventory_store_items')
    .select(EXPRESS_ITEM_SELECT)
    .not('barcode', 'ilike', 'PKG%')
    .order('updated_at', { ascending: false });
  const filter = searchOrFilter(list.q, [
    'barcode',
    'input_barcode',
    'name',
    'recipient_name',
    'final_destination',
    'packed_bundle_barcode',
  ]);
  if (filter) request = request.or(filter);
  const { data, error } = await request.range(from, from + list.pageSize);
  if (error) throw error;
  const pageRows = data || [];
  const hasMore = pageRows.length > list.pageSize;
  const rows = hasMore ? pageRows.slice(0, list.pageSize) : pageRows;
  const context = await loadExpressGroupContext(rows, expressGroupIo(supabase));
  const marks = await exceptionStatusByCodes(supabase, rows.concat(context.relatedRows));
  return {
    items: collapseExpressList({
      pageRows: rows,
      relatedRows: context.relatedRows,
      packByItemBarcode: context.packByItemBarcode,
      exceptionStatus: (row) => rowExceptionStatus(row, marks),
      searching: Boolean(String(list.q || '').trim()),
    }),
    total: -1,
    hasMore,
    page: list.page,
    pageSize: list.pageSize,
  };
}

async function handleExportCosts(supabase, warnings, financeScope, queryText) {
  const { data, error } = await supabase
    .from('inventory_export_costs')
    .select(
      'id, subject_kind, display_barcode, customer_name, final_destination, leg_origin, leg_destination, weight_kg, unit_price_cny, total_cny, pay_currency, fx_mmk_per_cny, total_mmk, trip_number, store_code, created_by, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  let saved = { exportCosts: [], totalCny: 0, totalMmk: 0 };
  if (error) {
    const missing = /does not exist|schema cache/i.test(error.message || '');
    if (!missing) throw error;
    warnings.push(error.message);
  } else {
    saved = selectExportCostRows(data || [], financeScope);
  }

  let pendingExport = {
    singles: [],
    packages: [],
    singleCount: 0,
    packageCount: 0,
    truncated: false,
  };
  try {
    pendingExport = await loadPendingExportCosts(supabase, queryText);
  } catch (pendingError) {
    warnings.push(pendingError?.message || '待填出口成本加载失败');
  }

  return { ...saved, pendingExport, warnings };
}

exports.handleExpressDetails = handleExpressDetails;

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
  const list = event.queryStringParameters?.listPage
    ? parseConsoleListQuery(event.queryStringParameters)
    : null;
  const warnings = [];

  try {
    let body;
    if (section === 'invoices') {
      const listed = await handleSignedInvoices(supabase, warnings, event.queryStringParameters || {});
      body = {
        ok: true,
        at: new Date().toISOString(),
        section: 'invoices',
        ...listed,
      };
    } else if (section === 'export-costs') {
      const listed = await handleExportCosts(
        supabase,
        warnings,
        financeScope,
        event.queryStringParameters?.q || '',
      );
      body = {
        ok: true,
        at: new Date().toISOString(),
        section: 'export-costs',
        ...listed,
      };
    } else if (section === 'finance') {
      body = await handleFinance(supabase, warnings, financePagination, financeScope);
    } else if (section === 'pack-facts') {
      const barcodes = String(event.queryStringParameters?.barcodes || '')
        .split(',')
        .map((code) => code.trim().toUpperCase())
        .filter((code) => /^[A-Z0-9]+$/.test(code))
        .slice(0, 40);
      let packs = [];
      if (barcodes.length) {
        const { data, error } = await supabase
          .from('inventory_pkg_tracking')
          .select('pack_barcode, trip_number, transport_fee, item_count, total_weight, pack_name')
          .in('pack_barcode', barcodes);
        if (error) throw error;
        packs = data || [];
      }
      body = { ok: true, at: new Date().toISOString(), section: 'pack-facts', packs, warnings };
    } else if (section === 'express-details') {
      const listed = await handleExpressDetails(supabase, event.queryStringParameters || {});
      body = {
        ok: true,
        at: new Date().toISOString(),
        section: 'express-details',
        ...listed,
        warnings,
      };
    } else if (section === 'packs') {
      body = await handlePacks(supabase, packStatus, warnings, stationKeys, list);
    } else if (section === 'orders') {
      body = await handleOrders(supabase, orderStatus, warnings, packBarcode, stationKeys, list);
    } else if (section === 'all') {
      body = await handleAll(supabase, packStatus, warnings, financePagination, financeScope);
    } else if (section === 'hq-queue') {
      const queue = await loadHqQueue(supabase, event.queryStringParameters || {});
      body = { ok: true, at: new Date().toISOString(), section: 'hq-queue', ...queue, warnings };
    } else if (section === 'period-income') {
      const income = await fetchPeriodSignedIncome(supabase, financeScope);
      warnings.push(...(income.warnings || []));
      body = {
        ok: true,
        at: new Date().toISOString(),
        section: 'period-income',
        mmk: income.mmk,
        cny: income.cny,
        freightMmk: income.freightMmk,
        freightCny: income.freightCny,
        extraMmk: income.extraMmk,
        extraCny: income.extraCny,
        warnings,
      };
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
