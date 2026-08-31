import { regionDisplayLabel } from '../constants/destinationOptions';
import type { TranslationDict } from '../i18n/translations';
import type { FinanceLedgerEntry } from '../types/financeLedger';

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
  paidYes: string;
  paidNo: string;
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
    paidYes: f.csvPaidYes,
    paidNo: f.csvPaidNo,
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

export function buildFinanceExportCsv(params: {
  entries: FinanceLedgerEntry[];
  summary: FinanceExportSummaryBlock;
  netBalance: number;
  meta: FinanceExportMeta;
  labels: FinanceExportLabels;
  categoryLabel: (entry: FinanceLedgerEntry) => string;
  amountDisplay: (entry: FinanceLedgerEntry) => string;
}): string {
  const { entries, summary, netBalance, meta, labels } = params;
  const headerBlock = [
    toCsvRow([labels.metaTitle]),
    toCsvRow([labels.hub, meta.hub]),
    toCsvRow([labels.store, meta.store]),
    toCsvRow([labels.tab, meta.tab]),
    toCsvRow([labels.exportedAt, meta.exportedAt]),
    toCsvRow([labels.recordCount, entries.length]),
    toCsvRow([labels.balance, formatFinanceExportAmount(netBalance)]),
    toCsvRow([labels.collected, formatFinanceExportAmount(summary.collectedTotal)]),
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
    ]),
  );
  return `\uFEFF${[...headerBlock, ...dataRows].join('\n')}`;
}
