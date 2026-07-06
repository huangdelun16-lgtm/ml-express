/**
 * Admin 跨境物流 — 一键清空 Inventory 云端全部测试包裹/订单数据
 * 需 admin 角色 + 登录密码 + 确认短语
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { verifyLogin } = require('./admin-password');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

const CONFIRM_PHRASE = '清空测试数据';

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

async function wipeTable(supabase, table, idColumn = 'id') {
  const { count, error } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .not(idColumn, 'is', null);
  if (error) throw error;
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
    const deleted = {
      orderTracking: 0,
      transportFeePayments: 0,
      pkgTracking: 0,
      packedShipmentItems: 0,
      packedShipments: 0,
      stockMovements: 0,
      storeItems: 0,
    };

    deleted.orderTracking = await wipeTable(supabase, 'inventory_order_tracking');
    deleted.transportFeePayments = await wipeTable(
      supabase,
      'inventory_hub_transport_fee_payments',
      'pack_barcode',
    );
    deleted.pkgTracking = await wipeTable(supabase, 'inventory_pkg_tracking');
    deleted.packedShipmentItems = await wipeTable(supabase, 'inventory_packed_shipment_items');
    deleted.packedShipments = await wipeTable(supabase, 'inventory_packed_shipments');
    deleted.stockMovements = await wipeTable(supabase, 'inventory_stock_movements');
    deleted.storeItems = await wipeTable(supabase, 'inventory_store_items');

    console.info('inventory-admin-clear-test-data by', auth.user.username, deleted);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        deleted,
        clearedAt: new Date().toISOString(),
        message:
          '云端 Inventory 测试数据已清空。各中转站 App 在下次同步后将自动移除本机对应缓存（未在队列中的订单/包裹）。',
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
