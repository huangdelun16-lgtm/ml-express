/**
 * 商家店铺登录 / 改密 Netlify Function
 * 密码在服务端校验，响应中不返回 password / password_hash。
 * 兼容 delivery_stores.password 明文（商家 Web 仍在用）以及 bcrypt / password_hash。
 *
 * 部署在 mlexpress-merchants.com，供缅甸商家 App 登录（手机打不通 *.netlify.app / supabase.co）。
 * 逻辑与仓库根目录 netlify/functions/merchant-password.js 保持一致。
 */

const bcrypt = require('bcryptjs');

// 商家 App / Expo Web 登录无 Cookie。必须用 *，不能走 cors.js 的 credentials 模式：
// 空 Origin 或 http://127.0.0.1:端口 时 cors.js 不会返回 ACAO，Web/部分 fetch 会直接失败。
const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Cache-Control',
  'Content-Type': 'application/json',
};

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const TRANSIT_STATION = 'transit_station';

const STORE_SELECT =
  'id,store_code,store_name,email,phone,address,status,store_type,created_at,region,password,password_hash,packing_sla_minutes,avatar_url';

function isBcrypt(value) {
  const s = String(value || '');
  return s.startsWith('$2a$') || s.startsWith('$2b$') || s.startsWith('$2y$');
}

function restHeaders(extra = {}) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function stripSecrets(store) {
  if (!store || typeof store !== 'object') return store;
  const { password, password_hash, ...safe } = store;
  return safe;
}

async function fetchStoreByCode(storeCode) {
  const url =
    `${supabaseUrl}/rest/v1/delivery_stores` +
    `?store_code=eq.${encodeURIComponent(storeCode)}` +
    `&select=${STORE_SELECT}`;
  const response = await fetch(url, { headers: restHeaders() });
  const rows = await response.json();
  if (!response.ok) {
    throw new Error(rows?.message || '查询店铺失败');
  }
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function fetchStoreById(storeId) {
  const url =
    `${supabaseUrl}/rest/v1/delivery_stores` +
    `?id=eq.${encodeURIComponent(storeId)}` +
    `&select=${STORE_SELECT}`;
  const response = await fetch(url, { headers: restHeaders() });
  const rows = await response.json();
  if (!response.ok) {
    throw new Error(rows?.message || '查询店铺失败');
  }
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function passwordsMatch(input, store) {
  const hashed =
    (store.password_hash && String(store.password_hash).trim()) ||
    (isBcrypt(store.password) ? store.password : '');
  if (hashed) {
    return bcrypt.compare(String(input || ''), hashed);
  }
  return String(store.password || '').trim() === String(input || '').trim();
}

async function loginStore(storeCode, password) {
  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Supabase 配置缺失' };
  }
  const code = String(storeCode || '').trim().toUpperCase();
  if (!code || !password) {
    return { success: false, error: '缺少店铺代码或密码' };
  }

  const store = await fetchStoreByCode(code);
  if (!store) {
    return { success: false, error: '店铺代码不存在' };
  }
  if (String(store.store_type || '').trim() === TRANSIT_STATION) {
    return {
      success: false,
      error: '该账号为跨境中转站账号，请使用 Inventory App 登录，无法在商家端登录。',
    };
  }
  if (store.status && store.status !== 'active') {
    return { success: false, error: `账号状态异常 (${store.status})，请联系管理员。` };
  }

  const ok = await passwordsMatch(password, store);
  if (!ok) {
    return { success: false, error: '密码错误' };
  }

  return { success: true, store: stripSecrets(store) };
}

async function updateStorePassword(storeId, currentPassword, newPassword) {
  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Supabase 配置缺失' };
  }
  if (!storeId || !currentPassword || !newPassword) {
    return { success: false, error: '缺少必要参数' };
  }

  const store = await fetchStoreById(storeId);
  if (!store) {
    return { success: false, error: '店铺不存在' };
  }
  if (String(store.store_type || '').trim() === TRANSIT_STATION) {
    return { success: false, error: '中转站账号请在 Inventory App 修改密码' };
  }

  const ok = await passwordsMatch(currentPassword, store);
  if (!ok) {
    return { success: false, error: '原密码错误' };
  }

  // 仍写入 password 明文列，兼容尚未改服务端校验的商家 Web
  const patchResponse = await fetch(
    `${supabaseUrl}/rest/v1/delivery_stores?id=eq.${encodeURIComponent(storeId)}`,
    {
      method: 'PATCH',
      headers: restHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ password: String(newPassword).trim() }),
    },
  );

  if (!patchResponse.ok) {
    return { success: false, error: '数据库更新失败' };
  }
  return { success: true };
}

exports.handler = async (event) => {
  const headers = PUBLIC_CORS;
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '方法不允许' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'login';

    if (action === 'login') {
      const result = await loginStore(body.storeCode || body.username, body.password);
      return {
        statusCode: result.success ? 200 : 401,
        headers,
        body: JSON.stringify(result),
      };
    }

    if (action === 'updatePassword') {
      const result = await updateStorePassword(
        body.storeId,
        body.currentPassword,
        body.newPassword,
      );
      return {
        statusCode: result.success ? 200 : result.error === '原密码错误' ? 401 : 400,
        headers,
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '未知操作' }),
    };
  } catch (error) {
    console.error('merchant-password 失败:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '登录校验服务异常，请稍后重试' }),
    };
  }
};
