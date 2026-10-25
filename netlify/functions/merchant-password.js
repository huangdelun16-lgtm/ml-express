/**
 * 商家店铺登录 / 改密 Netlify Function
 * 密码在服务端校验，响应中不返回 password / password_hash。
 * 兼容 delivery_stores.password 明文（商家 Web 仍在用）以及 bcrypt / password_hash。
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
  'id,store_code,store_name,email,phone,address,status,store_type,created_at,region,packing_sla_minutes,avatar_url';

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

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/merchant_authenticate_store`, {
    method: 'POST',
    headers: restHeaders(),
    body: JSON.stringify({ p_store_code: code, p_password: String(password) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return { success: false, error: result?.message || result?.error || '登录校验失败' };
  }
  if (!result || result.success !== true) {
    return { success: false, error: (result && result.error) || '密码错误' };
  }
  return { success: true, store: result.store };
}

async function updateStorePassword(storeId, currentPassword, newPassword) {
  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Supabase 配置缺失' };
  }
  if (!storeId || !currentPassword || !newPassword) {
    return { success: false, error: '缺少必要参数' };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/merchant_change_store_password`, {
    method: 'POST',
    headers: restHeaders(),
    body: JSON.stringify({
      p_store_id: storeId,
      p_current: String(currentPassword),
      p_new: String(newPassword),
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return { success: false, error: result?.message || result?.error || '数据库更新失败' };
  }
  if (!result || result.success !== true) {
    return { success: false, error: (result && result.error) || '原密码错误' };
  }
  return { success: true };
}

function hasRegisteredPhone(store) {
  const digits = String((store && store.phone) || '').replace(/\D/g, '');
  return digits.length >= 6;
}

function hasRegisteredEmail(store) {
  const email = String((store && store.email) || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 商家网站「忘记密码」：只核对店铺是否存在。
 * 不发短信、不发邮件、不生成新密码，响应里也不带 password / phone / email。
 */
async function requestPasswordHelp(storeCode) {
  if (!supabaseUrl || !supabaseKey) {
    return { success: false, code: 'config' };
  }
  const code = String(storeCode || '').trim().toUpperCase();
  if (!code) {
    return { success: false, code: 'missing_code' };
  }

  const store = await fetchStoreByCode(code);
  if (!store) {
    return { success: false, code: 'not_found' };
  }
  if (String(store.store_type || '').trim() === TRANSIT_STATION) {
    return { success: false, code: 'transit_station' };
  }
  if (store.status && store.status !== 'active') {
    return { success: false, code: 'inactive' };
  }

  return {
    success: true,
    code: 'contact_admin',
    hasPhone: hasRegisteredPhone(store),
    hasEmail: hasRegisteredEmail(store),
  };
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

    if (action === 'requestPasswordHelp') {
      const result = await requestPasswordHelp(body.storeCode || body.username);
      const statusCode =
        result.code === 'config' ? 500 : result.code === 'missing_code' ? 400 : 200;
      return {
        statusCode,
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
