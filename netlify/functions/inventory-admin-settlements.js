/**
 * Admin 跨境财务 — 站点日结/月结签认、年报、代记车费、代转已汇
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { fetchStoreFinanceDetail, hubCodeForRegion } = require('./utils/inventoryFinanceAggregate');
const {
  buildSettlementSnapshot,
  diffSettlementSnapshot,
  resolveFinancePeriod,
  rollupConfirmedMonths,
} = require('./utils/yangonFinancePeriod');

function isMissingRelation(error) {
  return /does not exist|schema cache/i.test(String(error?.message || ''));
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function json(headers, statusCode, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

async function loadStoreByCode(supabase, storeCode) {
  const code = String(storeCode || '').trim().toUpperCase();
  if (!code) return null;
  const { data, error } = await supabase
    .from('delivery_stores')
    .select('id, store_name, store_code, region, status')
    .eq('store_code', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listSettlements(supabase, query) {
  const status = String(query?.status || '').trim().toLowerCase();
  const storeCode = String(query?.storeCode || '').trim().toUpperCase();
  const periodType = String(query?.periodType || query?.period_type || '').trim().toLowerCase();
  const year = String(query?.year || '').trim();
  let q = supabase
    .from('inventory_station_settlements')
    .select(
      'id, created_at, updated_at, period_type, period_start, period_end, store_id, store_code, hub_code, status, snapshot, submitted_by, submitted_at, confirmed_by, confirmed_at, rejected_reason, note',
    )
    .order('submitted_at', { ascending: false })
    .limit(500);
  if (status) q = q.eq('status', status);
  if (storeCode) q = q.eq('store_code', storeCode);
  if (periodType === 'day' || periodType === 'month') q = q.eq('period_type', periodType);
  if (/^\d{4}$/.test(year)) {
    q = q.gte('period_start', `${year}-01-01`).lte('period_start', `${year}-12-31`);
  }
  const { data, error } = await q;
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return data || [];
}

async function confirmOrReject(supabase, body, actor) {
  const id = String(body.id || '').trim();
  const action = String(body.action || '').trim().toLowerCase();
  if (!id) return { statusCode: 400, error: '缺少结算单 id' };
  if (action !== 'confirm' && action !== 'reject') {
    return { statusCode: 400, error: 'action 须为 confirm 或 reject' };
  }
  const reason = String(body.reason || body.rejected_reason || '').trim();
  if (action === 'reject' && !reason) {
    return { statusCode: 400, error: '驳回须填写原因' };
  }

  const { data: row, error: loadErr } = await supabase
    .from('inventory_station_settlements')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (!row) return { statusCode: 404, error: '未找到结算单' };
  if (row.status !== 'submitted') {
    return { statusCode: 409, error: '仅待签认账单可确认或驳回' };
  }

  const now = new Date().toISOString();
  const patch =
    action === 'confirm'
      ? {
          status: 'confirmed',
          confirmed_by: actor,
          confirmed_at: now,
          rejected_reason: '',
          updated_at: now,
        }
      : {
          status: 'rejected',
          rejected_reason: reason.slice(0, 500),
          confirmed_by: '',
          confirmed_at: null,
          updated_at: now,
        };

  const { data, error } = await supabase
    .from('inventory_station_settlements')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return { statusCode: 200, settlement: data };
}

async function liveCompare(supabase, row) {
  const kind = row.period_type === 'day' ? 'day' : 'month';
  const range = resolveFinancePeriod(kind, String(row.period_start || '').slice(0, 10));
  const detail = await fetchStoreFinanceDetail(supabase, row.store_code, { range });
  if (detail.error) return { error: detail.error };
  const live = buildSettlementSnapshot(detail.crossBorderSummary, detail.entries || []);
  const snapshot = row.snapshot || {};
  return {
    snapshot,
    live,
    diff: diffSettlementSnapshot(snapshot, live),
    period: range,
  };
}

async function payTransport(supabase, body, actor) {
  const packBarcode = String(body.packBarcode || body.pack_barcode || '')
    .trim()
    .toUpperCase();
  const storeCode = String(body.storeCode || body.store_code || '')
    .trim()
    .toUpperCase();
  if (!packBarcode) return { statusCode: 400, error: '缺少 packBarcode' };
  if (!storeCode) return { statusCode: 400, error: '缺少 storeCode' };
  const fee = String(body.fee || '').trim();
  const originStoreCode = String(body.originStoreCode || body.origin_store_code || '')
    .trim()
    .toUpperCase();
  const store = await loadStoreByCode(supabase, storeCode);
  if (!store) return { statusCode: 404, error: '未找到该中转站' };
  const hub = hubCodeForRegion(store.region);
  const now = new Date().toISOString();
  const { error } = await supabase.from('inventory_hub_transport_fee_payments').upsert(
    {
      pack_barcode: packBarcode,
      fee,
      leg_destination_code: String(body.legDestination || body.leg_destination_code || hub || '')
        .trim()
        .toUpperCase(),
      origin_store_code: originStoreCode,
      operator: actor,
      store_code: storeCode,
      paid_at: now,
      updated_at: now,
    },
    { onConflict: 'pack_barcode' },
  );
  if (error) throw error;
  return { statusCode: 200, ok: true, packBarcode };
}

async function agencyRemit(supabase, body, actor) {
  const fromStoreCode = String(body.fromStoreCode || body.from_store_code || '')
    .trim()
    .toUpperCase();
  const toOriginKey = String(body.toOriginKey || body.to_origin_key || '')
    .trim()
    .toUpperCase();
  const amount = Math.round(Number(body.amount) || 0);
  if (!fromStoreCode) return { statusCode: 400, error: '缺少付款站点' };
  if (!toOriginKey) return { statusCode: 400, error: '缺少发站' };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { statusCode: 400, error: '金额须大于 0' };
  }
  const store = await loadStoreByCode(supabase, fromStoreCode);
  if (!store) return { statusCode: 404, error: '未找到付款站点' };
  const remittedAt = String(body.remittedAt || body.remitted_at || '').trim();
  const { data, error } = await supabase
    .from('inventory_agency_remittances')
    .insert({
      from_store_id: store.id,
      from_store_code: store.store_code,
      from_hub_code: hubCodeForRegion(store.region),
      to_origin_key: toOriginKey,
      to_store_code: String(body.toStoreCode || body.to_store_code || '').trim().toUpperCase(),
      amount,
      remitted_at: /^\d{4}-\d{2}-\d{2}$/.test(remittedAt) ? remittedAt : undefined,
      note: String(body.note || '').trim().slice(0, 500),
      created_by: actor,
    })
    .select()
    .single();
  if (error) throw error;
  return { statusCode: 200, remittance: data };
}

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return json(headers, 405, { error: 'Method not allowed' });
  }

  const token = getAdminTokenFromEvent(event);
  const auth = await verifyAdminToken(token, ['admin', 'manager', 'operator', 'finance'], [
    'cross_border_logistics',
  ]);
  if (!auth.valid) {
    return json(headers, 401, { error: auth.error || '未授权' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) {
    return json(headers, 500, { error: '缺少 SUPABASE_SERVICE_ROLE_KEY 配置' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const actor =
    String(auth.user?.employee_name || auth.user?.username || '').trim() || 'admin';

  try {
    if (event.httpMethod === 'GET') {
      const query = event.queryStringParameters || {};
      const view = String(query.view || '').trim().toLowerCase();
      if (view === 'annual') {
        const year = Number(query.year) || new Date().getUTCFullYear();
        const storeCode = String(query.storeCode || '').trim().toUpperCase();
        const rows = await listSettlements(supabase, {
          year: String(year),
          periodType: 'month',
          storeCode,
        });
        const rollup = rollupConfirmedMonths(rows, year, storeCode);
        return json(headers, 200, { ok: true, view: 'annual', ...rollup, settlements: rows });
      }
      if (view === 'compare') {
        const id = String(query.id || '').trim();
        if (!id) return json(headers, 400, { error: '缺少 id' });
        const { data: row, error } = await supabase
          .from('inventory_station_settlements')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!row) return json(headers, 404, { error: '未找到结算单' });
        const compared = await liveCompare(supabase, row);
        if (compared.error) return json(headers, 400, { error: compared.error });
        return json(headers, 200, { ok: true, settlement: row, ...compared });
      }
      const settlements = await listSettlements(supabase, query);
      return json(headers, 200, { ok: true, settlements });
    }

    const body = parseBody(event);
    const action = String(body.action || '').trim().toLowerCase();
    if (action === 'confirm' || action === 'reject') {
      const result = await confirmOrReject(supabase, body, actor);
      if (result.error) return json(headers, result.statusCode, { error: result.error });
      return json(headers, 200, { ok: true, settlement: result.settlement });
    }
    if (action === 'pay_transport') {
      const result = await payTransport(supabase, body, actor);
      if (result.error) return json(headers, result.statusCode, { error: result.error });
      return json(headers, 200, { ok: true, packBarcode: result.packBarcode });
    }
    if (action === 'agency_remit') {
      const result = await agencyRemit(supabase, body, actor);
      if (result.error) return json(headers, result.statusCode, { error: result.error });
      return json(headers, 200, { ok: true, remittance: result.remittance });
    }
    return json(headers, 400, { error: '未知 action' });
  } catch (error) {
    console.error('inventory-admin-settlements error:', error);
    return json(headers, 500, { error: error.message || '操作失败' });
  }
};
