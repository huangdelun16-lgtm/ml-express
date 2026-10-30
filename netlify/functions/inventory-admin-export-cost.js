/**
 * 总部在跨境物流页填写出口成本。校验与库存 App 相同，用服务角色写入。
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { settleAdminExportCost } = require('./utils/inventoryHqMirror');

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = getAdminTokenFromEvent(event);
  const auth = await verifyAdminToken(token, ['admin', 'manager', 'operator', 'finance'], [
    'cross_border_logistics',
  ]);
  if (!auth.valid) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error || '未授权' }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: '缺少 SUPABASE_SERVICE_ROLE_KEY 配置' }) };
  }

  let row;
  try {
    const body = parseBody(event);
    row = settleAdminExportCost({
      ...body,
      createdBy: auth.user?.employee_name || auth.user?.username || 'admin',
    });
  } catch (error) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: error.message || '填写不完整' }) };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: existing, error: findErr } = await supabase
    .from('inventory_export_costs')
    .select('id')
    .eq('subject_kind', row.subject_kind)
    .eq('subject_key', row.subject_key)
    .maybeSingle();
  if (findErr) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: findErr.message }) };
  }
  if (existing) {
    return { statusCode: 409, headers, body: JSON.stringify({ error: '这单已经填过出口成本' }) };
  }

  const { data, error } = await supabase.from('inventory_export_costs').insert(row).select('id').single();
  if (error) {
    const message = /duplicate|unique/i.test(error.message || '') ? '这单已经填过出口成本' : error.message;
    return { statusCode: 400, headers, body: JSON.stringify({ error: message }) };
  }
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: data?.id }) };
};
