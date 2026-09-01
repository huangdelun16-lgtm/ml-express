/** 跨境财务期间口径：Asia/Yangon（UTC+6:30，无夏令时） — 与 src/utils/yangonFinancePeriod.ts 对齐 */

const YANGON_OFFSET_MS = 6.5 * 60 * 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isoDate(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function yangonYmdFromUtc(date) {
  const shifted = new Date((date || new Date()).getTime() + YANGON_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

function yangonTodayYmd(now) {
  const { y, m, d } = yangonYmdFromUtc(now || new Date());
  return isoDate(y, m, d);
}

function yangonMidnightUtcMs(y, m, d) {
  return Date.UTC(y, m - 1, d) - YANGON_OFFSET_MS;
}

function parseIsoDate(raw) {
  const s = String(raw || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function yangonNoonIsoFromYmd(ymd) {
  const parsed = parseIsoDate(ymd);
  if (!parsed) return '';
  return new Date(
    yangonMidnightUtcMs(parsed.y, parsed.m, parsed.d) + 12 * 60 * 60 * 1000,
  ).toISOString();
}

function addCalendarDays(y, m, d, delta) {
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function resolveFinancePeriod(kind, anchorYmd, now) {
  const today = yangonYmdFromUtc(now || new Date());
  let y = today.y;
  let m = today.m;
  let d = today.d;
  const parsed = parseIsoDate(anchorYmd);
  if (parsed) {
    y = parsed.y;
    m = parsed.m;
    d = parsed.d;
  } else if (kind === 'year' && /^\d{4}$/.test(String(anchorYmd || '').trim())) {
    y = Number(String(anchorYmd).trim());
  } else if (kind === 'month' && /^\d{4}-\d{2}$/.test(String(anchorYmd || '').trim())) {
    const parts = String(anchorYmd)
      .trim()
      .split('-')
      .map(Number);
    y = parts[0];
    m = parts[1];
    d = 1;
  }

  if (kind === 'day') {
    const from = yangonMidnightUtcMs(y, m, d);
    const next = addCalendarDays(y, m, d, 1);
    const to = yangonMidnightUtcMs(next.y, next.m, next.d);
    const start = isoDate(y, m, d);
    return {
      kind: 'day',
      fromIso: new Date(from).toISOString(),
      toExclusiveIso: new Date(to).toISOString(),
      periodStart: start,
      periodEnd: start,
      label: start,
    };
  }

  if (kind === 'month') {
    const from = yangonMidnightUtcMs(y, m, 1);
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    const to = yangonMidnightUtcMs(nextY, nextM, 1);
    const lastD = daysInMonth(y, m);
    return {
      kind: 'month',
      fromIso: new Date(from).toISOString(),
      toExclusiveIso: new Date(to).toISOString(),
      periodStart: isoDate(y, m, 1),
      periodEnd: isoDate(y, m, lastD),
      label: `${y}-${pad2(m)}`,
    };
  }

  const from = yangonMidnightUtcMs(y, 1, 1);
  const to = yangonMidnightUtcMs(y + 1, 1, 1);
  return {
    kind: 'year',
    fromIso: new Date(from).toISOString(),
    toExclusiveIso: new Date(to).toISOString(),
    periodStart: isoDate(y, 1, 1),
    periodEnd: isoDate(y, 12, 31),
    label: String(y),
  };
}

function resolveFinancePeriodFromBounds(fromRaw, toRaw) {
  const fromParsed = parseIsoDate(fromRaw);
  if (!fromParsed) return null;
  const from = yangonMidnightUtcMs(fromParsed.y, fromParsed.m, fromParsed.d);
  const toParsed = parseIsoDate(toRaw);
  let to;
  let periodEnd;
  if (toRaw && String(toRaw).includes('T') && Number.isFinite(Date.parse(toRaw))) {
    to = Date.parse(toRaw);
    periodEnd = toParsed
      ? isoDate(toParsed.y, toParsed.m, toParsed.d)
      : isoDate(fromParsed.y, fromParsed.m, fromParsed.d);
  } else if (toParsed) {
    const next = addCalendarDays(toParsed.y, toParsed.m, toParsed.d, 1);
    to = yangonMidnightUtcMs(next.y, next.m, next.d);
    periodEnd = isoDate(toParsed.y, toParsed.m, toParsed.d);
  } else {
    const next = addCalendarDays(fromParsed.y, fromParsed.m, fromParsed.d, 1);
    to = yangonMidnightUtcMs(next.y, next.m, next.d);
    periodEnd = isoDate(fromParsed.y, fromParsed.m, fromParsed.d);
  }
  const periodStart = isoDate(fromParsed.y, fromParsed.m, fromParsed.d);
  return {
    kind: periodStart === periodEnd ? 'day' : 'month',
    fromIso: new Date(from).toISOString(),
    toExclusiveIso: new Date(to).toISOString(),
    periodStart,
    periodEnd,
    label: periodStart === periodEnd ? periodStart : `${periodStart}~${periodEnd}`,
  };
}

function parseFinancePeriodQuery(query) {
  const q = query || {};
  const storeCode = String(q.storeCode || q.store_code || '')
    .trim()
    .toUpperCase();
  const kindRaw = String(q.period || '')
    .trim()
    .toLowerCase();
  const kind = kindRaw === 'day' || kindRaw === 'month' || kindRaw === 'year' ? kindRaw : '';
  const dateRaw = String(q.date || '').trim();
  const fromRaw = String(q.from || '').trim();
  const toRaw = String(q.to || '').trim();
  const exportAll = String(q.financeExport || q.export || '') === '1';
  let range = null;
  if (kind) {
    range = resolveFinancePeriod(kind, dateRaw || fromRaw || undefined);
  } else if (fromRaw) {
    range = resolveFinancePeriodFromBounds(fromRaw, toRaw);
  }
  return { storeCode, range, exportAll, kind: kind || (range && range.kind) || '' };
}

function occurredAtInRange(occurredAt, fromIso, toExclusiveIso) {
  const t = Date.parse(String(occurredAt || ''));
  if (!Number.isFinite(t)) return false;
  return t >= Date.parse(fromIso) && t < Date.parse(toExclusiveIso);
}

function isOutstandingFinanceEntry(entry) {
  if (!entry) return false;
  if (entry.category === 'order_income_cod') return true;
  if (entry.category === 'transport_cost' && !entry.paid) return true;
  return false;
}

function filterEntriesForFinancePeriod(entries, range) {
  if (!range || !range.fromIso || !range.toExclusiveIso) return entries ? entries.slice() : [];
  const fromMs = Date.parse(range.fromIso);
  const toMs = Date.parse(range.toExclusiveIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return entries ? entries.slice() : [];
  return (entries || []).filter((entry) => {
    const t = Date.parse(entry.occurredAt || '');
    if (!Number.isFinite(t)) return false;
    if (t >= fromMs && t < toMs) return true;
    return t < toMs && isOutstandingFinanceEntry(entry);
  });
}

function emptySettlementSnapshot() {
  return {
    collectedTotal: 0,
    pendingInflowTotal: 0,
    transportUnpaidTotal: 0,
    transportPaidTotal: 0,
    manualIncomeTotal: 0,
    manualExpenseTotal: 0,
    agencyPayableTotal: 0,
    agencyRemittedTotal: 0,
    netBalance: 0,
    entryIds: [],
  };
}

function buildSettlementSnapshot(summary, entries) {
  const collectedTotal = Math.round(Number(summary?.collectedTotal) || 0);
  const pendingInflowTotal = Math.round(Number(summary?.pendingInflowTotal) || 0);
  const transportUnpaidTotal = Math.round(Number(summary?.transportUnpaidTotal) || 0);
  const transportPaidTotal = Math.round(Number(summary?.transportPaidTotal) || 0);
  const manualIncomeTotal = Math.round(Number(summary?.manualIncomeTotal) || 0);
  const manualExpenseTotal = Math.round(Number(summary?.manualExpenseTotal) || 0);
  const agencyPayableTotal = Math.round(Number(summary?.agencyPayableTotal) || 0);
  const agencyRemittedTotal = Math.round(Number(summary?.agencyRemittedTotal) || 0);
  return {
    collectedTotal,
    pendingInflowTotal,
    transportUnpaidTotal,
    transportPaidTotal,
    manualIncomeTotal,
    manualExpenseTotal,
    agencyPayableTotal,
    agencyRemittedTotal,
    netBalance: collectedTotal + manualIncomeTotal - transportPaidTotal - manualExpenseTotal,
    entryIds: (entries || []).map((e) => String(e.id || '')).filter(Boolean),
  };
}

function diffSettlementSnapshot(snapshot, live) {
  const keys = [
    'collectedTotal',
    'pendingInflowTotal',
    'transportUnpaidTotal',
    'transportPaidTotal',
    'manualIncomeTotal',
    'manualExpenseTotal',
    'agencyPayableTotal',
    'agencyRemittedTotal',
    'netBalance',
  ];
  const diffs = {};
  let hasDiff = false;
  for (const key of keys) {
    const a = Math.round(Number(snapshot?.[key]) || 0);
    const b = Math.round(Number(live?.[key]) || 0);
    const delta = b - a;
    diffs[key] = { snapshot: a, live: b, delta };
    if (delta !== 0) hasDiff = true;
  }
  return { hasDiff, diffs };
}

function rollupConfirmedMonths(settlements, year, storeCode) {
  const y = Number(year);
  const code = String(storeCode || '')
    .trim()
    .toUpperCase();
  const filtered = (settlements || []).filter((s) => {
    if (code && String(s.store_code || '').trim().toUpperCase() !== code) return false;
    return (
      String(s.status || '').toLowerCase() === 'confirmed' &&
      String(s.period_type || '').toLowerCase() === 'month'
    );
  });
  const totals = emptySettlementSnapshot();
  let missingCount = 0;
  const months = [];
  const sumKeys = [
    'collectedTotal',
    'pendingInflowTotal',
    'transportUnpaidTotal',
    'transportPaidTotal',
    'manualIncomeTotal',
    'manualExpenseTotal',
    'agencyPayableTotal',
    'agencyRemittedTotal',
    'netBalance',
  ];

  for (let month = 1; month <= 12; month += 1) {
    const start = isoDate(y, month, 1);
    const rows = filtered.filter((s) => String(s.period_start || '').slice(0, 10) === start);
    if (rows.length === 0) {
      missingCount += 1;
      months.push({ month, periodStart: start, missing: true, snapshot: null, storeCount: 0 });
      continue;
    }
    const snap = emptySettlementSnapshot();
    for (const row of rows) {
      const part = row.snapshot || emptySettlementSnapshot();
      for (const key of sumKeys) {
        snap[key] = (snap[key] || 0) + Math.round(Number(part[key]) || 0);
      }
    }
    months.push({
      month,
      periodStart: start,
      missing: false,
      snapshot: snap,
      storeCount: rows.length,
    });
    for (const key of sumKeys) {
      totals[key] = (totals[key] || 0) + snap[key];
    }
  }

  return { year: y, months, totals, missingCount };
}

module.exports = {
  YANGON_OFFSET_MS,
  isoDate,
  yangonYmdFromUtc,
  yangonTodayYmd,
  yangonMidnightUtcMs,
  parseIsoDate,
  yangonNoonIsoFromYmd,
  resolveFinancePeriod,
  resolveFinancePeriodFromBounds,
  parseFinancePeriodQuery,
  occurredAtInRange,
  isOutstandingFinanceEntry,
  filterEntriesForFinancePeriod,
  emptySettlementSnapshot,
  buildSettlementSnapshot,
  diffSettlementSnapshot,
  rollupConfirmedMonths,
};
