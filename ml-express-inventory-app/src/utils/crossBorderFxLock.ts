import { formatCnyInput, mmkToCny } from './crossBorderFx';

export type CrossBorderPaidCurrency = 'MMK' | 'CNY';

export type CrossBorderFxLock = {
  paidCurrency: CrossBorderPaidCurrency;
  mmkPerCny: number;
  paidCny?: number;
};

const RATE_PART = /^(?:汇率|Rate|FX)\s+([\d.]+)$/i;
const PAID_MMK = /^(?:实收|Paid)\s+MMK$/i;
const PAID_CNY_AMT = /^(?:实收|Paid)\s+([\d.]+)\s*CNY$/i;
const PAID_CNY = /^(?:实收|Paid)\s+CNY$/i;

const SETTLED_CATEGORIES = new Set(['order_collected', 'order_prepaid', 'collected']);

export function isSettledCustomerCategory(category: string): boolean {
  return SETTLED_CATEGORIES.has(category);
}

export function parseFeeMmk(raw: string | number | null | undefined): number {
  const n = Number(String(raw ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 入库已写下总费用（含明确的 0 元免费）；空字符串视为未登记 */
export function hasRecordedFee(raw: string | number | null | undefined): boolean {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return false;
  const n = Number(trimmed.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n >= 0;
}

export function isFxLockNotePart(part: string): boolean {
  const trimmed = part.trim();
  if (!trimmed) return false;
  return (
    RATE_PART.test(trimmed) ||
    PAID_MMK.test(trimmed) ||
    PAID_CNY_AMT.test(trimmed) ||
    PAID_CNY.test(trimmed)
  );
}

export function parseFxLockFromNote(note: string | null | undefined): CrossBorderFxLock | null {
  const parts = String(note || '')
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  let mmkPerCny: number | null = null;
  let paidCurrency: CrossBorderPaidCurrency | undefined;
  let paidCny: number | undefined;

  for (const part of parts) {
    const rateMatch = part.match(RATE_PART);
    if (rateMatch) {
      const rate = Number(rateMatch[1]);
      if (Number.isFinite(rate) && rate > 0) mmkPerCny = rate;
      continue;
    }
    if (PAID_MMK.test(part)) {
      paidCurrency = 'MMK';
      continue;
    }
    const cnyMatch = part.match(PAID_CNY_AMT);
    if (cnyMatch) {
      paidCurrency = 'CNY';
      const cny = Number(cnyMatch[1]);
      if (Number.isFinite(cny) && cny > 0) paidCny = cny;
      continue;
    }
    if (PAID_CNY.test(part)) {
      paidCurrency = 'CNY';
    }
  }

  if (mmkPerCny == null) return null;
  return {
    paidCurrency: paidCurrency ?? 'MMK',
    mmkPerCny,
    paidCny,
  };
}

export function formatFxLockParts(lock: CrossBorderFxLock): string[] {
  const ratePart = `汇率 ${lock.mmkPerCny}`;
  if (lock.paidCurrency === 'CNY') {
    if (lock.paidCny != null && Number.isFinite(lock.paidCny) && lock.paidCny > 0) {
      return [`实收 ${formatCnyInput(lock.paidCny)} CNY`, ratePart];
    }
    return ['实收 CNY', ratePart];
  }
  return ['实收 MMK', ratePart];
}

export function applyFxLockToNote(note: string, lock: CrossBorderFxLock): string {
  const kept = String(note || '')
    .split(' · ')
    .map((part) => part.trim())
    .filter((part) => part && !isFxLockNotePart(part));
  return [...kept, ...formatFxLockParts(lock)].join(' · ');
}

export function buildSignFxLock(params: {
  feeMmk: number;
  currency: CrossBorderPaidCurrency;
  mmkPerCny: number | null;
}): CrossBorderFxLock | null {
  const rate = params.mmkPerCny;
  if (rate == null || rate <= 0 || !Number.isFinite(rate)) return null;
  if (params.currency === 'CNY') {
    const paidCny = params.feeMmk > 0 ? mmkToCny(params.feeMmk, rate) ?? undefined : undefined;
    return { paidCurrency: 'CNY', mmkPerCny: rate, paidCny };
  }
  return { paidCurrency: 'MMK', mmkPerCny: rate };
}

export function pickFxLock(
  ...locks: Array<CrossBorderFxLock | null | undefined>
): CrossBorderFxLock | null {
  for (const lock of locks) {
    if (lock && lock.mmkPerCny > 0) return lock;
  }
  return null;
}

/** 已收/预付用锁定汇率；待入账用活汇率。已收但没锁则返回 null，禁止用今天汇率改历史。 */
export function displayRateForCustomerCategory(
  category: string,
  lockedRate: number | null | undefined,
  liveRate: number | null,
): number | null {
  if (SETTLED_CATEGORIES.has(category)) {
    return lockedRate != null && lockedRate > 0 ? lockedRate : null;
  }
  return liveRate != null && liveRate > 0 ? liveRate : null;
}

export type InvoiceFeeDisplay = {
  mmk: number;
  cny: number | null;
  /** 已签收且当时锁了汇率 */
  usedLock: boolean;
  /** 已签收但没有锁定记录：只显示缅币，禁止用今天活汇率 */
  legacySignedMmkOnly: boolean;
};

/** 发票 / 订单详情：未签收用活汇率；已签收用锁定；旧单无锁只显示 MMK。 */
export function resolveInvoiceFeeDisplay(params: {
  feeMmk: number;
  signed: boolean;
  lockedRate?: number | null;
  paidCny?: number | null;
  liveRate: number | null;
}): InvoiceFeeDisplay {
  const mmk = Number.isFinite(params.feeMmk) && params.feeMmk > 0 ? params.feeMmk : 0;
  const category = params.signed ? 'order_collected' : 'pending_inflow';
  const rate = displayRateForCustomerCategory(category, params.lockedRate, params.liveRate);
  if (
    params.signed &&
    params.paidCny != null &&
    Number.isFinite(params.paidCny) &&
    params.paidCny > 0
  ) {
    return { mmk, cny: params.paidCny, usedLock: true, legacySignedMmkOnly: false };
  }
  const cny = mmk > 0 ? mmkToCny(mmk, rate) : null;
  return {
    mmk,
    cny,
    usedLock: params.signed && rate != null,
    legacySignedMmkOnly: params.signed && mmk > 0 && rate == null,
  };
}

export function sumSettledCustomerCny(
  rows: Array<{ category: string; amount: number | null; fxMmkPerCny?: number | null }>,
): number | null {
  let total = 0;
  let hasAmount = false;
  for (const row of rows) {
    if (!SETTLED_CATEGORIES.has(row.category)) continue;
    const mmk = Number(row.amount) || 0;
    if (mmk <= 0) continue;
    hasAmount = true;
    const cny = mmkToCny(mmk, row.fxMmkPerCny ?? null);
    if (cny == null) return null;
    total += cny;
  }
  return hasAmount ? total : 0;
}
