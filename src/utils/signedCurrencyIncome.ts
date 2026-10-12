/**
 * 全部已签收收入：缅币含历史单和签收时选缅币；人民币只含签收时明确选了人民币。
 * 多个入库按基础入库号只计一次。包裹壳不再另计。
 * 与 netlify/functions/utils/signedCurrencyIncome.js 保持同一套规则。
 */

export type SignedPaidCurrency = 'MMK' | 'CNY';

export type SignedIncomeRow = {
  id?: string;
  customerSigned?: boolean;
  inboundBarcode?: string | null;
  packedBundleBarcode?: string | null;
  fee?: number | null;
  quoteCny?: number | null;
  paidCurrency?: SignedPaidCurrency | null;
  paidCny?: number | null;
};

export type SignedCurrencyIncome = {
  mmk: number;
  cny: number;
};

const PACKAGE_SHELL_BARCODE = /^[A-Z]{3}\d{2}[A-Z]{3}\d+\d{4}$/;

export function isPackageShellBarcode(barcode?: string | null): boolean {
  return PACKAGE_SHELL_BARCODE.test(String(barcode || '').trim().toUpperCase());
}

function packagingParts(barcode?: string | null): { base: string; index: number } | null {
  const match = String(barcode || '')
    .trim()
    .match(/^(.+)\((\d+)-(\d+)\)$/);
  if (!match) return null;
  const total = Number(match[2]);
  const index = Number(match[3]);
  if (!Number.isFinite(total) || !Number.isFinite(index) || total < 1 || index < 1 || index > total) {
    return null;
  }
  return { base: match[1].toUpperCase(), index };
}

function positive(raw: number | null | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundCny(n: number): number {
  return Math.round(n * 100) / 100;
}

function isExplicitCny(row: SignedIncomeRow): boolean {
  return row.paidCurrency === 'CNY';
}

function pickChargeRow(group: SignedIncomeRow[]): SignedIncomeRow {
  let best = group[0];
  for (let i = 1; i < group.length; i += 1) {
    const row = group[i];
    const feeDelta = positive(row.fee) - positive(best.fee);
    if (feeDelta > 0) {
      best = row;
    } else if (feeDelta === 0) {
      const nextIndex = packagingParts(row.inboundBarcode)?.index ?? 0;
      const bestIndex = packagingParts(best.inboundBarcode)?.index ?? 0;
      if (nextIndex < bestIndex) best = row;
    }
  }
  return best;
}

function maxAmount(group: SignedIncomeRow[], read: (row: SignedIncomeRow) => number): number {
  let max = 0;
  for (let i = 0; i < group.length; i += 1) {
    const n = read(group[i]);
    if (n > max) max = n;
  }
  return max;
}

export function sumSignedCurrencyIncome(rows: SignedIncomeRow[]): SignedCurrencyIncome {
  const bundleShells: { [code: string]: true } = {};
  for (let i = 0; i < rows.length; i += 1) {
    const code = String(rows[i].packedBundleBarcode || '').trim().toUpperCase();
    if (code) bundleShells[code] = true;
  }

  const groups: { [key: string]: SignedIncomeRow[] } = {};
  const order: string[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.customerSigned) continue;
    const barcode = String(row.inboundBarcode || '').trim().toUpperCase();
    if (barcode && (isPackageShellBarcode(barcode) || bundleShells[barcode])) continue;
    const base = packagingParts(row.inboundBarcode)?.base;
    const key = base ? `base:${base}` : `row:${barcode || `anon:${i}`}`;
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(row);
  }

  let mmk = 0;
  let cny = 0;
  for (let i = 0; i < order.length; i += 1) {
    const group = groups[order[i]];
    const charge = pickChargeRow(group);
    if (isExplicitCny(charge)) {
      const paid = positive(charge.paidCny) || maxAmount(group, (row) => positive(row.paidCny));
      const quote = positive(charge.quoteCny) || maxAmount(group, (row) => positive(row.quoteCny));
      cny += paid || quote;
    } else {
      mmk += maxAmount(group, (row) => positive(row.fee));
    }
  }

  return { mmk: Math.round(mmk), cny: roundCny(cny) };
}

export function readSignedCurrencyIncome(
  summaries: Array<{ signedMmkIncome?: number | null; signedCnyIncome?: number | null }>,
): SignedCurrencyIncome | null {
  if (!summaries.length) return { mmk: 0, cny: 0 };
  let mmk = 0;
  let cny = 0;
  for (let i = 0; i < summaries.length; i += 1) {
    const row = summaries[i];
    if (typeof row.signedMmkIncome !== 'number' || typeof row.signedCnyIncome !== 'number') return null;
    if (!Number.isFinite(row.signedMmkIncome) || !Number.isFinite(row.signedCnyIncome)) return null;
    mmk += row.signedMmkIncome;
    cny += row.signedCnyIncome;
  }
  return { mmk: Math.round(mmk), cny: roundCny(cny) };
}

export function mergeSignedIncomeItems(lists: SignedIncomeRow[][]): SignedCurrencyIncome {
  const seen: { [id: string]: true } = {};
  const merged: SignedIncomeRow[] = [];
  for (let i = 0; i < lists.length; i += 1) {
    const items = lists[i] || [];
    for (let j = 0; j < items.length; j += 1) {
      const row = items[j];
      const id = String(row.id || '').trim();
      if (id) {
        if (seen[id]) continue;
        seen[id] = true;
      }
      merged.push(row);
    }
  }
  return sumSignedCurrencyIncome(merged);
}
