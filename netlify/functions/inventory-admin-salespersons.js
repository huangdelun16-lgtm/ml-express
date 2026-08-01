/**
 * Admin 跨境物流 — 推销员档案 CRUD
 * GET    — 列表或单条 ?id=
 * POST   — 创建
 * PUT    — 更新
 * DELETE — ?id=
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

const SALESPERSON_SELECT =
  'id, name, region_id, work_area_code, employee_code, phone, address, join_date, status, created_at, updated_at';

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

function normalizeStatus(value) {
  const status = String(value || 'active').trim().toLowerCase();
  return status === 'inactive' ? 'inactive' : 'active';
}

async function verifyAuth(event) {
  const token = getAdminTokenFromEvent(event);
  const auth = await verifyAdminToken(token, ['admin', 'manager', 'operator', 'finance'], [
    'cross_border_logistics',
  ]);
  if (!auth.valid) {
    return { error: auth.error || '未授权', status: 401 };
  }
  return { auth };
}

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) {
    return { error: '缺少 SUPABASE_SERVICE_ROLE_KEY 配置', status: 500 };
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { supabase };
}

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const authResult = await verifyAuth(event);
  if (authResult.error) {
    return {
      statusCode: authResult.status || 401,
      headers,
      body: JSON.stringify({ error: authResult.error }),
    };
  }

  const dbResult = getSupabase();
  if (dbResult.error) {
    return {
      statusCode: dbResult.status || 500,
      headers,
      body: JSON.stringify({ error: dbResult.error }),
    };
  }
  const { supabase } = dbResult;

  try {
    if (event.httpMethod === 'GET') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (id) {
        const { data, error } = await supabase
          .from('cross_border_salespersons')
          .select(SALESPERSON_SELECT)
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: '未找到该推销员' }),
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, salesperson: data }),
        };
      }

      const { data, error } = await supabase
        .from('cross_border_salespersons')
        .select(SALESPERSON_SELECT)
        .order('work_area_code', { ascending: true })
        .order('employee_code', { ascending: true });
      if (error) throw error;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, salespersons: data ?? [] }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      const name = String(body.name || '').trim();
      const region_id = String(body.region_id || '').trim();
      const work_area_code = String(body.work_area_code || '').trim().toUpperCase();
      const employee_code = String(body.employee_code || '').trim().toUpperCase();
      const phone = String(body.phone || '').trim();
      const address = String(body.address || '').trim();
      const join_date = String(body.join_date || '').trim();
      const status = normalizeStatus(body.status);

      if (!name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '请填写推销员名称' }),
        };
      }
      if (!region_id || !work_area_code) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '请选择工作区域' }),
        };
      }
      if (!/^[A-Z]+-\d{3,}$/.test(employee_code)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '员工编码格式无效' }),
        };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(join_date)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '请填写有效入职日期' }),
        };
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('cross_border_salespersons')
        .insert({
          name,
          region_id,
          work_area_code,
          employee_code,
          phone,
          address,
          join_date,
          status,
          updated_at: now,
        })
        .select(SALESPERSON_SELECT)
        .single();

      if (error) {
        if (error.code === '23505') {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ error: '员工编码已存在，请刷新后重试' }),
          };
        }
        throw error;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, salesperson: data }),
      };
    }

    if (event.httpMethod === 'PUT') {
      const body = parseBody(event);
      const id = String(body.id || '').trim();
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少推销员 ID' }),
        };
      }

      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      const address = String(body.address || '').trim();
      const join_date = String(body.join_date || '').trim();
      const status = normalizeStatus(body.status);

      if (!name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '请填写推销员名称' }),
        };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(join_date)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '请填写有效入职日期' }),
        };
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('cross_border_salespersons')
        .update({
          name,
          phone,
          address,
          join_date,
          status,
          updated_at: now,
        })
        .eq('id', id)
        .select(SALESPERSON_SELECT)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '未找到该推销员' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, salesperson: data }),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少推销员 ID' }),
        };
      }

      const { data: existing, error: loadErr } = await supabase
        .from('cross_border_salespersons')
        .select('id, name, employee_code')
        .eq('id', id)
        .maybeSingle();
      if (loadErr) throw loadErr;
      if (!existing) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '未找到该推销员' }),
        };
      }

      const { error: deleteErr } = await supabase
        .from('cross_border_salespersons')
        .delete()
        .eq('id', id);
      if (deleteErr) throw deleteErr;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          id: existing.id,
          name: existing.name,
          employee_code: existing.employee_code,
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('inventory-admin-salespersons error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '操作失败' }),
    };
  }
};
