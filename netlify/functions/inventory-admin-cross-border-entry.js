/**
 * Admin 跨境物流 — 手工登记其它收入 / 支出
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

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

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
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

  const body = parseBody(event);
  const kind = String(body.kind || '').trim().toLowerCase();
  if (kind !== 'income' && kind !== 'expense') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '类型须为 income 或 expense' }),
    };
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '金额须为大于 0 的数字' }),
    };
  }

  const entryDate = String(body.entry_date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '请填写有效日期' }),
    };
  }

  const category = String(body.category || '').trim().slice(0, 120);
  const note = String(body.note || '').trim().slice(0, 500);
  const createdBy =
    String(auth.user?.employee_name || auth.user?.username || '').trim() || 'admin';

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('cross_border_manual_entries')
    .insert({
      entry_date: entryDate,
      kind,
      amount: Math.round(amount),
      currency: 'MMK',
      category,
      note,
      created_by: createdBy,
      updated_at: now,
    })
    .select('id, entry_date, kind, amount, currency, category, note, created_by, created_at')
    .single();

  if (error) {
    console.error('inventory-admin-cross-border-entry:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '保存失败' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, entry: data }),
  };
};
