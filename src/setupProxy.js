/**
 * CRA `npm start` 不提供 Netlify Functions / Edge。
 * 把 /.netlify/functions 和 /__sb 转到线上 Admin：
 * - 本地才能登录 / verify-admin
 * - 缅甸浏览器不直连 *.supabase.co（会 ERR_CONNECTION_TIMED_OUT）
 * `npx netlify dev` 会在外层拦截同一路径，不会走到这里。
 *
 * 线上有两个新加坡地址。从这边经常只有一个能连上，系统默认会选到超时的那个，
 * 登录就被重置。这里先探测 443，只用能连上的地址。
 */
const dns = require('dns');
const https = require('https');
const net = require('net');
const path = require('path');
const { execSync } = require('child_process');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { parseFinancePeriodQuery } = require('../netlify/functions/utils/yangonFinancePeriod');
const { selectExportCostRows } = require('../netlify/functions/utils/exportCostFinance');
const { assemblePendingExportCosts } = require('../netlify/functions/utils/inventoryHqMirror');
const {
  collapseExpressList,
  expressDetailSubject,
  isPackageBarcode,
  loadExpressGroupContext,
  mapExpressGroup,
  mapExpressItem,
} = require('../netlify/functions/utils/expressDetailsGroups');

const FUNCTIONS_ORIGIN = String(
  process.env.ADMIN_FUNCTIONS_PROXY ||
    process.env.REACT_APP_NETLIFY_BASE_URL ||
    'https://admin-market-link-express.com',
)
  .trim()
  .replace(/\/$/, '');

const PROXY_HOST = (() => {
  try {
    return new URL(FUNCTIONS_ORIGIN).hostname;
  } catch {
    return '';
  }
})();

const badUntil = new Map();
let cached = null;
let pickPromise = null;

function tcpReachable(ip, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: ip, port: 443, timeout: timeoutMs });
    const finish = (ok) => {
      socket.destroy();
      resolve(ok ? ip : null);
    };
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function firstReachable(ips, timeoutMs) {
  return new Promise((resolve) => {
    if (!ips.length) {
      resolve(null);
      return;
    }
    let pending = ips.length;
    let settled = false;
    ips.forEach((ip) => {
      tcpReachable(ip, timeoutMs).then((ok) => {
        if (ok && !settled) {
          settled = true;
          resolve(ok);
        }
        pending -= 1;
        if (!settled && pending === 0) resolve(null);
      });
    });
  });
}

async function chooseIp(hostname) {
  const now = Date.now();
  if (cached && cached.host === hostname && cached.until > now && (badUntil.get(cached.ip) || 0) <= now) {
    return cached.ip;
  }
  let addresses = [];
  try {
    addresses = await dns.promises.resolve4(hostname);
  } catch {
    addresses = [];
  }
  const healthy = addresses.filter((ip) => (badUntil.get(ip) || 0) <= now);
  const pool = healthy.length ? healthy : addresses;
  if (!pool.length) return null;
  const winner = pool.length === 1 ? pool[0] : await firstReachable(pool, 4000);
  const ip = winner || pool[0];
  if (!cached || cached.ip !== ip) {
    console.warn('[admin-proxy] 改走', ip);
  }
  cached = { host: hostname, ip, until: Date.now() + 120000 };
  return ip;
}

function getIp(hostname) {
  const now = Date.now();
  if (cached && cached.host === hostname && cached.until > now && (badUntil.get(cached.ip) || 0) <= now) {
    return Promise.resolve(cached.ip);
  }
  if (!pickPromise) {
    pickPromise = chooseIp(hostname).finally(() => {
      pickPromise = null;
    });
  }
  return pickPromise;
}

function markFailed(ip) {
  if (!ip) return;
  badUntil.set(ip, Date.now() + 90000);
  if (cached && cached.ip === ip) cached = null;
  console.warn('[admin-proxy] 放弃', ip);
}

function failoverLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const finish = (ip) => {
    if (options && options.all) callback(null, [{ address: ip, family: 4 }]);
    else callback(null, ip, 4);
  };
  if (hostname !== PROXY_HOST) {
    dns.lookup(hostname, options, callback);
    return;
  }
  getIp(hostname)
    .then((ip) => {
      if (!ip) dns.lookup(hostname, options, callback);
      else finish(ip);
    })
    .catch(() => dns.lookup(hostname, options, callback));
}

/** 关掉连接复用。线上偶发 ECONNRESET 时，旧 socket 会让登录接口直接 504。 */
const proxyAgent = new https.Agent({
  keepAlive: false,
  maxSockets: 32,
  lookup: failoverLookup,
});

function proxyError(err, _req, res) {
  markFailed(cached && cached.ip);
  if (!res || res.headersSent || res.writableEnded) return;
  res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      success: false,
      valid: false,
      error: '连不上线上登录接口，请再试一次',
    }),
  );
  if (err) {
    console.warn('[admin-proxy]', err.code || err.message);
  }
}

function adminProxy() {
  return createProxyMiddleware({
    target: FUNCTIONS_ORIGIN,
    changeOrigin: true,
    secure: true,
    xfwd: true,
    cookieDomainRewrite: '',
    agent: proxyAgent,
    proxyTimeout: 25000,
    timeout: 25000,
    onProxyReq(proxyReq) {
      proxyReq.setHeader('Connection', 'close');
    },
    onProxyRes() {
      if (cached) cached = { ...cached, until: Date.now() + 120000 };
    },
    onError: proxyError,
  });
}

let serviceRoleCache;

function readServiceRole() {
  if (serviceRoleCache !== undefined) return serviceRoleCache;
  const fromEnv = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '').trim();
  if (fromEnv) {
    serviceRoleCache = fromEnv;
    return serviceRoleCache;
  }
  try {
    const out = execSync('npx netlify env:get SUPABASE_SERVICE_ROLE_KEY', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 40000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    serviceRoleCache =
      out
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.startsWith('eyJ')) || '';
  } catch {
    serviceRoleCache = '';
  }
  return serviceRoleCache;
}

function verifyAdminOnProduction(headers) {
  const body = JSON.stringify({
    action: 'verify',
    requiredRoles: ['admin', 'manager', 'operator', 'finance'],
    permissionIds: ['cross_border_logistics'],
  });
  return new Promise((resolve) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: PROXY_HOST,
        path: '/.netlify/functions/verify-admin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          cookie: headers.cookie || '',
          authorization: headers.authorization || '',
          Connection: 'close',
        },
        agent: proxyAgent,
        servername: PROXY_HOST,
      },
      (resp) => {
        const chunks = [];
        resp.on('data', (chunk) => chunks.push(chunk));
        resp.on('end', () => {
          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (!payload || !payload.valid) {
              console.warn('[export-cost] verify', resp.statusCode, payload && payload.error ? payload.error : 'invalid');
            }
            resolve(Boolean(payload && payload.valid));
          } catch {
            console.warn('[export-cost] verify parse', resp.statusCode);
            resolve(false);
          }
        });
      },
    );
    req.on('error', () => resolve(false));
    req.setTimeout(20000, () => {
      req.destroy();
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

function proxyGetJson(urlPath, headers, attempt = 0) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: PROXY_HOST,
        path: urlPath,
        method: 'GET',
        headers: { ...headers, Connection: 'close' },
        agent: proxyAgent,
        servername: PROXY_HOST,
      },
      (resp) => {
        const chunks = [];
        resp.on('data', (chunk) => chunks.push(chunk));
        resp.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if ((resp.statusCode || 500) >= 400) {
            reject(new Error(text.slice(0, 180) || `HTTP ${resp.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(text));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    const fail = (error) => {
      markFailed(cached && cached.ip);
      if (attempt < 1) {
        proxyGetJson(urlPath, headers, attempt + 1).then(resolve, reject);
        return;
      }
      reject(error);
    };
    req.on('error', fail);
    req.setTimeout(20000, () => {
      req.destroy();
      fail(new Error('出口成本加载超时'));
    });
    req.end();
  });
}

function serviceHeaders(serviceRole) {
  return {
    apikey: serviceRole,
    authorization: `Bearer ${serviceRole}`,
    accept: 'application/json',
  };
}

async function proxyGetPages(table, select, extraQuery, headers) {
  const pageSize = 500;
  const rows = [];
  for (let page = 0; page < 30; page += 1) {
    const offset = page * pageSize;
    const batch = await proxyGetJson(
      `/__sb/rest/v1/${table}?select=${select}${extraQuery || ''}&limit=${pageSize}&offset=${offset}`,
      headers,
    );
    const list = Array.isArray(batch) ? batch : [];
    rows.push(...list);
    if (list.length < pageSize) return rows;
  }
  return rows;
}

function proxyExpressIo(headers) {
  const read = async (path) => {
    try {
      const data = await proxyGetJson(path, headers);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };
  const listed = (codes) => encodeURIComponent(restIn(codes));
  return {
    shipmentItemsByBarcode(codes) {
      return read(`/__sb/rest/v1/inventory_packed_shipment_items?select=item_barcode,pack_id&item_barcode=in.${listed(codes)}&limit=300`);
    },
    shipmentItemsByPack(packIds) {
      return read(`/__sb/rest/v1/inventory_packed_shipment_items?select=item_barcode,pack_id&pack_id=in.${listed(packIds)}&limit=300`);
    },
    shipmentsById(ids) {
      return read(`/__sb/rest/v1/inventory_packed_shipments?select=id,bundle_barcode&id=in.${listed(ids)}&limit=100`);
    },
    shipmentsByBarcode(codes) {
      return read(`/__sb/rest/v1/inventory_packed_shipments?select=id,bundle_barcode&bundle_barcode=in.${listed(codes)}&limit=100`);
    },
    itemsByBarcode(codes) {
      return read(`/__sb/rest/v1/inventory_store_items?select=${EXPRESS_SELECT}&barcode=in.${listed(codes)}`);
    },
    itemsLikeBase(base) {
      return read(`/__sb/rest/v1/inventory_store_items?select=${EXPRESS_SELECT}&barcode=like.${encodeURIComponent(`${base}(*`)}&limit=30`);
    },
    packNotes(itemIds) {
      return read(`/__sb/rest/v1/inventory_stock_movements?select=item_id,note&item_id=in.${listed(itemIds)}&note=ilike.*${encodeURIComponent('打包入')}*&limit=100`);
    },
  };
}

const EXPRESS_SELECT = [
  'id',
  'barcode',
  'input_barcode',
  'name',
  'spec',
  'unit',
  'weight',
  'qty_on_hand',
  'recipient_name',
  'final_destination',
  'owner_store_code',
  'note',
  'packed_at',
  'packed_bundle_barcode',
  'hub_arrived_at',
  'customer_signed_at',
  'hub_transit_released_at',
  'hub_transit_shipped_at',
  'created_at',
  'updated_at',
].join(',');

function restIn(codes) {
  return `(${codes.map((code) => `"${code}"`).join(',')})`;
}

async function exceptionMarks(headers, rows) {
  const codes = [
    ...new Set(
      rows
        .flatMap((row) => [row.barcode, row.input_barcode])
        .map((code) => String(code || '').trim().toUpperCase())
        .filter(Boolean),
    ),
  ].slice(0, 40);
  const marks = new Map();
  if (!codes.length) return marks;
  const list = encodeURIComponent(restIn(codes));
  const [byItem, byExpress] = await Promise.all([
    proxyGetJson(
      `/__sb/rest/v1/inventory_exceptions?select=item_barcode,express_barcode,status&item_barcode=in.${list}&limit=200`,
      headers,
    ).catch(() => []),
    proxyGetJson(
      `/__sb/rest/v1/inventory_exceptions?select=item_barcode,express_barcode,status&express_barcode=in.${list}&limit=200`,
      headers,
    ).catch(() => []),
  ]);
  for (const row of [...(Array.isArray(byItem) ? byItem : []), ...(Array.isArray(byExpress) ? byExpress : [])]) {
    const status = String(row.status || '');
    for (const code of [row.item_barcode, row.express_barcode]) {
      const key = String(code || '').trim().toUpperCase();
      if (!key || marks.get(key) === 'open') continue;
      if (status === 'open' || status === 'resolved') marks.set(key, status);
    }
  }
  return marks;
}

function rowMark(row, marks) {
  const codes = [row.barcode, row.input_barcode].map((code) => String(code || '').trim().toUpperCase());
  if (codes.some((code) => marks.get(code) === 'open')) return 'open';
  if (codes.some((code) => marks.get(code) === 'resolved')) return 'resolved';
  return '';
}

function localExpressDetails(req, res, next) {
  const section = String((req.query && req.query.section) || '').toLowerCase();
  if (req.method !== 'GET' || section !== 'express-details') {
    next();
    return;
  }
  const serviceRole = readServiceRole();
  if (!serviceRole) {
    next();
    return;
  }
  verifyAdminOnProduction(req.headers)
    .then(async (valid) => {
      if (res.headersSent || res.writableEnded) return;
      if (!valid) {
        res.status(401).json({ error: '未授权' });
        return;
      }
      const headers = serviceHeaders(serviceRole);
      const id = String((req.query && req.query.id) || '').trim();
      if (id) {
        const items = await proxyGetJson(
          `/__sb/rest/v1/inventory_store_items?select=${EXPRESS_SELECT}&id=eq.${encodeURIComponent(id)}&limit=1`,
          headers,
        );
        const item = Array.isArray(items) ? items[0] : null;
        if (!item) {
          res.json({ ok: true, section: 'express-details', detail: null });
          return;
        }
        const context = await loadExpressGroupContext([item], proxyExpressIo(headers));
        const subject = expressDetailSubject(item, context.relatedRows, context.packByItemBarcode);
        const lines = subject.lines.length ? subject.lines : [item];
        const grouped = lines.length > 1 || isPackageBarcode(subject.packBarcode);
        const lineIds = lines.map((row) => row.id);
        const barcodes = lines.map((row) => String(row.barcode || '').trim().toUpperCase()).filter(Boolean);
        const [movements, exceptions, marks] = await Promise.all([
          proxyGetJson(
            `/__sb/rest/v1/inventory_stock_movements?select=recipient_name,recipient_phone,destination,detail_address,packaging,note,origin_store_name,created_at&item_id=in.${encodeURIComponent(restIn(lineIds))}&type=eq.in&order=created_at.desc&limit=20`,
            headers,
          ).catch(() => []),
          barcodes.length
            ? proxyGetJson(
              `/__sb/rest/v1/inventory_exceptions?select=id,exception_type,status,note,created_at,resolved_at&item_barcode=in.${encodeURIComponent(restIn(barcodes))}&order=created_at.desc&limit=8`,
              headers,
            ).catch(() => [])
            : [],
          exceptionMarks(headers, lines),
        ]);
        const movementList = Array.isArray(movements) ? movements : [];
        const movement = movementList.find((row) => String(row.recipient_phone || '').trim()) || movementList[0] || null;
        const exception = lines.some((row) => rowMark(row, marks) === 'open')
          ? 'open'
          : lines.some((row) => rowMark(row, marks) === 'resolved')
            ? 'resolved'
            : '';
        const base = grouped
          ? mapExpressGroup(lines, subject.packBarcode, exception, subject.shells)
          : mapExpressItem(lines[0], exception);
        const detail = {
          ...base,
          phone: String((movement && movement.recipient_phone) || '').trim(),
          address: String((movement && movement.detail_address) || '').trim(),
          packaging: String((movement && movement.packaging) || '').trim(),
          inboundNote: String((movement && movement.note) || lines.map((row) => row.note).find(Boolean) || '').trim(),
          inboundStore: String((movement && movement.origin_store_name) || '').trim(),
          inboundAt: (movement && movement.created_at) || base.inboundAt || '',
          customerName: base.customerName || String((movement && movement.recipient_name) || '').trim(),
          destination: base.destination || String((movement && movement.destination) || '').trim(),
          exceptions: (Array.isArray(exceptions) ? exceptions : []).map((row) => ({
            id: row.id,
            type: row.exception_type,
            status: row.status,
            note: row.note || '',
            createdAt: row.created_at || '',
            resolvedAt: row.resolved_at || '',
          })),
        };
        res.json({ ok: true, section: 'express-details', detail });
        return;
      }
      const page = Math.max(1, parseInt((req.query && req.query.listPage) || '1', 10) || 1);
      const pageSize = Math.min(50, Math.max(1, parseInt((req.query && req.query.listPageSize) || '20', 10) || 20));
      const q = String((req.query && req.query.q) || '').trim().slice(0, 80);
      const offset = (page - 1) * pageSize;
      let path = `/__sb/rest/v1/inventory_store_items?select=${EXPRESS_SELECT}&barcode=not.ilike.PKG*&order=updated_at.desc&limit=${pageSize + 1}&offset=${offset}`;
      if (q) {
        const escaped = encodeURIComponent(q.replace(/[*%_,()]/g, ''));
        path += `&or=(barcode.ilike.*${escaped}*,input_barcode.ilike.*${escaped}*,name.ilike.*${escaped}*,recipient_name.ilike.*${escaped}*,final_destination.ilike.*${escaped}*,packed_bundle_barcode.ilike.*${escaped}*)`;
      }
      const data = await proxyGetJson(path, headers);
      const pageRows = Array.isArray(data) ? data : [];
      const hasMore = pageRows.length > pageSize;
      const rows = hasMore ? pageRows.slice(0, pageSize) : pageRows;
      const context = await loadExpressGroupContext(rows, proxyExpressIo(headers));
      const marks = await exceptionMarks(headers, rows.concat(context.relatedRows));
      res.json({
        ok: true,
        section: 'express-details',
        items: collapseExpressList({
          pageRows: rows,
          relatedRows: context.relatedRows,
          packByItemBarcode: context.packByItemBarcode,
          exceptionStatus: (row) => rowMark(row, marks),
          searching: Boolean(q),
        }),
        total: -1,
        hasMore,
        page,
        pageSize,
      });
    })
    .catch((error) => {
      if (res.headersSent || res.writableEnded) return;
      res.status(500).json({ error: error instanceof Error ? error.message : '快递明细加载失败' });
    });
}

function localExportCostList(req, res, next) {
  const section = String((req.query && req.query.section) || '').toLowerCase();
  if (req.method !== 'GET' || section !== 'export-costs') {
    next();
    return;
  }
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').trim();
  const serviceRole = readServiceRole();
  if (!supabaseUrl || !serviceRole) {
    next();
    return;
  }
  verifyAdminOnProduction(req.headers).then(async (valid) => {
    if (res.headersSent || res.writableEnded) return;
    if (!valid) {
      res.status(401).json({ error: '未授权' });
      return;
    }
    try {
      const select = [
        'id',
        'subject_kind',
        'display_barcode',
        'customer_name',
        'final_destination',
        'leg_origin',
        'leg_destination',
        'weight_kg',
        'unit_price_cny',
        'total_cny',
        'pay_currency',
        'fx_mmk_per_cny',
        'total_mmk',
        'trip_number',
        'store_code',
        'created_by',
        'created_at',
      ].join(',');
      const data = await proxyGetJson(
        `/__sb/rest/v1/inventory_export_costs?select=${select}&order=created_at.desc&limit=500`,
        {
          apikey: serviceRole,
          authorization: `Bearer ${serviceRole}`,
          accept: 'application/json',
        },
      );
      const scope = parseFinancePeriodQuery(req.query || {});
      const headers = serviceHeaders(serviceRole);
      const warnings = [];
      let pendingExport = null;
      const includePending = String((req.query && req.query.pending) || '') !== '0';
      if (includePending) try {
        const itemSelect = [
          'id',
          'barcode',
          'input_barcode',
          'recipient_name',
          'final_destination',
          'weight',
          'qty_on_hand',
          'packed_at',
          'packed_bundle_barcode',
          'hub_arrived_at',
          'customer_signed_at',
          'hub_transit_released_at',
          'owner_store_code',
        ].join(',');
        const [items, trips, savedKeys] = await Promise.all([
          proxyGetPages('inventory_store_items', itemSelect, '', headers),
          proxyGetPages(
            'inventory_pkg_tracking',
            'pack_barcode,trip_number,total_weight',
            '&truck_loaded_at=not.is.null',
            headers,
          ),
          proxyGetPages('inventory_export_costs', 'subject_kind,subject_key', '', headers),
        ]);
        pendingExport = assemblePendingExportCosts(items, trips, savedKeys, req.query && req.query.q);
      } catch (pendingError) {
        const message = pendingError instanceof Error ? pendingError.message : '待填出口成本加载失败';
        console.warn('[export-cost] pending', message);
        warnings.push(message);
      }
      res.json({
        ok: true,
        at: new Date().toISOString(),
        section: 'export-costs',
        warnings,
        pendingExport,
        ...selectExportCostRows(Array.isArray(data) ? data : [], scope),
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '出口成本加载失败' });
    }
  });
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function localStockIn(req, res, next) {
  if (req.method !== 'POST') {
    next();
    return;
  }
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').trim();
  const serviceRole = readServiceRole();
  if (!supabaseUrl || !serviceRole) {
    next();
    return;
  }
  verifyAdminOnProduction(req.headers).then(async (valid) => {
    if (res.headersSent || res.writableEnded) return;
    if (!valid) {
      res.status(401).json({ error: '未授权' });
      return;
    }
    try {
      const { createClient } = require('@supabase/supabase-js');
      const { executeStockIn } = require('../netlify/functions/inventory-admin-stock-in');
      const body = await readJsonBody(req);
      const supabase = createClient(supabaseUrl, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const data = await executeStockIn(supabase, body, 'admin-web');
      res.json(data);
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 400;
      res.status(status).json({ error: error instanceof Error ? error.message : '入库失败' });
    }
  });
}

module.exports = function setupAdminFunctionsProxy(app) {
  if (process.env.ADMIN_FUNCTIONS_PROXY === 'off') {
    return;
  }

  app.use('/.netlify/functions/inventory-admin-data', localExpressDetails);
  app.use('/.netlify/functions/inventory-admin-data', localExportCostList);
  app.use('/.netlify/functions/inventory-admin-stock-in', localStockIn);
  app.use('/.netlify/functions', adminProxy());

  // Browser supabase-js → http://localhost:<port>/__sb/… → 线上 Admin Edge BFF
  app.use('/__sb', adminProxy());
};
