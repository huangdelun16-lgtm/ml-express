import type { CrossBorderExpenseRow, CrossBorderFinanceSummary } from '../services/inventoryConsoleService';
import {
  displayRateForCustomerCategory,
  isCustomerLedgerCategory,
  isSettledCustomerCategory,
  resolveCustomerFeeCny,
} from './crossBorderFx';

function escapeCsvCell(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || '';
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatAmount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function rowCny(row: CrossBorderExpenseRow, liveRate: number | null): string {
  if (!isCustomerLedgerCategory(row.category)) return '';
  const cny = resolveCustomerFeeCny({
    category: row.category,
    mmk: row.amount,
    lockedRate: row.fxMmkPerCny,
    paidCny: row.paidCny,
    liveRate,
  });
  return formatAmount(cny);
}

function rowFxRate(row: CrossBorderExpenseRow, liveRate: number | null): string {
  if (!isCustomerLedgerCategory(row.category)) return '';
  const rate = displayRateForCustomerCategory(row.category, row.fxMmkPerCny, liveRate);
  return formatAmount(rate);
}

function rowPaidCcy(row: CrossBorderExpenseRow): string {
  if (!isCustomerLedgerCategory(row.category)) return '';
  return row.paidCurrency || '';
}

function rowFxLock(
  row: CrossBorderExpenseRow,
  labels: { locked: string; live: string; legacy: string },
): string {
  if (!isCustomerLedgerCategory(row.category)) return '';
  if (isSettledCustomerCategory(row.category)) {
    return row.fxMmkPerCny || (row.paidCny != null && row.paidCny > 0)
      ? labels.locked
      : labels.legacy;
  }
  return labels.live;
}

export function buildHqFinanceExportCsv(params: {
  entries: CrossBorderExpenseRow[];
  summary?: CrossBorderFinanceSummary | null;
  periodLabel: string;
  stationLabel: string;
  isEn: boolean;
  liveRate?: number | null;
}): string {
  const { entries, summary, periodLabel, stationLabel, isEn } = params;
  const liveRate = params.liveRate ?? null;
  const h = isEn
    ? {
        title: 'Cross-border finance export',
        period: 'Period (Asia/Yangon)',
        station: 'Station',
        time: 'Time',
        type: 'Type',
        detail: 'Note',
        amount: 'Amount MMK',
        cny: 'CNY',
        fxRate: 'FX rate',
        paidCcy: 'Paid currency',
        fxLock: 'FX status',
        status: 'Status',
        collected: 'Collected MMK',
        collectedCny: 'Collected CNY',
        pending: 'Pending inflow',
        unpaid: 'Unpaid truck',
        paid: 'Paid truck',
        remit: 'Agency remitted',
        locked: 'Locked',
        live: 'Live',
        legacy: 'Legacy MMK',
      }
    : {
        title: '跨境财务导出',
        period: '期间（Asia/Yangon）',
        station: '站点',
        time: '时间',
        type: '类型',
        detail: '说明',
        amount: '金额MMK',
        cny: '人民币',
        fxRate: '汇率',
        paidCcy: '实收币种',
        fxLock: '汇率状态',
        status: '状态',
        collected: '已收MMK',
        collectedCny: '已收人民币',
        pending: '待入账',
        unpaid: '待付车费',
        paid: '已付车费',
        remit: '已汇发站',
        locked: '锁定',
        live: '活汇率',
        legacy: '旧单无锁',
      };
  const header = [
    toCsvRow([h.title]),
    toCsvRow([h.period, periodLabel]),
    toCsvRow([h.station, stationLabel]),
    toCsvRow([h.collected, summary?.collectedTotal ?? '']),
    toCsvRow([h.collectedCny, formatAmount(summary?.collectedCny)]),
    toCsvRow([h.pending, summary?.pendingInflowTotal ?? '']),
    toCsvRow([h.unpaid, summary?.transportUnpaidTotal ?? '']),
    toCsvRow([h.paid, summary?.transportPaidTotal ?? '']),
    toCsvRow([h.remit, summary?.agencyRemittedTotal ?? '']),
    '',
    toCsvRow([h.time, h.type, h.detail, h.station, h.amount, h.cny, h.fxRate, h.paidCcy, h.fxLock, h.status]),
  ];
  const rows = entries.map((row) =>
    toCsvRow([
      formatWhen(row.occurredAt),
      row.title,
      row.subtitle,
      `${row.stationCode} ${row.stationName}`.trim(),
      row.amount,
      rowCny(row, liveRate),
      rowFxRate(row, liveRate),
      rowPaidCcy(row),
      rowFxLock(row, h),
      row.statusLabel,
    ]),
  );
  return `\uFEFF${[...header, ...rows].join('\n')}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
