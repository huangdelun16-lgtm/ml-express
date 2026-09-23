/**
 * Admin 跨境物流 — 清空指定车次
 * 只删该车次的包装、包内快递、追踪、流水、车费付款和这些订单上的异常。
 * 不删其他车次，不改账号、客户、计费、手工记账和站点结算。
 * 需 admin 角色；真正删除还要登录密码，并再输入一次车次号。
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { verifyLogin } = require('./admin-password');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { chunk, parseTripNumber, planTripClear } = require('./utils/clearInventoryTrip');

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function missingTable(error) {
  return /does not exist|schema cache/i.test(String(error?.message || ''));
}

async function selectIn(supabase, table, column, values, columns) {
  const rows = [];
  for (const part of chunk(values, 80)) {
    if (!part.length) continue;
    const { data, error } = await supabase.from(table).select(columns).in(column, part);
    if (error) {
      if (missingTable(error)) return [];
      throw error;
    }
    rows.push(...(data || []));
  }
  return rows;
}

async function deleteIn(supabase, table, column, values) {
  let count = 0;
  for (const part of chunk(values, 80)) {
    if (!part.length) continue;
    const { count: removed, error } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .in(column, part);
    if (error) {
      if (missingTable(error)) return count;
      throw error;
    }
    count += removed ?? 0;
  }
  return count;
}

async function loadTripScope(supabase, tripNumber) {
  const { data: packs, error: packError } = await supabase
    .from('inventory_pkg_tracking')
    .select(
      'id, pack_barcode, pack_name, origin_store_code, destination_code, leg_destination_code, item_count, truck_loaded_at, trip_number',
    )
    .ilike('trip_number', tripNumber);
  if (packError) throw packError;

  const { data: tripShipments, error: shipmentError } = await supabase
    .from('inventory_packed_shipments')
    .select('id, bundle_barcode, bundle_name, trip_number, truck_leg_destination, owner_store_code')
    .ilike('trip_number', tripNumber);
  if (shipmentError && !missingTable(shipmentError)) throw shipmentError;

  const tracking = packs || [];
  const shipments = tripShipments || [];
  const packBarcodes = [];
  const seenPacks = new Set();
  for (const pack of tracking) {
    const code = String(pack.pack_barcode || '').trim();
    const key = code.toUpperCase();
    if (!key || seenPacks.has(key)) continue;
    seenPacks.add(key);
    packBarcodes.push(code);
  }
  for (const shipment of shipments) {
    const code = String(shipment.bundle_barcode || '').trim();
    const key = code.toUpperCase();
    if (!key || seenPacks.has(key)) continue;
    seenPacks.add(key);
    packBarcodes.push(code);
  }

  const extraShipments = await selectIn(
    supabase,
    'inventory_packed_shipments',
    'bundle_barcode',
    packBarcodes,
    'id, bundle_barcode, bundle_name, trip_number, truck_leg_destination, owner_store_code',
  );
  const shipmentById = new Map();
  for (const shipment of [...shipments, ...extraShipments]) {
    if (shipment?.id) shipmentById.set(shipment.id, shipment);
  }
  const allShipments = Array.from(shipmentById.values());
  const shipmentBarcodeById = new Map(
    allShipments.map((shipment) => [shipment.id, String(shipment.bundle_barcode || '').trim()]),
  );

  const orderRows = await selectIn(
    supabase,
    'inventory_order_tracking',
    'pack_barcode',
    packBarcodes,
    'id, pack_barcode, order_barcode, express_barcode, order_name',
  );
  const rawLines = await selectIn(
    supabase,
    'inventory_packed_shipment_items',
    'pack_id',
    Array.from(shipmentById.keys()),
    'pack_id, item_id, item_barcode',
  );
  const shipmentItems = rawLines.map((line) => ({
    ...line,
    bundle_barcode: shipmentBarcodeById.get(line.pack_id) || '',
  }));

  const lookupCodes = new Set(packBarcodes.map((code) => code.toUpperCase()));
  for (const order of orderRows) {
    const orderCode = String(order.order_barcode || '').trim().toUpperCase();
    const express = String(order.express_barcode || '').trim().toUpperCase();
    if (orderCode) lookupCodes.add(orderCode);
    if (express) lookupCodes.add(express);
  }
  for (const line of shipmentItems) {
    const code = String(line.item_barcode || '').trim().toUpperCase();
    if (code) lookupCodes.add(code);
  }

  const itemColumns = 'id, barcode, input_barcode, packed_bundle_barcode, name';
  const [byBarcode, byInput, byPack] = await Promise.all([
    selectIn(supabase, 'inventory_store_items', 'barcode', Array.from(lookupCodes), itemColumns),
    selectIn(supabase, 'inventory_store_items', 'input_barcode', Array.from(lookupCodes), itemColumns),
    selectIn(supabase, 'inventory_store_items', 'packed_bundle_barcode', packBarcodes, itemColumns),
  ]);
  const storeItemById = new Map();
  for (const item of [...byBarcode, ...byInput, ...byPack]) {
    if (item?.id) storeItemById.set(item.id, item);
  }

  return planTripClear({
    packs: tracking,
    shipments: allShipments,
    shipmentItems,
    orderRows,
    storeItems: Array.from(storeItemById.values()),
  });
}

function previewBody(tripNumber, plan) {
  return {
    ok: true,
    dryRun: true,
    tripNumber,
    packCount: plan.packSummaries.length,
    orderCount: plan.orderCount,
    packs: plan.packSummaries.slice(0, 12),
    orderSamples: plan.orderSamples.slice(0, 8),
    keptOnOtherTrip: plan.keptOnOtherTrip.length,
  };
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
        error: auth.error || '仅 admin 账号可执行此操作，且需具备「跨境物流」权限',
      }),
    };
  }

  const body = parseBody(event);
  const tripNumber = parseTripNumber(body.tripNumber);
  if (!tripNumber) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '车次号格式应为 3 位站点字母加 4 位数字，例如 MSE0007' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
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
    const plan = await loadTripScope(supabase, tripNumber);
    if (body.dryRun) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(previewBody(tripNumber, plan)),
      };
    }

    const password = String(body.password || '');
    const confirmTripNumber = parseTripNumber(body.confirmTripNumber);
    if (!password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '请输入当前 Admin 登录密码' }),
      };
    }
    if (confirmTripNumber !== tripNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `请再输入一次车次号：${tripNumber}` }),
      };
    }
    if (!plan.packBarcodes.length) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `没有找到车次 ${tripNumber}` }),
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

    const exceptionRows = [];
    const seenExceptions = new Set();
    for (const row of [
      ...(await selectIn(
        supabase,
        'inventory_exceptions',
        'pack_barcode',
        plan.packBarcodes,
        'id',
      )),
      ...(await selectIn(
        supabase,
        'inventory_exceptions',
        'item_barcode',
        plan.deleteItemBarcodes,
        'id',
      )),
    ]) {
      if (!row?.id || seenExceptions.has(row.id)) continue;
      seenExceptions.add(row.id);
      exceptionRows.push(row.id);
    }

    const deleted = {
      exceptions: await deleteIn(supabase, 'inventory_exceptions', 'id', exceptionRows),
      transportFeePayments: await deleteIn(
        supabase,
        'inventory_hub_transport_fee_payments',
        'pack_barcode',
        plan.packBarcodes,
      ),
      orderTracking: await deleteIn(supabase, 'inventory_order_tracking', 'id', plan.orderIds),
      packedShipments: await deleteIn(
        supabase,
        'inventory_packed_shipments',
        'bundle_barcode',
        plan.packBarcodes,
      ),
      storeItems: await deleteIn(supabase, 'inventory_store_items', 'id', plan.deleteItemIds),
      pkgTracking: await deleteIn(supabase, 'inventory_pkg_tracking', 'pack_barcode', plan.packBarcodes),
    };

    console.info('inventory-admin-clear-trip', auth.user.username, tripNumber, deleted);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        tripNumber,
        packCount: plan.packSummaries.length,
        orderCount: plan.orderCount,
        keptOnOtherTrip: plan.keptOnOtherTrip.length,
        deleted,
        message: `车次 ${tripNumber} 已清空：${plan.packSummaries.length} 个包装、${plan.orderCount} 笔订单。其他车次未改动。请在装过这趟车的 Inventory App 下拉刷新。`,
      }),
    };
  } catch (error) {
    console.error('inventory-admin-clear-trip error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '清空车次失败' }),
    };
  }
};
