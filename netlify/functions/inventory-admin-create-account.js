/**
 * 创建 Inventory App 跨境账号（delivery_stores transit_station + Auth JWT 预置）
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const {
  TRANSIT_STATION_STORE_TYPE,
  getAdminTokenFromEvent,
  syncInventoryAuthUser,
} = require('./utils/inventoryTransitAccount');

const CROSS_BORDER_PREFIXES = ['MUSE', 'RUILI', 'MDY', 'POL', 'YGN', 'NPW', 'TGI', 'LSO'];

function extractStoreCodePrefix(storeCode) {
  const code = String(storeCode ?? '').trim().toUpperCase();
  const sorted = [...CROSS_BORDER_PREFIXES].sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (code.startsWith(prefix)) return prefix;
  }
  const letters = code.replace(/[0-9]/g, '');
  return letters || code.slice(0, 3);
}

async function resolveUniqueStoreCode(supabase, requestedCode) {
  const normalized = String(requestedCode ?? '').trim().toUpperCase();
  if (!normalized) return normalized;

  const { data: exactDup, error: exactErr } = await supabase
    .from('delivery_stores')
    .select('id')
    .eq('store_code', normalized)
    .maybeSingle();
  if (exactErr) throw exactErr;
  if (!exactDup) return normalized;

  const prefix = extractStoreCodePrefix(normalized);
  const { data: samePrefixRows, error: prefixErr } = await supabase
    .from('delivery_stores')
    .select('store_code')
    .ilike('store_code', `${prefix}%`);
  if (prefixErr) throw prefixErr;

  const suffixRe = new RegExp(`^${prefix}(\\d+)$`, 'i');
  let maxSuffix = 0;
  for (const row of samePrefixRows || []) {
    const code = String(row.store_code ?? '').trim().toUpperCase();
    const match = code.match(suffixRe);
    if (match) {
      maxSuffix = Math.max(maxSuffix, Number.parseInt(match[1], 10));
    }
  }

  return `${prefix}${String(maxSuffix + 1).padStart(3, '0')}`;
}

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (event.httpMethod !== 'POST') {
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

  try {
    const body = JSON.parse(event.body || '{}');
    const store_name = String(body.store_name ?? '').trim();
    let store_code = String(body.store_code ?? '').trim().toUpperCase();
    const region = String(body.region ?? '').trim();
    const address = String(body.address ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const email = String(body.email ?? '').trim() || null;
    const manager_name = String(body.manager_name ?? '').trim();
    const manager_phone = String(body.manager_phone ?? '').trim();
    const operating_hours = String(body.operating_hours ?? '08:00 - 22:00').trim();
    const password = String(body.password ?? '').trim();
    const notes = String(body.notes ?? '').trim() || null;
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const service_area_radius = Number(body.service_area_radius ?? 5);
    const capacity = Number(body.capacity ?? 5000);
    const facilities = Array.isArray(body.facilities) ? body.facilities : ['storage'];
    const cod_settlement_day = String(body.cod_settlement_day ?? '7');

    if (!store_name || !store_code || !region || !address || !phone || !manager_name || !manager_phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '请填写完整的站点信息' }),
      };
    }
    if (!password || password.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '登录密码至少 6 位' }),
      };
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '经纬度无效' }),
      };
    }

    store_code = await resolveUniqueStoreCode(supabase, store_code);
    if (!store_code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '店铺代码无效' }),
      };
    }

    const insertRow = {
      store_name,
      store_code,
      address,
      latitude,
      longitude,
      phone,
      email,
      manager_name,
      manager_phone,
      store_type: TRANSIT_STATION_STORE_TYPE,
      operating_hours,
      service_area_radius,
      capacity,
      facilities,
      notes,
      password,
      region,
      cod_settlement_day,
      current_load: 0,
      status: 'active',
      created_by: auth.user?.username || 'admin',
      mall_visible: false,
    };

    const { data: store, error: insertErr } = await supabase
      .from('delivery_stores')
      .insert([insertRow])
      .select('id, store_code, store_name, region, address, store_type, status')
      .single();

    if (insertErr) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: insertErr.message || '创建失败' }),
      };
    }

    const authInfo = await syncInventoryAuthUser(supabase, store, { password });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        store,
        login: {
          storeCode: store.store_code,
          password,
          hubCode: authInfo.hubCode,
          authEmail: authInfo.email,
        },
      }),
    };
  } catch (error) {
    console.error('inventory-admin-create-account error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '创建失败' }),
    };
  }
};
