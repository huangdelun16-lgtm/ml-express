export const CROSS_BORDER_FX_SETTINGS_KEY = 'pricing.cross_border.fx.mmk_per_cny';
export const CROSS_BORDER_FX_HISTORY_SETTINGS_KEY = 'pricing.cross_border.fx.mmk_per_cny.history';

export const CROSS_BORDER_FX_HISTORY_LIMIT = 20;

export type CrossBorderFxHistoryEntry = {
  at: string;
  by: string;
  from: number | null;
  to: number;
};

const CUSTOMER_LEDGER_CATEGORIES = new Set([
  'pending_inflow',
  'collected',
  'manual_income',
  'order_income_cod',
  'order_prepaid',
  'order_collected',
]);

/** 1 CNY = X MMK。无效 / 未设时返回 null，禁止当 0 去折算。 */
export function parseMmkPerCnyRate(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return parseMmkPerCnyRate((raw as { value: unknown }).value);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return parseMmkPerCnyRate(JSON.parse(trimmed));
    } catch {
      const n = Number(trimmed.replace(/,/g, ''));
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  return null;
}

export function pickMmkPerCnyRate(
  rows: Array<{ settings_key?: string | null; settings_value?: unknown }>,
): number | null {
  for (const row of rows) {
    if (row.settings_key === CROSS_BORDER_FX_SETTINGS_KEY) {
      return parseMmkPerCnyRate(row.settings_value);
    }
  }
  return null;
}

export function mmkToCny(mmk: number, rate: number | null): number | null {
  if (rate == null || rate <= 0 || !Number.isFinite(rate) || !Number.isFinite(mmk)) return null;
  return mmk / rate;
}

/** 入库总费用取整口径，与 calculateCrossBorderTotalFee 一致 */
export function cnyToMmk(cny: number, rate: number | null): number | null {
  if (rate == null || rate <= 0 || !Number.isFinite(rate) || !Number.isFinite(cny)) return null;
  return Math.round(cny * rate);
}

export function formatCnyAmount(cny: number): string {
  if (!Number.isFinite(cny)) return '—';
  return cny.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatCnyInput(cny: number): string {
  if (!Number.isFinite(cny)) return '';
  if (Math.abs(cny - Math.round(cny)) < 1e-9) return String(Math.round(cny));
  return String(Number(cny.toFixed(4)));
}

export function isCustomerLedgerCategory(category: string): boolean {
  return CUSTOMER_LEDGER_CATEGORIES.has(category);
}

const SETTLED_CUSTOMER_CATEGORIES = new Set(['order_collected', 'order_prepaid', 'collected']);

export function isSettledCustomerCategory(category: string): boolean {
  return SETTLED_CUSTOMER_CATEGORIES.has(category);
}

/** 已收/预付用锁定汇率；待入账用活汇率。已收但没锁则返回 null，禁止用今天汇率改历史。 */
export function displayRateForCustomerCategory(
  category: string,
  lockedRate: number | null | undefined,
  liveRate: number | null,
): number | null {
  if (isSettledCustomerCategory(category)) {
    return lockedRate != null && lockedRate > 0 ? lockedRate : null;
  }
  return liveRate != null && liveRate > 0 ? liveRate : null;
}

export function customerExpressLedgerCategory(item: {
  paymentLabel?: string | null;
  paymentStatus?: string | null;
  customerSigned?: boolean;
}): string {
  if (item.paymentLabel === '预付' || item.paymentStatus === '已付款') return 'order_prepaid';
  if (item.customerSigned || item.paymentStatus === '已收款') return 'order_collected';
  return 'order_income_cod';
}

export type CustomerOrderMoney = {
  cny: number | null;
  mmk: number | null;
  /** 客户已签收：人民币和缅币都按签收当天的记录，不再跟总部最新汇率走 */
  frozen: boolean;
};

function positiveAmount(raw: number | null | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function positiveRate(raw: number | null | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * 客户订单费用。未签收以入库人民币为准，缅币 = 报价 × 当前总部汇率。
 * 已签收不再改：人民币用入库报价，缅币用签收时写下的总费用；没有总费用才用签收汇率现算。
 * 没有人民币报价的旧单只保留缅币，不用新汇率倒推人民币。
 */
export function resolveCustomerOrderMoney(params: {
  quoteCny?: number | null;
  mmk?: number | null;
  customerSigned?: boolean;
  lockedRate?: number | null;
  paidCny?: number | null;
  liveRate?: number | null;
}): CustomerOrderMoney {
  const quote = positiveAmount(params.quoteCny);
  const recordedMmk = positiveAmount(params.mmk);
  const lockedRate = positiveRate(params.lockedRate);
  const liveRate = positiveRate(params.liveRate);
  const paidCny = positiveAmount(params.paidCny);

  if (params.customerSigned) {
    const cny =
      quote ??
      paidCny ??
      (recordedMmk != null && lockedRate != null ? mmkToCny(recordedMmk, lockedRate) : null);
    const mmk =
      recordedMmk ??
      (quote != null && lockedRate != null ? cnyToMmk(quote, lockedRate) : null);
    return { cny, mmk, frozen: true };
  }

  if (quote != null) {
    return { cny: quote, mmk: cnyToMmk(quote, liveRate), frozen: false };
  }

  return { cny: null, mmk: recordedMmk, frozen: false };
}

/** 每一行都能换成人民币才加总人民币；每一行都有缅币才加总缅币。 */
export function sumCustomerOrderMoney(rows: CustomerOrderMoney[]): {
  cny: number | null;
  mmk: number | null;
} {
  const charged = rows.filter((row) => row.cny != null || row.mmk != null);
  if (!charged.length) return { cny: null, mmk: null };
  const cny = charged.every((row) => row.cny != null)
    ? charged.reduce((sum, row) => sum + (row.cny ?? 0), 0)
    : null;
  const mmk = charged.every((row) => row.mmk != null)
    ? charged.reduce((sum, row) => sum + (row.mmk ?? 0), 0)
    : null;
  return { cny, mmk };
}

/** 客户账人民币：已收优先用实收 CNY，否则按锁定/活汇率折算；旧单无锁为 null。 */
export function resolveCustomerFeeCny(params: {
  category: string;
  mmk?: number | null;
  lockedRate?: number | null;
  paidCny?: number | null;
  liveRate: number | null;
}): number | null {
  if (
    isSettledCustomerCategory(params.category) &&
    params.paidCny != null &&
    Number.isFinite(params.paidCny) &&
    params.paidCny > 0
  ) {
    return params.paidCny;
  }
  const mmk = Number(params.mmk);
  if (!Number.isFinite(mmk)) return null;
  return mmkToCny(
    mmk,
    displayRateForCustomerCategory(params.category, params.lockedRate, params.liveRate),
  );
}

export function buildCrossBorderFxSetting(
  rate: number,
  updatedBy = 'admin-dashboard',
): {
  category: 'pricing';
  settings_key: string;
  settings_value: number;
  description: string;
  updated_by: string;
} {
  return {
    category: 'pricing',
    settings_key: CROSS_BORDER_FX_SETTINGS_KEY,
    settings_value: rate,
    description: '1 CNY = this many MMK (cross-border quote FX)',
    updated_by: updatedBy || 'admin-dashboard',
  };
}

export function parseCrossBorderFxHistory(raw: unknown): CrossBorderFxHistoryEntry[] {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && 'entries' in value) {
    value = (value as { entries: unknown }).entries;
  }
  if (!Array.isArray(value)) return [];

  const entries: CrossBorderFxHistoryEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const to = parseMmkPerCnyRate(rec.to);
    if (to == null) continue;
    const at = typeof rec.at === 'string' ? rec.at.trim() : '';
    if (!at) continue;
    const from =
      rec.from == null || rec.from === '' ? null : parseMmkPerCnyRate(rec.from);
    const by = typeof rec.by === 'string' && rec.by.trim() ? rec.by.trim() : '—';
    entries.push({ at, by, from, to });
  }
  entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return entries;
}

/**
 * 某一时刻正在生效的总部汇率。
 * 路线单价的人民币按保存当时的汇率还原，不能用今天的汇率倒除。
 * 早于全部记录时用最早一条的 from。from 也没有时返回 null，禁止改用今天的汇率。
 */
export function rateInEffectAt(
  history: CrossBorderFxHistoryEntry[],
  currentRate: number | null,
  atIso: string | null | undefined,
): number | null {
  const live =
    currentRate != null && Number.isFinite(currentRate) && currentRate > 0 ? currentRate : null;
  const sorted = history
    .filter((entry) => Number.isFinite(entry.to) && entry.to > 0 && Boolean(entry.at))
    .slice()
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const at = atIso ? Date.parse(atIso) : Number.NaN;
  if (!Number.isFinite(at)) return live;

  const earliestFrom = sorted.length > 0 ? sorted[0].from : null;
  let rate = earliestFrom != null && earliestFrom > 0 ? earliestFrom : null;
  let sawRate = rate != null;
  for (const entry of sorted) {
    const changedAt = Date.parse(entry.at);
    if (!Number.isFinite(changedAt) || changedAt > at) break;
    rate = entry.to;
    sawRate = true;
  }
  if (sawRate && rate != null && rate > 0) return rate;
  return null;
}

/**
 * 2026-10-06 保存汇率时，页面没加载到旧记录，把历史盖成了一条 from 为空的 669。
 * 用审计日志里的变更补回。以后新的变更仍追加在上面。
 */
const RECOVERED_FX_HISTORY: CrossBorderFxHistoryEntry[] = [
  { at: '2026-10-06T10:14:31.214Z', by: 'admin', from: 666, to: 669 },
  { at: '2026-10-03T03:44:33.007Z', by: 'admin', from: 672, to: 666 },
  { at: '2026-09-29T14:14:20.243Z', by: 'admin', from: 664, to: 672 },
  { at: '2026-09-24T22:26:24.762Z', by: 'admin', from: 662, to: 664 },
  { at: '2026-09-22T08:51:21.885Z', by: 'admin', from: 660, to: 662 },
  { at: '2026-09-15T04:53:40.871Z', by: 'admin', from: 655, to: 660 },
  { at: '2026-09-14T09:42:14.863Z', by: 'admin', from: 656, to: 655 },
  { at: '2026-09-14T09:41:57.516Z', by: 'admin', from: 655, to: 656 },
];

export function repairFxHistory(
  entries: CrossBorderFxHistoryEntry[],
): CrossBorderFxHistoryEntry[] {
  const byAt = new Map<string, CrossBorderFxHistoryEntry>();
  for (const entry of RECOVERED_FX_HISTORY) byAt.set(entry.at, entry);
  for (const entry of entries) {
    if (entry.from == null || !(entry.from > 0) || !entry.at) continue;
    if (!byAt.has(entry.at)) byAt.set(entry.at, entry);
  }
  return Array.from(byAt.values()).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** 保存汇率时合并历史。客户端没加载到旧记录时，不能拿空列表把服务器上的记录盖掉。 */
export function mergeFxHistoryForSave(input: {
  serverHistory: CrossBorderFxHistoryEntry[];
  clientHistory: CrossBorderFxHistoryEntry[];
  fromRate: number | null;
  toRate: number;
  at: string;
  by: string;
}): { unchanged: boolean; history: CrossBorderFxHistoryEntry[] } {
  const server = repairFxHistory(input.serverHistory);
  const client = repairFxHistory(input.clientHistory);
  const base = server.length >= client.length ? server : client;
  if (input.fromRate != null && input.fromRate === input.toRate) {
    return { unchanged: true, history: base };
  }
  return {
    unchanged: false,
    history: appendCrossBorderFxHistory(base, {
      at: input.at,
      by: input.by,
      from: input.fromRate,
      to: input.toRate,
    }),
  };
}

export function appendCrossBorderFxHistory(
  existing: CrossBorderFxHistoryEntry[],
  entry: CrossBorderFxHistoryEntry,
  limit = CROSS_BORDER_FX_HISTORY_LIMIT,
): CrossBorderFxHistoryEntry[] {
  return [entry, ...existing.filter((row) => row.at !== entry.at)].slice(0, limit);
}

export function buildCrossBorderFxHistorySetting(
  entries: CrossBorderFxHistoryEntry[],
  updatedBy = 'admin-dashboard',
): {
  category: 'pricing';
  settings_key: string;
  settings_value: CrossBorderFxHistoryEntry[];
  description: string;
  updated_by: string;
} {
  return {
    category: 'pricing',
    settings_key: CROSS_BORDER_FX_HISTORY_SETTINGS_KEY,
    settings_value: entries,
    description: 'Cross-border FX change history',
    updated_by: updatedBy || 'admin-dashboard',
  };
}
