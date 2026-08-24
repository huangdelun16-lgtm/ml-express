/**
 * Admin 跨境物流 — 登记客户 CRUD
 * GET  — 列表
 * POST — 创建
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { buildCustomerCode } = require('./utils/crossBorderCustomerCode');

const CUSTOMER_SELECT =
  'id, customer_name, phone, delivery_region_id, delivery_area_code, address_notes, salesperson_employee_code, application_date, customer_code, status, created_at, updated_at';


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
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

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
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('cross_border_customers')
        .select(CUSTOMER_SELECT)
        .order('application_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, customers: data ?? [] }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      const customer_name = String(body.customer_name || '').trim();
      const phone = String(body.phone || '').trim();
      const delivery_region_id = String(body.delivery_region_id || '').trim();
      const delivery_area_code = String(body.delivery_area_code || '').trim().toUpperCase();
      const address_notes = String(body.address_notes || '').trim();
      const salesperson_employee_code = String(body.salesperson_employee_code || '')
        .trim()
        .toUpperCase();
      const application_date = String(body.application_date || '').trim();

      if (!customer_name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '请填写客户名称' }),
        };
      }
      if (!delivery_region_id || !delivery_area_code) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '请选择送货地址（城市）' }),
        };
      }
      if (!salesperson_employee_code) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '请选择推销员编码' }),
        };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(application_date)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '请填写有效申请日期' }),
        };
      }
      const { count, error: countError } = await supabase
        .from('cross_border_customers')
        .select('id', { count: 'exact', head: true })
        .eq('application_date', application_date)
        .eq('delivery_area_code', delivery_area_code);
      if (countError) throw countError;

      const now = new Date().toISOString();
      let dailySeq = (count ?? 0) + 1;
      let data = null;
      let lastCode = '';

      for (let attempt = 0; attempt < 30; attempt += 1) {
        const customer_code = buildCustomerCode(
          delivery_area_code,
          application_date,
          salesperson_employee_code,
          dailySeq,
        );
        lastCode = customer_code;
        if (!customer_code) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: '无法生成客户编码，请检查表单' }),
          };
        }

        const inserted = await supabase
          .from('cross_border_customers')
          .insert({
            customer_name,
            phone,
            delivery_region_id,
            delivery_area_code,
            address_notes,
            salesperson_employee_code,
            application_date,
            customer_code,
            status: 'active',
            updated_at: now,
          })
          .select(CUSTOMER_SELECT)
          .single();

        if (!inserted.error) {
          data = inserted.data;
          break;
        }
        if (inserted.error.code === '23505') {
          dailySeq += 1;
          continue;
        }
        throw inserted.error;
      }

      if (!data) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: `客户编码 ${lastCode} 已存在，请稍后重试`,
          }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, customer: data }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('inventory-admin-cross-border-customers error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '操作失败' }),
    };
  }
};
