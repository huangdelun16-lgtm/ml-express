/**
 * Admin 跨境物流 — Inventory「快递明细」客户汇总与明细
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const {
  fetchCustomerSummaries,
  fetchCustomerItems,
} = require('./utils/inventoryCustomerAggregate');

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

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (event.httpMethod !== 'GET') {
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

  const customerName = event.queryStringParameters?.customerName;
  const customerPhone = event.queryStringParameters?.customerPhone;
  const customerCode = event.queryStringParameters?.customerCode;

  try {
    if (customerName !== undefined || customerCode !== undefined) {
      const result = await fetchCustomerItems(
        supabase,
        customerName ?? '',
        customerPhone ?? '',
        customerCode ?? '',
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          at: new Date().toISOString(),
          ...result,
        }),
      };
    }

    const result = await fetchCustomerSummaries(supabase);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        at: new Date().toISOString(),
        summaries: result.summaries,
        warnings: result.warnings,
      }),
    };
  } catch (error) {
    console.error('inventory-admin-customers error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '查询失败' }),
    };
  }
};
