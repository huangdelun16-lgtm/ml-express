import { regionDisplayLabel } from '../constants/destinationOptions';
import type { TranslationDict } from '../i18n/translations';
import type { FinanceLedgerEntry } from '../types/financeLedger';

const CUSTOMER_LEDGER_CATEGORIES = new Set([
  'pending_inflow',
  'collected',
  'manual_income',
  'order_income_cod',
  'order_prepaid',
  'order_collected',
]);
const SETTLED_CATEGORIES = new Set(['order_collected', 'order_prepaid', 'collected']);

function isCustomerLedgerCategory(category: string): boolean {
  return CUSTOMER_LEDGER_CATEGORIES.has(category);
}

function isSettledCustomerCategory(category: string): boolean {
  return SETTLED_CATEGORIES.has(category);
}

function mmkToCny(mmk: number, rate: number | null): number | null {
  if (rate == null || rate <= 0 || !Number.isFinite(rate) || !Number.isFinite(mmk)) return null;
  return mmk / rate;
}

function displayRateForCustomerCategory(
  category: string,
  lockedRate: number | null | undefined,
  liveRate: number | null,
): number | null {
  if (isSettledCustomerCategory(category)) {
    return lockedRate != null && lockedRate > 0 ? lockedRate : null;
  }
  return liveRate != null && liveRate > 0 ? liveRate : null;
}

function sumSettledCustomerCny(
  rows: Array<{ category: string; amount: number | null; fxMmkPerCny?: number | null }>,
): number | null {
  let total = 0;
  let hasAmount = false;
  for (const row of rows) {
    if (!isSettledCustomerCategory(row.category)) continue;
    const mmk = Number(row.amount) || 0;
    if (mmk <= 0) continue;
    hasAmount = true;
    const cny = mmkToCny(mmk, row.fxMmkPerCny ?? null);
    if (cny == null) return null;
    total += cny;
  }
  return hasAmount ? total : 0;
}

export type FinanceExportLabels = {
  metaTitle: string;
  hub: string;
  store: string;
  tab: string;
  exportedAt: string;
  recordCount: string;
  balance: string;
  collected: string;
  transportUnpaid: string;
  transportPaid: string;
  pendingInflow: string;
  agencyPayable: string;
  manualIncome: string;
  manualExpense: string;
  colTime: string;
  colCategory: string;
  colTitle: string;
  colSubtitle: string;
  colBarcode: string;
  colItem: string;
  colAmount: string;
  colAmountDisplay: string;
  colDest: string;
  colOrigin: string;
  colFee: string;
  colPaid: string;
  colCny: string;
  colFxRate: string;
  colPaidCcy: string;
  colFxLock: string;
  collectedCny: string;
  paidYes: string;
  paidNo: string;
  fxLocked: string;
  fxLive: string;
  fxLegacy: string;
};

export type FinanceExportSummaryBlock = {
  collectedTotal: number;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  pendingInflowTotal: number;
  agencyPayableTotal: number;
  manualIncomeTotal: number;
  manualExpenseTotal: number;
};

export type FinanceExportMeta = {
  hub: string;
  store: string;
  tab: string;
  exportedAt: string;
};

export function escapeCsvCell(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

export function formatFinanceExportDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatFinanceExportAmount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export function buildFinanceExportFilename(opts: {
  hub: string;
  tab: string;
  at?: Date;
}): string {
  const hub = String(opts.hub || 'HUB')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 12)
    .toUpperCase() || 'HUB';
  const tab =
    String(opts.tab || 'all')
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, 16) || 'all';
  const d = opts.at ?? new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return `ML-finance-${hub}-${tab}-${stamp}.csv`;
}

export function financeExportLabelsFromT(t: TranslationDict): FinanceExportLabels {
  const f = t.crossBorderFinance;
  return {
    metaTitle: f.csvMetaTitle,
    hub: f.csvHub,
    store: f.csvStore,
    tab: f.csvTab,
    exportedAt: f.csvExportedAt,
    recordCount: f.csvRecordCount,
    balance: f.balance,
    collected: f.collected,
    transportUnpaid: f.transportUnpaid,
    transportPaid: f.transportPaid,
    pendingInflow: f.pendingInflow,
    agencyPayable: f.csvAgencyPayable,
    manualIncome: f.manualIncome,
    manualExpense: f.manualExpense,
    colTime: f.csvColTime,
    colCategory: f.csvColCategory,
    colTitle: f.csvColTitle,
    colSubtitle: f.csvColSubtitle,
    colBarcode: f.csvColBarcode,
    colItem: f.csvColItem,
    colAmount: f.csvColAmount,
    colAmountDisplay: f.csvColAmountDisplay,
    colDest: f.csvColDest,
    colOrigin: f.csvColOrigin,
    colFee: f.csvColFee,
    colPaid: f.csvColPaid,
    colCny: f.csvColCny,
    colFxRate: f.csvColFxRate,
    colPaidCcy: f.csvColPaidCcy,
    colFxLock: f.csvColFxLock,
    collectedCny: f.csvCollectedCny,
    paidYes: f.csvPaidYes,
    paidNo: f.csvPaidNo,
    fxLocked: f.csvFxLocked,
    fxLive: f.csvFxLive,
    fxLegacy: f.csvFxLegacy,
  };
}

function entryAmount(entry: FinanceLedgerEntry): string {
  if (entry.amount != null && Number.isFinite(entry.amount)) {
    return formatFinanceExportAmount(entry.amount);
  }
  if (entry.category === 'transport_cost') {
    return formatFinanceExportAmount(entry.transportFee);
  }
  return '';
}

function paidCell(entry: FinanceLedgerEntry, labels: FinanceExportLabels): string {
  if (entry.category !== 'transport_cost') return '';
  return entry.paid ? labels.paidYes : labels.paidNo;
}

function originCell(entry: FinanceLedgerEntry): string {
  const label = String(entry.originLabel || '').trim();
  if (label) return label;
  const key = String(entry.originKey || '').trim();
  return key ? regionDisplayLabel(key) : '';
}

function destCell(entry: FinanceLedgerEntry): string {
  const dest = String(entry.destination || '').trim();
  return dest ? regionDisplayLabel(dest) : '';
}

function entryCny(entry: FinanceLedgerEntry, liveRate: number | null): string {
  if (!isCustomerLedgerCategory(entry.category)) return '';
  if (entry.paidCny != null && Number.isFinite(entry.paidCny) && entry.paidCny > 0) {
    return formatFinanceExportAmount(entry.paidCny);
  }
  const rate = displayRateForCustomerCategory(entry.category, entry.fxMmkPerCny, liveRate);
  const mmk = entry.amount != null && Number.isFinite(entry.amount) ? entry.amount : null;
  if (mmk == null) return '';
  const cny = mmkToCny(mmk, rate);
  return cny == null ? '' : formatFinanceExportAmount(cny);
}

function entryFxRate(entry: FinanceLedgerEntry, liveRate: number | null): string {
  if (!isCustomerLedgerCategory(entry.category)) return '';
  const rate = displayRateForCustomerCategory(entry.category, entry.fxMmkPerCny, liveRate);
  return rate == null ? '' : formatFinanceExportAmount(rate);
}

function entryPaidCcy(entry: FinanceLedgerEntry): string {
  if (!isCustomerLedgerCategory(entry.category)) return '';
  return entry.paidCurrency || '';
}

function entryFxLock(entry: FinanceLedgerEntry, labels: FinanceExportLabels): string {
  if (!isCustomerLedgerCategory(entry.category)) return '';
  if (isSettledCustomerCategory(entry.category)) {
    return entry.fxMmkPerCny || (entry.paidCny != null && entry.paidCny > 0)
      ? labels.fxLocked
      : labels.fxLegacy;
  }
  return labels.fxLive;
}

export function buildFinanceExportCsv(params: {
  entries: FinanceLedgerEntry[];
  summary: FinanceExportSummaryBlock;
  netBalance: number;
  meta: FinanceExportMeta;
  labels: FinanceExportLabels;
  categoryLabel: (entry: FinanceLedgerEntry) => string;
  amountDisplay: (entry: FinanceLedgerEntry) => string;
  liveRate?: number | null;
}): string {
  const { entries, summary, netBalance, meta, labels } = params;
  const liveRate = params.liveRate ?? null;
  const collectedCny = sumSettledCustomerCny(entries);
  const headerBlock = [
    toCsvRow([labels.metaTitle]),
    toCsvRow([labels.hub, meta.hub]),
    toCsvRow([labels.store, meta.store]),
    toCsvRow([labels.tab, meta.tab]),
    toCsvRow([labels.exportedAt, meta.exportedAt]),
    toCsvRow([labels.recordCount, entries.length]),
    toCsvRow([labels.balance, formatFinanceExportAmount(netBalance)]),
    toCsvRow([labels.collected, formatFinanceExportAmount(summary.collectedTotal)]),
    toCsvRow([labels.collectedCny, formatFinanceExportAmount(collectedCny)]),
    toCsvRow([labels.transportUnpaid, formatFinanceExportAmount(summary.transportUnpaidTotal)]),
    toCsvRow([labels.transportPaid, formatFinanceExportAmount(summary.transportPaidTotal)]),
    toCsvRow([labels.pendingInflow, formatFinanceExportAmount(summary.pendingInflowTotal)]),
    toCsvRow([labels.agencyPayable, formatFinanceExportAmount(summary.agencyPayableTotal)]),
    toCsvRow([labels.manualIncome, formatFinanceExportAmount(summary.manualIncomeTotal)]),
    toCsvRow([labels.manualExpense, formatFinanceExportAmount(summary.manualExpenseTotal)]),
    '',
    toCsvRow([
      labels.colTime,
      labels.colCategory,
      labels.colTitle,
      labels.colSubtitle,
      labels.colBarcode,
      labels.colItem,
      labels.colAmount,
      labels.colAmountDisplay,
      labels.colDest,
      labels.colOrigin,
      labels.colFee,
      labels.colPaid,
      labels.colCny,
      labels.colFxRate,
      labels.colPaidCcy,
      labels.colFxLock,
    ]),
  ];
  const dataRows = entries.map((entry) =>
    toCsvRow([
      formatFinanceExportDateTime(entry.occurredAt),
      params.categoryLabel(entry),
      entry.title,
      entry.subtitle,
      entry.barcode,
      entry.itemName,
      entryAmount(entry),
      params.amountDisplay(entry),
      destCell(entry),
      originCell(entry),
      formatFinanceExportAmount(entry.transportFee),
      paidCell(entry, labels),
      entryCny(entry, liveRate),
      entryFxRate(entry, liveRate),
      entryPaidCcy(entry),
      entryFxLock(entry, labels),
    ]),
  );
  return `\uFEFF${[...headerBlock, ...dataRows].join('\n')}`;
}
