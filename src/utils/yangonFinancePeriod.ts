/** 跨境财务期间口径：Asia/Yangon（UTC+6:30，无夏令时） */

export const YANGON_OFFSET_MS = 6.5 * 60 * 60 * 1000;

export type FinancePeriodKind = 'day' | 'month' | 'year';

export type YangonYmd = { y: number; m: number; d: number };

export type FinancePeriodRange = {
  kind: FinancePeriodKind;
  fromIso: string;
  toExclusiveIso: string;
  periodStart: string;
  periodEnd: string;
  label: string;
};

export type SettlementSnapshot = {
  collectedTotal: number;
  pendingInflowTotal: number;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  manualIncomeTotal: number;
  manualExpenseTotal: number;
  agencyPayableTotal: number;
  agencyRemittedTotal: number;
  netBalance: number;
  entryIds: string[];
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function yangonYmdFromUtc(date: Date = new Date()): YangonYmd {
  const shifted = new Date(date.getTime() + YANGON_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

export function yangonTodayYmd(now: Date = new Date()): string {
  const { y, m, d } = yangonYmdFromUtc(now);
  return isoDate(y, m, d);
}

export function yangonMidnightUtcMs(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) - YANGON_OFFSET_MS;
}

export function parseIsoDate(raw: string | null | undefined): YangonYmd | null {
  const s = String(raw || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function yangonNoonIsoFromYmd(ymd: string): string {
  const parsed = parseIsoDate(ymd);
  if (!parsed) return '';
  return new Date(
    yangonMidnightUtcMs(parsed.y, parsed.m, parsed.d) + 12 * 60 * 60 * 1000,
  ).toISOString();
}

function addCalendarDays(y: number, m: number, d: number, delta: number): YangonYmd {
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function resolveFinancePeriod(
  kind: FinancePeriodKind,
  anchorYmd?: string,
  now: Date = new Date(),
): FinancePeriodRange {
  const today = yangonYmdFromUtc(now);
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
    const [yy, mm] = String(anchorYmd)
      .trim()
      .split('-')
      .map(Number);
    y = yy;
    m = mm;
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

export function resolveFinancePeriodFromBounds(
  fromRaw: string,
  toRaw?: string,
): FinancePeriodRange | null {
  const fromParsed = parseIsoDate(fromRaw);
  if (!fromParsed) return null;
  const from = yangonMidnightUtcMs(fromParsed.y, fromParsed.m, fromParsed.d);
  const toParsed = parseIsoDate(toRaw);
  let to: number;
  let periodEnd: string;
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

export type FinancePeriodQuery = {
  storeCode?: string;
  period?: string;
  date?: string;
  from?: string;
  to?: string;
  financeExport?: string;
  export?: string;
  store_code?: string;
};

export function parseFinancePeriodQuery(query: FinancePeriodQuery | null | undefined): {
  storeCode: string;
  range: FinancePeriodRange | null;
  exportAll: boolean;
  kind: string;
} {
  const q = query || {};
  const storeCode = String(q.storeCode || q.store_code || '')
    .trim()
    .toUpperCase();
  const kindRaw = String(q.period || '')
    .trim()
    .toLowerCase();
  const kind: FinancePeriodKind | '' =
    kindRaw === 'day' || kindRaw === 'month' || kindRaw === 'year' ? kindRaw : '';
  const dateRaw = String(q.date || '').trim();
  const fromRaw = String(q.from || '').trim();
  const toRaw = String(q.to || '').trim();
  const exportAll = String(q.financeExport || q.export || '') === '1';
  let range: FinancePeriodRange | null = null;
  if (kind) {
    range = resolveFinancePeriod(kind, dateRaw || fromRaw || undefined);
  } else if (fromRaw) {
    range = resolveFinancePeriodFromBounds(fromRaw, toRaw);
  }
  return { storeCode, range, exportAll, kind: kind || range?.kind || '' };
}

export function occurredAtInRange(
  occurredAt: string | null | undefined,
  fromIso: string,
  toExclusiveIso: string,
): boolean {
  const t = Date.parse(String(occurredAt || ''));
  if (!Number.isFinite(t)) return false;
  return t >= Date.parse(fromIso) && t < Date.parse(toExclusiveIso);
}

export function isOutstandingFinanceEntry(entry: {
  category?: string;
  paid?: boolean;
} | null | undefined): boolean {
  if (!entry) return false;
  if (entry.category === 'order_income_cod') return true;
  if (entry.category === 'transport_cost' && !entry.paid) return true;
  return false;
}

export function filterEntriesForFinancePeriod<T extends { occurredAt?: string; category?: string; paid?: boolean }>(
  entries: T[] | null | undefined,
  range: FinancePeriodRange | null | undefined,
): T[] {
  if (!range?.fromIso || !range.toExclusiveIso) return entries ? [...entries] : [];
  const fromMs = Date.parse(range.fromIso);
  const toMs = Date.parse(range.toExclusiveIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return entries ? [...entries] : [];
  return (entries || []).filter((entry) => {
    const t = Date.parse(entry.occurredAt || '');
    if (!Number.isFinite(t)) return false;
    if (t >= fromMs && t < toMs) return true;
    return t < toMs && isOutstandingFinanceEntry(entry);
  });
}

export function emptySettlementSnapshot(): SettlementSnapshot {
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

export function buildSettlementSnapshot(
  summary: Partial<SettlementSnapshot> | null | undefined,
  entries: Array<{ id?: string }> | null | undefined,
): SettlementSnapshot {
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

export type SnapshotDiffField = {
  snapshot: number;
  live: number;
  delta: number;
};

export function diffSettlementSnapshot(
  snapshot: Partial<SettlementSnapshot> | null | undefined,
  live: Partial<SettlementSnapshot> | null | undefined,
): { hasDiff: boolean; diffs: Record<string, SnapshotDiffField> } {
  const keys: Array<keyof Omit<SettlementSnapshot, 'entryIds'>> = [
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
  const diffs: Record<string, SnapshotDiffField> = {};
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

export type ConfirmedMonthRow = {
  month: number;
  periodStart: string;
  missing: boolean;
  snapshot: SettlementSnapshot | null;
  storeCount: number;
};

export function rollupConfirmedMonths(
  settlements: Array<{
    status?: string;
    period_type?: string;
    period_start?: string;
    store_code?: string;
    snapshot?: SettlementSnapshot | null;
  }>,
  year: number,
  storeCode?: string,
): {
  year: number;
  months: ConfirmedMonthRow[];
  totals: SettlementSnapshot;
  missingCount: number;
} {
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
  const months: ConfirmedMonthRow[] = [];
  const sumKeys: Array<keyof Omit<SettlementSnapshot, 'entryIds'>> = [
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
