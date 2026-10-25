/**
 * Admin：重置合伙店铺登录密码。
 * POST { storeId, password? }  password 留空则自动生成。
 * 写入 delivery_store_secrets，并清掉店铺行上的明文密码。
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { generateMerchantPassword } = require('./utils/merchantApplication');
const { hashCityStorePassword } = require('./utils/cityStorePassword');

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: '只接受 POST' }) };
  }

  const token = getAdminTokenFromEvent(event);
  const auth = await verifyAdminToken(token, ['admin', 'manager'], ['merchant_stores']);
  if (!auth.valid) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: auth.error || '未授权' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '缺少 SUPABASE_SERVICE_ROLE_KEY 配置' }),
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '请求格式错误' }) };
  }

  const storeId = String(body.storeId || '').trim();
  const typed = String(body.password || '').trim();
  if (!storeId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少店铺' }) };
  }
  if (typed && typed.length < 6) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '密码至少 6 位' }) };
  }

  const password = typed || generateMerchantPassword();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: store, error: storeErr } = await supabase
      .from('delivery_stores')
      .select('id, store_name, store_code, store_type')
      .eq('id', storeId)
      .maybeSingle();
    if (storeErr) throw storeErr;
    if (!store) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: '店铺不存在' }) };
    }
    if (store.store_type === 'transit_station') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '中转站密码请在跨境物流里改' }),
      };
    }

    const password_hash = hashCityStorePassword(password);
    const { error: secretErr } = await supabase.from('delivery_store_secrets').upsert(
      {
        store_id: store.id,
        password_hash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id' },
    );
    if (secretErr) throw secretErr;

    const { error: clearErr } = await supabase
      .from('delivery_stores')
      .update({ password: null, password_hash: null })
      .eq('id', store.id);
    if (clearErr) throw clearErr;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        storeCode: store.store_code,
        storeName: store.store_name,
        password,
      }),
    };
  } catch (error) {
    console.error('reset partner store password failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error instanceof Error ? error.message : '重置密码失败' }),
    };
  }
};
