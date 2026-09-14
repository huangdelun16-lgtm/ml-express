import { regionDisplayLabel } from '../constants/destinationOptions';
import type { TranslationDict } from '../i18n/translations';
import type { FinanceLedgerEntry } from '../types/financeLedger';
import {
  buildInventoryExcelXlsxBase64,
  type InventoryExcelSheetInput,
} from './inventoryExcelExport';

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
  brand: string;
  summarySheet: string;
  detailSheet: string;
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
  metric: string;
  value: string;
  noteBooks: string;
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
  const hub =
    String(opts.hub || 'HUB')
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
  return `ML-finance-${hub}-${tab}-${stamp}.xlsx`;
}

export function financeExportLabelsFromT(t: TranslationDict): FinanceExportLabels {
  const f = t.crossBorderFinance;
  return {
    metaTitle: f.csvMetaTitle,
    brand: f.excelBrand,
    summarySheet: f.excelSummarySheet,
    detailSheet: f.excelDetailSheet,
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
    metric: f.excelMetric,
    value: f.excelValue,
    noteBooks: f.excelNoteBooks,
  };
}

function entryAmountNum(entry: FinanceLedgerEntry): number | null {
  if (entry.amount != null && Number.isFinite(entry.amount)) return entry.amount;
  if (entry.category === 'transport_cost') {
    const fee = entry.transportFee;
    return fee != null && Number.isFinite(fee) ? fee : null;
  }
  return null;
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

function entryCnyNum(entry: FinanceLedgerEntry, liveRate: number | null): number | null {
  if (!isCustomerLedgerCategory(entry.category)) return null;
  if (entry.paidCny != null && Number.isFinite(entry.paidCny) && entry.paidCny > 0) {
    return entry.paidCny;
  }
  const rate = displayRateForCustomerCategory(entry.category, entry.fxMmkPerCny, liveRate);
  const mmk = entry.amount != null && Number.isFinite(entry.amount) ? entry.amount : null;
  if (mmk == null) return null;
  return mmkToCny(mmk, rate);
}

function entryFxRateNum(entry: FinanceLedgerEntry, liveRate: number | null): number | null {
  if (!isCustomerLedgerCategory(entry.category)) return null;
  return displayRateForCustomerCategory(entry.category, entry.fxMmkPerCny, liveRate);
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

function rowFillForEntry(entry: FinanceLedgerEntry): string | undefined {
  const category = String(entry.category);
  if (
    category === 'order_collected' ||
    category === 'order_prepaid' ||
    category === 'collected'
  ) {
    return 'FFECFDF5';
  }
  if (category === 'order_income_cod' || category === 'pending_inflow') {
    return 'FFFFFBEB';
  }
  if (category === 'transport_cost') {
    return entry.paid ? 'FFEFF6FF' : 'FFFEF2F2';
  }
  if (category === 'agency_remit') return 'FFF5F3FF';
  if (category === 'manual_income') return 'FFF0FDFA';
  if (category === 'manual_expense') return 'FFFDF4FF';
  return undefined;
}

export function buildFinanceExportSheets(params: {
  entries: FinanceLedgerEntry[];
  summary: FinanceExportSummaryBlock;
  netBalance: number;
  meta: FinanceExportMeta;
  labels: FinanceExportLabels;
  categoryLabel: (entry: FinanceLedgerEntry) => string;
  amountDisplay: (entry: FinanceLedgerEntry) => string;
  liveRate?: number | null;
}): InventoryExcelSheetInput[] {
  const { entries, summary, netBalance, meta, labels } = params;
  const liveRate = params.liveRate ?? null;
  const collectedCny = sumSettledCustomerCny(entries);
  const subtitle = [
    `${labels.hub}: ${meta.hub}`,
    `${labels.store}: ${meta.store}`,
    `${labels.tab}: ${meta.tab}`,
    `${labels.exportedAt}: ${meta.exportedAt}`,
  ].join('  ·  ');

  const summaryRows: Array<[string, string | number]> = [
    [labels.hub, meta.hub],
    [labels.store, meta.store],
    [labels.tab, meta.tab],
    [labels.exportedAt, meta.exportedAt],
    [labels.recordCount, entries.length],
    [labels.balance, netBalance],
    [labels.collected, summary.collectedTotal],
    [labels.collectedCny, collectedCny ?? ''],
    [labels.transportUnpaid, summary.transportUnpaidTotal],
    [labels.transportPaid, summary.transportPaidTotal],
    [labels.pendingInflow, summary.pendingInflowTotal],
    [labels.agencyPayable, summary.agencyPayableTotal],
    [labels.manualIncome, summary.manualIncomeTotal],
    [labels.manualExpense, summary.manualExpenseTotal],
    [labels.noteBooks, ''],
  ];

  const detailRows = entries.map((entry) => [
    formatFinanceExportDateTime(entry.occurredAt),
    params.categoryLabel(entry),
    entry.title,
    entry.subtitle,
    entry.barcode,
    entry.itemName,
    entryAmountNum(entry),
    params.amountDisplay(entry),
    destCell(entry),
    originCell(entry),
    entry.transportFee != null && Number.isFinite(entry.transportFee) ? entry.transportFee : null,
    paidCell(entry, labels),
    entryCnyNum(entry, liveRate),
    entryFxRateNum(entry, liveRate),
    entryPaidCcy(entry),
    entryFxLock(entry, labels),
  ]);

  return [
    {
      name: labels.summarySheet,
      title: labels.brand,
      subtitle,
      columns: [
        { header: labels.metric, width: 22 },
        { header: labels.value, width: 28, align: 'right' },
      ],
      rows: summaryRows,
      rowFills: summaryRows.map((_, index) =>
        index === 5 ? 'FFECFDF5' : index === summaryRows.length - 1 ? 'FFF8FAFC' : undefined,
      ),
    },
    {
      name: labels.detailSheet,
      title: labels.metaTitle,
      subtitle,
      columns: [
        { header: labels.colTime, width: 16 },
        { header: labels.colCategory, width: 12 },
        { header: labels.colTitle, width: 14 },
        { header: labels.colSubtitle, width: 22 },
        { header: labels.colBarcode, width: 16 },
        { header: labels.colItem, width: 14 },
        { header: labels.colAmount, width: 12, align: 'right' },
        { header: labels.colAmountDisplay, width: 14 },
        { header: labels.colDest, width: 10 },
        { header: labels.colOrigin, width: 12 },
        { header: labels.colFee, width: 10, align: 'right' },
        { header: labels.colPaid, width: 8, align: 'center' },
        { header: labels.colCny, width: 10, align: 'right' },
        { header: labels.colFxRate, width: 10, align: 'right' },
        { header: labels.colPaidCcy, width: 10, align: 'center' },
        { header: labels.colFxLock, width: 10 },
      ],
      rows: detailRows,
      rowFills: entries.map(rowFillForEntry),
    },
  ];
}

export function buildFinanceExportExcelBase64(params: {
  entries: FinanceLedgerEntry[];
  summary: FinanceExportSummaryBlock;
  netBalance: number;
  meta: FinanceExportMeta;
  labels: FinanceExportLabels;
  categoryLabel: (entry: FinanceLedgerEntry) => string;
  amountDisplay: (entry: FinanceLedgerEntry) => string;
  liveRate?: number | null;
}): string {
  return buildInventoryExcelXlsxBase64(buildFinanceExportSheets(params));
}

/** 兼容测试：正式导出请用 buildFinanceExportExcelBase64 */
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
  const sheets = buildFinanceExportSheets(params);
  const summary = sheets[0];
  const detail = sheets[1];
  const headerBlock = [
    toCsvRow([params.labels.metaTitle]),
    ...summary.rows.slice(0, -1).map((row) => toCsvRow(row)),
    '',
    toCsvRow(detail.columns.map((col) => col.header)),
  ];
  const dataRows = detail.rows.map((row) =>
    toCsvRow(row.map((cell) => (cell == null ? '' : cell))),
  );
  return `\uFEFF${[...headerBlock, ...dataRows].join('\n')}`;
}
