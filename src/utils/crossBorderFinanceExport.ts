import type { CrossBorderExpenseRow, CrossBorderFinanceSummary } from '../services/inventoryConsoleService';

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

export function buildHqFinanceExportCsv(params: {
  entries: CrossBorderExpenseRow[];
  summary?: CrossBorderFinanceSummary | null;
  periodLabel: string;
  stationLabel: string;
  isEn: boolean;
}): string {
  const { entries, summary, periodLabel, stationLabel, isEn } = params;
  const h = isEn
    ? {
        title: 'Cross-border finance export',
        period: 'Period (Asia/Yangon)',
        station: 'Station',
        time: 'Time',
        type: 'Type',
        detail: 'Note',
        amount: 'Amount',
        status: 'Status',
        collected: 'Collected',
        pending: 'Pending inflow',
        unpaid: 'Unpaid truck',
        paid: 'Paid truck',
        remit: 'Agency remitted',
      }
    : {
        title: '跨境财务导出',
        period: '期间（Asia/Yangon）',
        station: '站点',
        time: '时间',
        type: '类型',
        detail: '说明',
        amount: '金额',
        status: '状态',
        collected: '已收',
        pending: '待入账',
        unpaid: '待付车费',
        paid: '已付车费',
        remit: '已汇发站',
      };
  const header = [
    toCsvRow([h.title]),
    toCsvRow([h.period, periodLabel]),
    toCsvRow([h.station, stationLabel]),
    toCsvRow([h.collected, summary?.collectedTotal ?? '']),
    toCsvRow([h.pending, summary?.pendingInflowTotal ?? '']),
    toCsvRow([h.unpaid, summary?.transportUnpaidTotal ?? '']),
    toCsvRow([h.paid, summary?.transportPaidTotal ?? '']),
    toCsvRow([h.remit, summary?.agencyRemittedTotal ?? '']),
    '',
    toCsvRow([h.time, h.type, h.detail, h.station, h.amount, h.status]),
  ];
  const rows = entries.map((row) =>
    toCsvRow([
      formatWhen(row.occurredAt),
      row.title,
      row.subtitle,
      `${row.stationCode} ${row.stationName}`.trim(),
      row.amount,
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
