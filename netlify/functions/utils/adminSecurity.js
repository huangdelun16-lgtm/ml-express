/**
 * 后台「安全与合规」服务端逻辑：IP 白名单、登录失败锁定。
 * 骑手 App（User-Agent: ML-Express-Rider-App）不走 IP 白名单，避免手机流量 IP 变化被挡。
 */

const FAILED_LOGIN_STATE_KEY = 'security.failed_login_state';
const FAILED_LOGIN_LOCK_MS = 15 * 60 * 1000;
const SETTINGS_CACHE_MS = 60 * 1000;

const ADMIN_ORIGIN_RE =
  /admin-market-link-express|localhost:3000|localhost:8888|127\.0\.0\.1:3000/i;

function header(event, name) {
  const h = event?.headers || {};
  const lower = name.toLowerCase();
  const key = Object.keys(h).find((k) => k.toLowerCase() === lower);
  return key ? h[key] : '';
}

function isAdminBrowserRequest(event) {
  const ua = String(header(event, 'user-agent') || '');
  if (/ML-Express-Rider-App/i.test(ua)) return false;
  const origin = String(header(event, 'origin') || header(event, 'referer') || '');
  return ADMIN_ORIGIN_RE.test(origin);
}

function normalizeIp(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
  if (s.startsWith('::ffff:')) s = s.slice(7);
  const zone = s.indexOf('%');
  if (zone !== -1) s = s.slice(0, zone);
  return s.trim();
}

function getClientIp(event) {
  const nf = header(event, 'x-nf-client-connection-ip');
  if (nf) return normalizeIp(nf);
  const xff = String(header(event, 'x-forwarded-for') || '');
  const first = xff.split(',')[0].trim();
  if (first) return normalizeIp(first);
  return normalizeIp(header(event, 'client-ip') || header(event, 'x-real-ip'));
}

function ipv4ToInt(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

function matchIpv4Cidr(ip, rule) {
  const ipInt = ipv4ToInt(ip);
  if (ipInt == null) return false;
  const [net, bitsRaw] = String(rule).split('/');
  const netInt = ipv4ToInt(net);
  if (netInt == null) return false;
  const bits = bitsRaw == null || bitsRaw === '' ? 32 : Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (ipInt & mask) === (netInt & mask);
}

function parseWhitelist(raw) {
  if (Array.isArray(raw)) {
    return raw.map((line) => String(line || '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseWhitelist(parsed);
    } catch {
      /* plain text */
    }
    return trimmed
      .split(/\r?\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function asBool(raw, fallback = false) {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === '1' || raw === 1) return true;
  if (raw === 'false' || raw === '0' || raw === 0) return false;
  return fallback;
}

function asNumber(raw, fallback) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function ipAllowed(clientIp, rules) {
  const ip = normalizeIp(clientIp);
  if (!ip) return false;
  const list = parseWhitelist(rules);
  if (list.length === 0) return true;
  return list.some((rule) => {
    const item = String(rule).trim();
    if (!item) return false;
    if (item.includes('/')) {
      if (ip.includes(':')) return false;
      return matchIpv4Cidr(ip, item);
    }
    return normalizeIp(item) === ip;
  });
}

function shouldEnforceIpWhitelist(enabled, rules) {
  return asBool(enabled, false) && parseWhitelist(rules).length > 0;
}

function clampFailedLoginLimit(raw) {
  const n = Math.round(asNumber(raw, 5));
  return Math.min(20, Math.max(3, n));
}

function evaluateLoginLock(state, username, now = Date.now()) {
  const key = String(username || '').trim();
  const entry = (state && state[key]) || { count: 0, lockedUntil: 0 };
  const lockedUntil = Number(entry.lockedUntil) || 0;
  if (lockedUntil > now) {
    return {
      blocked: true,
      remainingMs: lockedUntil - now,
      remainingMinutes: Math.max(1, Math.ceil((lockedUntil - now) / 60000)),
      entry,
    };
  }
  if (lockedUntil && lockedUntil <= now) {
    return { blocked: false, remainingMs: 0, remainingMinutes: 0, entry: { count: 0, lockedUntil: 0 } };
  }
  return { blocked: false, remainingMs: 0, remainingMinutes: 0, entry };
}

function recordFailedLogin(state, username, now, limit, lockMs = FAILED_LOGIN_LOCK_MS) {
  const key = String(username || '').trim();
  const prev = evaluateLoginLock(state, key, now).entry;
  const count = (Number(prev.count) || 0) + 1;
  const max = clampFailedLoginLimit(limit);
  const nextEntry = {
    count,
    lockedUntil: count >= max ? now + lockMs : 0,
  };
  return {
    state: { ...(state || {}), [key]: nextEntry },
    locked: nextEntry.lockedUntil > now,
    count,
    remainingAttempts: Math.max(0, max - count),
  };
}

function clearFailedLogin(state, username) {
  const key = String(username || '').trim();
  if (!state || !state[key]) return state || {};
  const next = { ...state };
  delete next[key];
  return next;
}

let settingsCache = { at: 0, map: null };

function rowsToMap(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    if (row && row.settings_key) map[row.settings_key] = row.settings_value;
  });
  return map;
}

async function loadSecuritySettings(fetchSettingsRows) {
  const now = Date.now();
  if (settingsCache.map && now - settingsCache.at < SETTINGS_CACHE_MS) {
    return settingsCache.map;
  }
  const rows = await fetchSettingsRows([
    'security.ip_whitelist_enabled',
    'security.ip_whitelist',
    'security.failed_login_limit',
  ]);
  const map = rowsToMap(rows);
  settingsCache = { at: now, map };
  return map;
}

function invalidateSecuritySettingsCache() {
  settingsCache = { at: 0, map: null };
}

function denyIpMessage() {
  return '当前 IP 不在后台访问白名单内';
}

function lockMessage(remainingMinutes) {
  return `账号已锁定，请 ${remainingMinutes} 分钟后再试`;
}

module.exports = {
  FAILED_LOGIN_STATE_KEY,
  FAILED_LOGIN_LOCK_MS,
  isAdminBrowserRequest,
  getClientIp,
  normalizeIp,
  parseWhitelist,
  ipAllowed,
  shouldEnforceIpWhitelist,
  asBool,
  asNumber,
  clampFailedLoginLimit,
  evaluateLoginLock,
  recordFailedLogin,
  clearFailedLogin,
  loadSecuritySettings,
  invalidateSecuritySettingsCache,
  denyIpMessage,
  lockMessage,
  rowsToMap,
};
