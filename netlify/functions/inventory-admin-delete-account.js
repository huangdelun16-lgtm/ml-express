/**
 * Admin 跨境物流 — 删除中转站账号（delivery_stores transit_station + Supabase Auth）
 * DELETE ?storeCode=MDY001
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const {
  TRANSIT_STATION_STORE_TYPE,
  getAdminTokenFromEvent,
  deleteInventoryAuthUser,
} = require('./utils/inventoryTransitAccount');

async function loadTransitStore(supabase, storeCode) {
  const code = String(storeCode || '').trim().toUpperCase();
  if (!code) return { error: '缺少店铺代码', status: 400 };

  const { data, error } = await supabase
    .from('delivery_stores')
    .select('id, store_code, store_name, store_type')
    .eq('store_code', code)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { error: '未找到该中转站账号', status: 404 };
  if (data.store_type !== TRANSIT_STATION_STORE_TYPE) {
    return { error: '该店铺不是跨境中转站账号', status: 400 };
  }

  return { store: data };
}

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (event.httpMethod !== 'DELETE') {
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
    const storeCode = event.queryStringParameters?.storeCode;
    const loaded = await loadTransitStore(supabase, storeCode);
    if (loaded.error) {
      return {
        statusCode: loaded.status || 400,
        headers,
        body: JSON.stringify({ error: loaded.error }),
      };
    }

    const store = loaded.store;
    const authResult = await deleteInventoryAuthUser(supabase, store.store_code);

    const { error: deleteErr } = await supabase
      .from('delivery_stores')
      .delete()
      .eq('id', store.id);

    if (deleteErr) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: deleteErr.message || '删除店铺失败' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        storeCode: store.store_code,
        storeName: store.store_name,
        authDeleted: authResult.deleted,
      }),
    };
  } catch (error) {
    console.error('inventory-admin-delete-account error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '删除失败' }),
    };
  }
};
