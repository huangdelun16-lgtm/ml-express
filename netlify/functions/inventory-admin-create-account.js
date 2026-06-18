/**
 * 创建 Inventory App 跨境账号（delivery_stores transit_station + Auth JWT 预置）
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

const TRANSIT_STATION_STORE_TYPE = 'transit_station';
const PACK_HUB_CODES = ['MSE', 'LSO', 'POL', 'MDY', 'YGN', 'TGI'];

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

function inventoryAuthEmail(storeCode) {
  return `inventory+${storeCode.trim().toLowerCase()}@inventory.mlexpress.internal`;
}

function resolveHubCode(region, storeCode) {
  const reg = (region ?? '').trim().toUpperCase();
  if (reg && PACK_HUB_CODES.includes(reg)) return reg;

  const letters = String(storeCode).replace(/[0-9]/g, '').toUpperCase();
  if (letters.startsWith('MUSE') || letters === 'MSE' || letters === 'MUS') return 'MSE';

  const prefix = letters.slice(0, 3);
  if (PACK_HUB_CODES.includes(prefix)) return prefix;
  if (reg && PACK_HUB_CODES.includes(reg.slice(0, 3))) return reg.slice(0, 3);
  if (reg) return reg.slice(0, 3);
  return prefix;
}

async function findUserByEmail(supabaseAdmin, email) {
  let page = 1;
  const perPage = 1000;
  const target = email.toLowerCase();
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data?.users?.find((user) => (user.email ?? '').toLowerCase() === target);
    if (match) return { id: match.id };
    if (!data?.users || data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function provisionInventoryAuth(supabaseAdmin, store, password) {
  const hubCode = resolveHubCode(store.region, store.store_code);
  const email = inventoryAuthEmail(store.store_code);
  const appMetadata = {
    inventory_store_id: store.id,
    inventory_store_code: String(store.store_code).trim().toUpperCase(),
    inventory_hub_code: hubCode,
    inventory_store_type: TRANSIT_STATION_STORE_TYPE,
    inventory_store_name: store.store_name,
    inventory_region: (store.region ?? '').trim(),
    inventory_address: (store.address ?? '').trim(),
  };

  const existing = await findUserByEmail(supabaseAdmin, email);
  if (existing) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: appMetadata,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: appMetadata,
    });
    if (error) throw new Error(error.message);
  }

  return { email, hubCode };
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
  const auth = await verifyAdminToken(token, ['admin', 'manager'], ['cross_border_logistics']);
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
    const store_code = String(body.store_code ?? '').trim().toUpperCase();
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

    const { data: dup, error: dupErr } = await supabase
      .from('delivery_stores')
      .select('id')
      .eq('store_code', store_code)
      .maybeSingle();
    if (dupErr) throw dupErr;
    if (dup) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: '店铺代码已存在，请更换区域或修改代码' }),
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

    const authInfo = await provisionInventoryAuth(supabase, store, password);

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
