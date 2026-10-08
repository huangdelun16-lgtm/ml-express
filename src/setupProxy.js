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
      res.json({
        ok: true,
        at: new Date().toISOString(),
        section: 'export-costs',
        warnings: [],
        ...selectExportCostRows(Array.isArray(data) ? data : [], scope),
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : '出口成本加载失败' });
    }
  });
}

module.exports = function setupAdminFunctionsProxy(app) {
  if (process.env.ADMIN_FUNCTIONS_PROXY === 'off') {
    return;
  }

  app.use('/.netlify/functions/inventory-admin-data', localExportCostList);
  app.use('/.netlify/functions', adminProxy());

  // Browser supabase-js → http://localhost:<port>/__sb/… → 线上 Admin Edge BFF
  app.use('/__sb', adminProxy());
};
