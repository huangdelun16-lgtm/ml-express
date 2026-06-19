/**
 * Admin 跨境物流 / Inventory App 控制台数据
 * 使用 Service Role 读取 inventory_* 表（绕过 Inventory JWT RLS）
 * 需已通过 admin Cookie 认证
 *
 * section 参数拆分加载（减轻首屏）：
 * - overview：账号列表 + 统计 + 车费合计
 * - finance：中转站财务 + 跨境财务（单次 loadFinanceDataset）
 * - packs：运输明细（packStatus）
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { aggregateFinanceForTransitStores } = require('./utils/inventoryFinanceAggregate');
const {
  PACK_DISPLAY_LABEL,
  resolvePackDisplayStatusFromTracking,
} = require('./utils/packDisplayStatus');

function getAdminTokenFromEvent(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const tokenCookiePair = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('admin_auth_token='));
  if (!tokenCookiePair) return null;
  let token = tokenCookiePair.slice('admin_auth_token='.length).trim();
  try {
    token = decodeURIComponent(token);
  } catch (_) {
    /* 未编码的旧 Cookie */
  }
  return token || null;
}

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
  const { data, error } = await supabase
    .from('inventory_pkg_tracking')
    .select('transport_fee')
    .neq('status', 'cancelled')
    .limit(3000);

  if (error) {
    console.warn('inventory-admin-data: transport fee sum failed', error.message);
    return 0;
  }

  let total = 0;
  for (const row of data || []) {
    total += parseTransportFeeAmount(row.transport_fee);
  }
  return Math.round(total);
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
  return {
    storeItemsTotal: await safeCount(supabase, 'inventory_store_items'),
    storeItemsInStock: await safeCount(supabase, 'inventory_store_items', [['gt', 'qty_on_hand', 0]]),
    packsInTransit: await safeCount(supabase, 'inventory_pkg_tracking', [['eq', 'status', 'in_transit']]),
    packsHubReceived: await safeCount(supabase, 'inventory_pkg_tracking', [
      ['eq', 'status', 'hub_received'],
    ]),
    packsCompleted: await safeCount(supabase, 'inventory_pkg_tracking', [['eq', 'status', 'completed']]),
    packsCancelled: await safeCount(supabase, 'inventory_pkg_tracking', [['eq', 'status', 'cancelled']]),
    ordersInTransit: await safeCount(supabase, 'inventory_order_tracking', [
      ['eq', 'status', 'in_transit'],
    ]),
    ordersHubReceived: await safeCount(supabase, 'inventory_order_tracking', [
      ['eq', 'status', 'hub_received'],
    ]),
  };
}

async function loadRecentPacks(supabase, packStatus, warnings) {
  let packsQuery = supabase
    .from('inventory_pkg_tracking')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(500);

  if (packStatus === 'in_transit') {
    packsQuery = packsQuery.eq('status', 'in_transit');
  } else if (packStatus === 'hub_received') {
    packsQuery = packsQuery.eq('status', 'hub_received');
  } else if (packStatus === 'completed') {
    packsQuery = packsQuery.eq('status', 'completed');
  } else if (packStatus === 'active') {
    packsQuery = packsQuery.in('status', ['in_transit', 'hub_received', 'split_at_hub']);
  }

  const { data: packRows, error: packsErr } = await packsQuery;
  if (packsErr) {
    console.warn('inventory-admin-data: packs query failed', packsErr.message);
    warnings.push(`包裹追踪表暂不可用：${packsErr.message}`);
    return [];
  }

  const barcodes = (packRows || []).map((r) => r.pack_barcode);
  const qtyByBarcode = await loadPackedQtyByBarcode(supabase, barcodes);
  return (packRows || []).map((row) => {
    const code = String(row.pack_barcode || '').trim().toUpperCase();
    const qtyOnHand = qtyByBarcode[code];
    return normalizePackRow(row, qtyOnHand);
  });
}

function attachFinanceToStores(storesList, financeByStoreCode) {
  return storesList.map((store) => {
    const code = String(store.store_code || '').trim().toUpperCase();
    const finance = financeByStoreCode[code] || emptyStoreFinance();
    return { ...store, finance };
  });
}

async function handleOverview(supabase, warnings) {
  const storesList = await loadTransitStores(supabase);
  const stats = await loadStats(supabase);
  const transportFeeTotal = await sumAllTransportFees(supabase);
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'overview',
    transitStores: storesList,
    stats,
    transportFeeTotal,
    warnings,
  };
}

async function handleFinance(supabase, warnings) {
  const storesList = await loadTransitStores(supabase);
  const { financeByStoreCode, crossBorderFinance, warnings: financeWarnings } =
    await aggregateFinanceForTransitStores(supabase, storesList);
  warnings.push(...financeWarnings);
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'finance',
    transitStores: attachFinanceToStores(storesList, financeByStoreCode),
    crossBorderFinance,
    warnings,
  };
}

async function handlePacks(supabase, packStatus, warnings) {
  const recentPacks = await loadRecentPacks(supabase, packStatus, warnings);
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'packs',
    recentPacks,
    packStatusFilter: packStatus,
    warnings,
  };
}

/** 兼容旧版：一次返回全部（较慢） */
async function handleAll(supabase, packStatus, warnings) {
  const storesList = await loadTransitStores(supabase);
  const { financeByStoreCode, crossBorderFinance, warnings: financeWarnings } =
    await aggregateFinanceForTransitStores(supabase, storesList);
  warnings.push(...financeWarnings);
  const stats = await loadStats(supabase);
  const recentPacks = await loadRecentPacks(supabase, packStatus, warnings);
  const transportFeeTotal = await sumAllTransportFees(supabase);
  return {
    ok: true,
    at: new Date().toISOString(),
    section: 'all',
    transitStores: attachFinanceToStores(storesList, financeByStoreCode),
    stats,
    recentPacks,
    transportFeeTotal,
    crossBorderFinance,
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
  const section = String(event.queryStringParameters?.section || 'overview').toLowerCase();
  const warnings = [];

  try {
    let body;
    if (section === 'finance') {
      body = await handleFinance(supabase, warnings);
    } else if (section === 'packs') {
      body = await handlePacks(supabase, packStatus, warnings);
    } else if (section === 'all') {
      body = await handleAll(supabase, packStatus, warnings);
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
