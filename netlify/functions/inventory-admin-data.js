/**
 * Admin 跨境物流 / Inventory App 控制台数据
 * 使用 Service Role 读取 inventory_* 表（绕过 Inventory JWT RLS）
 * 需已通过 admin Cookie 认证
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { aggregateFinanceForTransitStores } = require('./utils/inventoryFinanceAggregate');

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

function normalizePackRow(row) {
  const leg = String(row.leg_destination_code || '').trim().toUpperCase();
  const finalDest = String(row.destination_code || '').trim().toUpperCase();
  const feeRaw = row.transport_fee;
  let transportFee = null;
  if (typeof feeRaw === 'number' && Number.isFinite(feeRaw)) {
    transportFee = feeRaw;
  } else if (feeRaw != null && String(feeRaw).trim()) {
    transportFee = parseSettingsValue(feeRaw);
  }

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
  const warnings = [];

  try {
    const { data: transitStores, error: storesErr } = await supabase
      .from('delivery_stores')
      .select('id, store_name, store_code, region, address, phone, status, store_type, created_at')
      .eq('store_type', 'transit_station')
      .order('store_code', { ascending: true });

    if (storesErr) throw storesErr;

    const storesList = transitStores || [];
    const { financeByStoreCode, warnings: financeWarnings } = await aggregateFinanceForTransitStores(
      supabase,
      storesList,
    );
    warnings.push(...financeWarnings);

    const transitStoresWithFinance = storesList.map((store) => {
      const code = String(store.store_code || '').trim().toUpperCase();
      const finance = financeByStoreCode[code] || {
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
      return { ...store, finance };
    });

    const stats = {
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

    let recentPacks = [];
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
    } else {
      recentPacks = (packRows || []).map(normalizePackRow);
    }

    const transportFeeTotal = await sumAllTransportFees(supabase);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        at: new Date().toISOString(),
        transitStores: transitStoresWithFinance,
        stats,
        recentPacks,
        transportFeeTotal,
        packStatusFilter: packStatus,
        warnings,
      }),
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
