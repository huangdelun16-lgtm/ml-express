/**
 * Admin 跨境物流 — 编辑中转站账号（delivery_stores transit_station + Auth 同步）
 * GET ?storeCode=MDY001 — 读取编辑表单
 * PUT — 保存修改（password 可选）
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const {
  TRANSIT_STATION_STORE_TYPE,
  getAdminTokenFromEvent,
  resolveHubCode,
  syncInventoryAuthUser,
} = require('./utils/inventoryTransitAccount');

const DETAIL_SELECT =
  'id, store_name, store_code, region, address, latitude, longitude, phone, email, manager_name, manager_phone, operating_hours, notes, status, service_area_radius, capacity, facilities, cod_settlement_day, store_type, created_at';

async function loadTransitStore(supabase, storeCode) {
  const code = String(storeCode || '').trim().toUpperCase();
  if (!code) return { error: '缺少店铺代码', status: 400 };

  const { data, error } = await supabase
    .from('delivery_stores')
    .select(DETAIL_SELECT)
    .eq('store_code', code)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { error: '未找到该中转站账号', status: 404 };
  if (data.store_type !== TRANSIT_STATION_STORE_TYPE) {
    return { error: '该店铺不是跨境中转站账号', status: 400 };
  }

  return { store: data };
}

async function handleGet(supabase, storeCode) {
  const result = await loadTransitStore(supabase, storeCode);
  if (result.error) {
    return { statusCode: result.status || 400, body: { error: result.error } };
  }

  const store = result.store;
  const hubCode = resolveHubCode(store.region, store.store_code);

  return {
    statusCode: 200,
    body: {
      ok: true,
      store: {
        id: store.id,
        store_name: store.store_name,
        store_code: store.store_code,
        region: store.region,
        hubCode,
        address: store.address ?? '',
        latitude: Number(store.latitude) || 0,
        longitude: Number(store.longitude) || 0,
        phone: store.phone ?? '',
        email: store.email ?? '',
        manager_name: store.manager_name ?? '',
        manager_phone: store.manager_phone ?? '',
        operating_hours: store.operating_hours ?? '08:00 - 22:00',
        notes: store.notes ?? '',
        service_area_radius: Number(store.service_area_radius) || 5,
        capacity: Number(store.capacity) || 5000,
        facilities: Array.isArray(store.facilities) ? store.facilities : ['storage'],
        cod_settlement_day: String(store.cod_settlement_day || '7'),
        status: store.status ?? 'active',
        created_at: store.created_at,
      },
    },
  };
}

async function handlePut(supabase, body, auth) {
  const store_code = String(body.store_code ?? '').trim().toUpperCase();
  if (!store_code) {
    return { statusCode: 400, body: { error: '缺少店铺代码' } };
  }

  const loaded = await loadTransitStore(supabase, store_code);
  if (loaded.error) {
    return { statusCode: loaded.status || 400, body: { error: loaded.error } };
  }

  const store_name = String(body.store_name ?? '').trim();
  const address = String(body.address ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const email = String(body.email ?? '').trim() || null;
  const manager_name = String(body.manager_name ?? '').trim();
  const manager_phone = String(body.manager_phone ?? '').trim();
  const operating_hours = String(body.operating_hours ?? '08:00 - 22:00').trim();
  const notes = String(body.notes ?? '').trim() || null;
  const password = String(body.password ?? '').trim();
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const service_area_radius = Number(body.service_area_radius ?? 5);
  const capacity = Number(body.capacity ?? 5000);
  const facilities = Array.isArray(body.facilities) ? body.facilities : ['storage'];
  const cod_settlement_day = String(body.cod_settlement_day ?? '7');
  const status = String(body.status ?? loaded.store.status ?? 'active').trim() || 'active';

  if (!store_name || !address || !phone || !manager_name || !manager_phone) {
    return { statusCode: 400, body: { error: '请填写完整的站点信息' } };
  }
  if (password && password.length < 6) {
    return { statusCode: 400, body: { error: '新密码至少 6 位' } };
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { statusCode: 400, body: { error: '经纬度无效' } };
  }

  const updateRow = {
    store_name,
    address,
    latitude,
    longitude,
    phone,
    email,
    manager_name,
    manager_phone,
    operating_hours,
    notes,
    service_area_radius,
    capacity,
    facilities,
    cod_settlement_day,
    status,
    mall_visible: false,
  };

  if (password) {
    updateRow.password = password;
  }

  const { data: store, error: updateErr } = await supabase
    .from('delivery_stores')
    .update(updateRow)
    .eq('id', loaded.store.id)
    .select('id, store_code, store_name, region, address, store_type, status, created_at')
    .single();

  if (updateErr) {
    return {
      statusCode: 500,
      body: { error: updateErr.message || '保存失败' },
    };
  }

  const authInfo = await syncInventoryAuthUser(
    supabase,
    { ...loaded.store, ...store, ...updateRow },
    { password: password || undefined },
  );

  const response = {
    ok: true,
    store,
    hubCode: authInfo.hubCode,
  };

  if (password) {
    response.login = {
      storeCode: store.store_code,
      password,
      hubCode: authInfo.hubCode,
      authEmail: authInfo.email,
    };
  }

  return { statusCode: 200, body: response };
}

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['GET', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['GET', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'PUT') {
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
    let result;
    if (event.httpMethod === 'GET') {
      const storeCode = event.queryStringParameters?.storeCode;
      result = await handleGet(supabase, storeCode);
    } else {
      const body = JSON.parse(event.body || '{}');
      result = await handlePut(supabase, body, auth);
    }

    return {
      statusCode: result.statusCode,
      headers,
      body: JSON.stringify(result.body),
    };
  } catch (error) {
    console.error('inventory-admin-update-account error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '操作失败' }),
    };
  }
};
