/**
 * Admin 跨境物流 — 总部关闭 Inventory 异常件
 * PATCH { id, status: 'resolved' | 'cancelled', resolveNote? }
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

const CLOSE_STATUSES = new Set(['resolved', 'cancelled']);

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ''),
  );
}

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (event.httpMethod !== 'PATCH') {
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
  const id = String(body.id || '').trim();
  const status = String(body.status || '').trim();
  const resolveNote = String(body.resolveNote || '').trim();

  if (!isUuid(id)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '缺少有效异常单 id' }),
    };
  }
  if (!CLOSE_STATUSES.has(status)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '状态只能是 resolved 或 cancelled' }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: existing, error: loadError } = await supabase
      .from('inventory_exceptions')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!existing) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '未找到该异常件' }),
      };
    }
    if (existing.status !== 'open') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: '该异常件已关单' }),
      };
    }

    const now = new Date().toISOString();
    const resolvedBy = String(auth.user?.username || auth.user?.name || 'admin').trim();
    const { data, error } = await supabase
      .from('inventory_exceptions')
      .update({
        status,
        resolved_at: now,
        resolved_by: resolvedBy,
        resolve_note: resolveNote || null,
        updated_at: now,
      })
      .eq('id', id)
      .eq('status', 'open')
      .select(
        'id, item_barcode, express_barcode, pack_barcode, exception_type, status, note, qty_expected, qty_actual, reported_store_code, reported_hub_code, reported_operator, resolved_at, resolved_by, resolve_note, created_at',
      )
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: '该异常件已关单' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, exception: data }),
    };
  } catch (error) {
    console.error('inventory-admin-exceptions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '关单失败' }),
    };
  }
};
