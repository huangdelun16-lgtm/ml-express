/**
 * Admin 跨境物流 — 一键清空云端全部跨境业务数据
 * （快递明细、包装、到站签收、在途追踪、流水、跨境会计、结算、代转、异常件、出口成本、已签收发票）
 * 不删中转站账号、推销员、登记客户、计费。
 * 需 admin 角色 + 登录密码 + 确认短语
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { verifyLogin } = require('./admin-password');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { BUSINESS_WIPE_TABLES } = require('./utils/clearCrossBorderBusiness');

const CONFIRM_PHRASE = '清空全部跨境业务数据';


function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

async function wipeTable(supabase, table, idColumn = 'id') {
  const { count, error } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .not(idColumn, 'is', null);
  if (error) {
    if (/does not exist|schema cache/i.test(String(error.message || ''))) return 0;
    throw error;
  }
  return count ?? 0;
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
  const auth = await verifyAdminToken(token, ['admin'], ['cross_border_logistics']);
  if (!auth.valid) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error:
          auth.error ||
          '仅 admin 账号可执行此操作，且需具备「跨境物流」权限',
      }),
    };
  }

  const body = parseBody(event);
  const password = String(body.password || '');
  const confirmPhrase = String(body.confirmPhrase || '').trim();

  if (confirmPhrase !== CONFIRM_PHRASE) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `请准确输入确认短语：${CONFIRM_PHRASE}` }),
    };
  }

  if (!password) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '请输入当前 Admin 登录密码' }),
    };
  }

  const loginCheck = await verifyLogin(auth.user.username, password);
  if (!loginCheck.success) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: loginCheck.error || '密码验证失败' }),
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
    const deleted = {};
    for (const spec of BUSINESS_WIPE_TABLES) {
      deleted[spec.key] = await wipeTable(supabase, spec.table, spec.idColumn || 'id');
    }

    const clearedAt = new Date().toISOString();
    const { error: settingsErr } = await supabase.from('system_settings').upsert(
      {
        category: 'inventory',
        settings_key: 'inventory.platform_test_data_cleared_at',
        settings_value: clearedAt,
        description:
          'Admin 清空全部跨境业务数据；Inventory App 同步时会清除本机缓存并避免把旧数据推回云端',
        updated_by: auth.user.username,
        updated_at: clearedAt,
      },
      { onConflict: 'settings_key' },
    );
    if (settingsErr) throw settingsErr;

    console.info('inventory-admin-clear-test-data by', auth.user.username, deleted);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        deleted,
        clearedAt,
        message:
          '云端全部跨境业务数据已清空（快递明细、包装、到站/在途追踪、流水、跨境会计、结算、代转、异常件、出口成本、已签收发票）。中转站账号、推销员、登记客户和计费保留。请在各 Inventory App 打开「设置 → 立即同步」。',
      }),
    };
  } catch (error) {
    console.error('inventory-admin-clear-test-data error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '清空失败' }),
    };
  }
};

exports.CONFIRM_PHRASE = CONFIRM_PHRASE;
