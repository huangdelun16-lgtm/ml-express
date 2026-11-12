/**
 * Admin web stock-in. Same records as Inventory App single / multiple inbound.
 * Writes the same inventory tables the app uses. No extra SQL function.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');
const { verifyAdminToken } = require('./verify-admin');
const { writeAdminStockIn } = require('./utils/adminWebStockIn');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

const YANGON = 'Asia/Yangon';

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function yangonParts(at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: YANGON,
    second: '2-digit',
    minute: '2-digit',
    hour: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '00';
  return {
    second: get('second'),
    minute: get('minute'),
    hour: get('hour') === '24' ? '00' : get('hour'),
    day: get('day'),
    month: get('month'),
    year: get('year'),
  };
}

function destinationCode(destination) {
  const raw = String(destination || '').trim().toUpperCase();
  const token = raw.match(/[A-Z0-9]{2,}/)?.[0] ?? raw.replace(/[^A-Z0-9]/g, '');
  if (token.length >= 3) return token.slice(0, 3);
  if (token.length > 0) return token.padEnd(3, 'X');
  return 'PKG';
}

function inboundBarcode(destination, at = new Date()) {
  const clock = yangonParts(at);
  return `${destinationCode(destination)}${clock.second}${clock.minute}${clock.hour}${clock.day}${clock.month}${clock.year}`;
}

function originPrefix(storeCode) {
  const raw = String(storeCode || '').trim().toUpperCase();
  if (!raw) return 'PKG';
  if (raw.startsWith('RUILI') || raw === 'RUI') return 'RUI';
  if (raw.startsWith('MUSE') || raw === 'MSE' || raw === 'MUS') return 'MSE';
  const letters = raw.replace(/[0-9]/g, '');
  if (letters.startsWith('RUILI')) return 'RUI';
  if (letters.startsWith('MUSE')) return 'MSE';
  if (letters.length >= 3) return letters.slice(0, 3);
  return raw.padEnd(3, 'X').slice(0, 3);
}

function inboundIso(ymd) {
  const day = String(ymd || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return new Date().toISOString();
  const clock = yangonParts(new Date());
  return `${day}T${clock.hour}:${clock.minute}:${clock.second}.000+06:30`;
}

function volumetricKgFromSpec(spec) {
  const match = String(spec || '').trim().match(/^(\S+)\s*x\s*(\S+)\s*x\s*(\S+)\s*cm$/i);
  if (!match) return 0;
  const a = Number(match[1]);
  const b = Number(match[2]);
  const c = Number(match[3]);
  if (!(a > 0) || !(b > 0) || !(c > 0)) return 0;
  const kg = Math.round(((a * b * c) / 6000) * 100) / 100;
  return kg > 0 ? kg : 0;
}

function quoteNote(body) {
  const parts = [];
  const quote = String(body.quoteCny || '').trim();
  if (quote) parts.push(`报价 ${quote} CNY`);
  parts.push(body.chargeBasis === 'volume' ? '收费体积' : '收费重量');
  if (body.pay === 'cod') parts.push('到付');
  if (body.pay === 'prepaid') parts.push('预付');
  const note = String(body.note || '').trim();
  if (note) parts.push(note);
  return parts.join(' · ');
}

async function barcodeTaken(supabase, barcode) {
  const code = String(barcode || '').trim().toUpperCase();
  const [{ data: item }, { data: pack }] = await Promise.all([
    supabase.from('inventory_store_items').select('id').eq('barcode', code).maybeSingle(),
    supabase.from('inventory_packed_shipments').select('id').eq('bundle_barcode', code).maybeSingle(),
  ]);
  return Boolean(item || pack);
}

async function uniqueInboundBarcode(supabase, destination) {
  let barcode = inboundBarcode(destination);
  for (let i = 0; i < 8; i += 1) {
    if (!(await barcodeTaken(supabase, barcode))) return barcode;
    barcode = `${inboundBarcode(destination)}${i}`;
  }
  return `${inboundBarcode(destination)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

async function nextPackageBarcode(supabase, destination, pieceCount, storeCode) {
  const year = String(new Date().getFullYear()).slice(-2);
  const body = `${originPrefix(storeCode)}${year}${destinationCode(destination)}${Math.max(1, pieceCount)}`;
  const { data, error } = await supabase
    .from('inventory_packed_shipments')
    .select('bundle_barcode')
    .ilike('bundle_barcode', `${body}%`)
    .limit(200);
  if (error) throw new Error(error.message);
  let maxSeq = 0;
  for (const row of data || []) {
    const code = String(row.bundle_barcode || '').toUpperCase();
    if (!code.startsWith(body)) continue;
    const seq = Number(code.slice(body.length));
    if (Number.isFinite(seq)) maxSeq = Math.max(maxSeq, seq);
  }
  for (let seq = maxSeq + 1; seq < maxSeq + 40; seq += 1) {
    const candidate = `${body}${String(seq).padStart(4, '0')}`;
    if (!(await barcodeTaken(supabase, candidate))) return candidate;
  }
  throw new Error('生成包装号失败');
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
  const fail = (status, error) => ({
    statusCode: status,
    headers,
    body: JSON.stringify({ error }),
  });

  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  const token = getAdminTokenFromEvent(event);
  const auth = await verifyAdminToken(token, ['admin', 'manager', 'operator', 'finance'], [
    'cross_border_logistics',
  ]);
  if (!auth.valid) return fail(401, auth.error || '未授权');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) return fail(500, '缺少 SUPABASE_SERVICE_ROLE_KEY 配置');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const body = parseBody(event);
  const operator = String(auth.user?.name || auth.user?.username || 'admin').trim();
  try {
    const data = await executeStockIn(supabase, body, operator);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    const status = error.statusCode || 400;
    return fail(status, error instanceof Error ? error.message : '入库失败');
  }
};

async function executeStockIn(supabase, body, operator) {
  const fail = (status, error) => {
    const err = new Error(error);
    err.statusCode = status;
    throw err;
  };
  const mode = body.mode === 'batch' ? 'batch' : body.mode === 'single' ? 'single' : '';
  const storeId = String(body.storeId || '').trim();
  const destination = String(body.destination || '').trim().toUpperCase();
  const recipientName = String(body.recipientName || '').trim();
  const recipientPhone = String(body.recipientPhone || '').trim();
  const pay = body.pay === 'prepaid' ? 'prepaid' : body.pay === 'cod' ? 'cod' : '';

  if (!mode) return fail(400, '请选择单个入库或多个入库');
  if (!storeId) return fail(400, '请选择发出站点');
  if (!destination) return fail(400, '请选择目的地');
  if (!recipientName) return fail(400, '请填写客户姓名');
  if (!recipientPhone) return fail(400, '请填写手机号码');
  if (!pay) return fail(400, '请选择到付或预付');
  if (body.chargeBasis === 'volume' && !(volumetricKgFromSpec(body.spec) > 0)) {
    return fail(400, '按体积重量收费时，请先填写长、宽、高');
  }

  const note = quoteNote(body);
  const inboundAt = inboundIso(body.inboundDate);
  const payload = {
    mode,
    operation_id: randomUUID(),
    store_id: storeId,
    operator,
    destination,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    customer_code: String(body.customerCode || '').trim().toUpperCase(),
    inbound_at: inboundAt,
    note,
    detail_address: String(body.detailAddress || '').trim(),
    packaging: '',
    spec: String(body.spec || '').trim(),
  };

  if (mode === 'single') {
    const qty = Math.max(1, Math.round(Number(body.qty) || 1));
    const weight = String(body.weightKg || '').trim();
    const weightN = Number(weight);
    if (!weight || !Number.isFinite(weightN) || weightN <= 0) return fail(400, '请填写重量');
    const barcode = await uniqueInboundBarcode(supabase, destination);
    const express = String(body.expressCode || '').trim();
    payload.single = {
      barcode,
      input_barcode: express,
      name: String(body.itemName || '').trim() || express || barcode,
      spec: payload.spec,
      unit: `${qty} Pcs`,
      weight: `${weight} Kg`,
      qty,
    };
  } else {
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const cleaned = lines
      .map((line) => ({
        express: String(line.expressCode || '').trim(),
        name: String(line.name || '').trim(),
        qty: Math.max(1, Math.round(Number(line.qty) || 1)),
      }))
      .filter((line) => line.express);
    if (!cleaned.length) return fail(400, '请至少填写一个快递单号');
    const weight = String(body.weightKg || '').trim();
    const weightN = Number(weight);
    if (!weight || !Number.isFinite(weightN) || weightN <= 0) return fail(400, '请填写整包重量');
    const pieceCount = cleaned.reduce((sum, line) => sum + line.qty, 0);
    const { data: store, error: storeError } = await supabase
      .from('delivery_stores')
      .select('store_code')
      .eq('id', storeId)
      .maybeSingle();
    if (storeError || !store) return fail(400, '发出站点不存在');
    const packBarcode = await nextPackageBarcode(supabase, destination, pieceCount, store.store_code);
    const base = await uniqueInboundBarcode(supabase, destination);
    payload.bundle = {
      barcode: packBarcode,
      name: `${recipientName} 的快递包`,
      spec: payload.spec,
      unit: `${pieceCount} Pcs`,
      weight: `${weight} Kg`,
      note: ['多个入库', note].filter(Boolean).join(' · '),
    };
    const lineBarcodes = cleaned.map((_, index) => `${base}(${cleaned.length}-${index + 1})`);
    for (const code of lineBarcodes) {
      if (await barcodeTaken(supabase, code)) {
        return fail(400, `入库条码已被占用：${code}`);
      }
    }
    payload.lines = cleaned.map((line, index) => ({
      barcode: lineBarcodes[index],
      input_barcode: line.express,
      name: line.name || line.express,
      qty: line.qty,
    }));
  }

  const data = await writeAdminStockIn(supabase, payload);
  return {
    mode: data.mode || mode,
    barcode: data.barcode || '',
    lineBarcodes: Array.isArray(data.line_barcodes) ? data.line_barcodes : [],
  };
}

module.exports.executeStockIn = executeStockIn;
