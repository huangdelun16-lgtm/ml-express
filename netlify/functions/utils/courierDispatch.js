/**
 * 系统设置「自动化」：按策略选骑手、判断改派到期。
 * 仅处理 City `packages`（待取件/待收款），不碰 inventory_*。
 */

const UNASSIGNED = new Set(['', '待分配', '未分配']);
const ASSIGNABLE_STATUSES = new Set(['待取件', '待收款']);
const REASSIGN_STATUSES = new Set(['待取件', '已分配']);
const ACTIVE_STATUSES = ['待取件', '待收款', '打包中', '已取件', '配送中', '已分配'];

const REGION_BY_PREFIX = {
  MDY: 'mandalay',
  YGN: 'yangon',
  POL: 'maymyo',
  NPW: 'naypyidaw',
  TGI: 'taunggyi',
  LSO: 'lashio',
};

const REGION_ALIASES = {
  mandalay: 'mandalay',
  mdy: 'mandalay',
  yangon: 'yangon',
  ygn: 'yangon',
  maymyo: 'maymyo',
  pyinoolwin: 'maymyo',
  pol: 'maymyo',
  naypyidaw: 'naypyidaw',
  npw: 'naypyidaw',
  taunggyi: 'taunggyi',
  tgi: 'taunggyi',
  lashio: 'lashio',
  lso: 'lashio',
};

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

function asString(raw, fallback) {
  if (raw == null) return fallback;
  const s = String(raw).trim();
  return s || fallback;
}

function parseAutomationSettings(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    if (row && row.settings_key) map[row.settings_key] = row.settings_value;
  });
  const strategy = asString(map['automation.auto_assign_strategy'], 'distance_first');
  const allowed = new Set(['distance_first', 'rating_first', 'workload_balance']);
  return {
    enabled: asBool(map['automation.auto_dispatch_enabled'], false),
    strategy: allowed.has(strategy) ? strategy : 'distance_first',
    maxActive: Math.min(50, Math.max(1, Math.round(asNumber(map['automation.max_active_orders'], 12)))),
    reassignMinutes: Math.min(180, Math.max(0, Math.round(asNumber(map['automation.reassign_timeout_minutes'], 8)))),
  };
}

function isUnassignedCourier(courier) {
  return UNASSIGNED.has(String(courier ?? '').trim());
}

function isAssignablePackage(pkg) {
  return ASSIGNABLE_STATUSES.has(String(pkg?.status ?? '').trim()) && isUnassignedCourier(pkg?.courier);
}

function isReassignCandidate(pkg) {
  return REASSIGN_STATUSES.has(String(pkg?.status ?? '').trim()) && !isUnassignedCourier(pkg?.courier);
}

function isReassignDue(pkg, reassignMinutes, now = Date.now()) {
  if (!isReassignCandidate(pkg) || reassignMinutes <= 0) return false;
  const stamp = Date.parse(pkg.updated_at || pkg.created_at || '');
  if (!Number.isFinite(stamp)) return false;
  return now - stamp >= reassignMinutes * 60 * 1000;
}

/** 超时且当前骑手已下线/找不到时才改派，避免把在途取件单抢走。 */
function shouldReassign(pkg, couriers, reassignMinutes, now = Date.now()) {
  return isReassignDue(pkg, reassignMinutes, now) && !currentCourierStillOnDuty(pkg, couriers);
}

function normalizeRegion(value, fallbackId) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw && REGION_ALIASES[raw]) return REGION_ALIASES[raw];
  const upper = String(value || fallbackId || '').trim().toUpperCase();
  const prefix3 = upper.slice(0, 3);
  if (REGION_BY_PREFIX[prefix3]) return REGION_BY_PREFIX[prefix3];
  const emp = String(fallbackId || '').toUpperCase();
  const empPrefix = Object.keys(REGION_BY_PREFIX).find((code) => emp.startsWith(`${code}-`));
  return empPrefix ? REGION_BY_PREFIX[empPrefix] : null;
}

function sameRegion(pkg, courier) {
  const pkgRegion = normalizeRegion(pkg?.region, pkg?.id);
  const courierRegion = normalizeRegion(courier?.region, courier?.employee_id);
  if (!pkgRegion || !courierRegion) return true;
  return pkgRegion === courierRegion;
}

function isCourierOffline(status) {
  const s = String(status ?? '').trim().toLowerCase();
  return s === 'offline' || s === 'inactive';
}

function currentCourierStillOnDuty(pkg, couriers) {
  const name = String(pkg?.courier || '').trim();
  if (!name || UNASSIGNED.has(name)) return false;
  const current = (couriers || []).find((courier) => String(courier.name || '').trim() === name);
  if (!current) return false;
  return !isCourierOffline(current.status);
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function readGps(courier) {
  const latitude = courier?.latitude != null ? Number(courier.latitude) : NaN;
  const longitude = courier?.longitude != null ? Number(courier.longitude) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function packageOrigin(pkg) {
  const latitude = pkg?.sender_latitude != null ? Number(pkg.sender_latitude) : NaN;
  const longitude = pkg?.sender_longitude != null ? Number(pkg.sender_longitude) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function scoreCourier(courier, origin, strategy) {
  const load = courier.currentPackages || 0;
  const rating = Number(courier.rating);
  const safeRating = Number.isFinite(rating) ? rating : 0;
  const gps = readGps(courier);
  const distance =
    origin && gps
      ? calculateDistanceKm(origin.latitude, origin.longitude, gps.latitude, gps.longitude)
      : null;
  const distancePenalty = origin ? (distance == null ? 20 : distance) : 0;
  let score = 100 - distancePenalty * 5 - load * 10;
  if (strategy === 'rating_first') {
    score = safeRating * 20 - load * 8 - distancePenalty * 2;
  } else if (strategy === 'workload_balance') {
    score = 100 - load * 20 - distancePenalty * 2;
  }
  return { distance, score };
}

function rankCouriers(couriers, origin, options = {}) {
  const strategy = options.strategy || 'distance_first';
  const maxActive = options.maxActiveOrders;
  const excludeNames = new Set(
    (options.excludeNames || []).map((name) => String(name || '').trim()).filter(Boolean),
  );
  const available = (couriers || []).filter((courier) => {
    if (isCourierOffline(courier.status)) return false;
    if (excludeNames.has(String(courier.name || '').trim())) return false;
    if (maxActive != null && (courier.currentPackages || 0) >= maxActive) return false;
    return true;
  });

  const ranked = available.map((courier) => {
    const { distance, score } = scoreCourier(courier, origin, strategy);
    return { ...courier, distance, score };
  });

  ranked.sort((a, b) => {
    if (origin && strategy === 'distance_first') {
      const aHas = a.distance != null ? 1 : 0;
      const bHas = b.distance != null ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
    }
    if (b.score !== a.score) return b.score - a.score;
    const loadDiff = (a.currentPackages || 0) - (b.currentPackages || 0);
    if (loadDiff !== 0) return loadDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh');
  });

  return ranked;
}

function pickCourierForPackage(pkg, couriers, options = {}) {
  const regionMatched = (couriers || []).filter((courier) => sameRegion(pkg, courier));
  const ranked = rankCouriers(regionMatched, packageOrigin(pkg), options);
  return ranked[0] || null;
}

function countActiveByCourier(packages) {
  const counts = {};
  (packages || []).forEach((pkg) => {
    const name = String(pkg?.courier || '').trim();
    if (!name || UNASSIGNED.has(name)) return;
    if (!ACTIVE_STATUSES.includes(String(pkg.status || '').trim())) return;
    counts[name] = (counts[name] || 0) + 1;
  });
  return counts;
}

function nextStatusForAssign(currentStatus) {
  return String(currentStatus || '').trim() === '待收款' ? '待收款' : '待取件';
}

module.exports = {
  UNASSIGNED,
  ASSIGNABLE_STATUSES,
  REASSIGN_STATUSES,
  ACTIVE_STATUSES,
  parseAutomationSettings,
  isUnassignedCourier,
  isAssignablePackage,
  isReassignCandidate,
  isReassignDue,
  shouldReassign,
  normalizeRegion,
  sameRegion,
  rankCouriers,
  pickCourierForPackage,
  countActiveByCourier,
  nextStatusForAssign,
  packageOrigin,
};
