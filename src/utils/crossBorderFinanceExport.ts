import type { Workbook, Worksheet } from 'exceljs';
import type {
  CrossBorderExpenseCategory,
  CrossBorderExpenseRow,
  CrossBorderFinanceSummary,
} from '../services/inventoryConsoleService';
import {
  displayRateForCustomerCategory,
  isCustomerLedgerCategory,
  isSettledCustomerCategory,
  resolveCustomerFeeCny,
} from './crossBorderFx';

type ExportParams = {
  entries: CrossBorderExpenseRow[];
  summary?: CrossBorderFinanceSummary | null;
  periodLabel: string;
  stationLabel: string;
  isEn: boolean;
  liveRate?: number | null;
};

type ExportLabels = {
  title: string;
  brand: string;
  summarySheet: string;
  detailSheet: string;
  period: string;
  station: string;
  generated: string;
  tz: string;
  time: string;
  type: string;
  detail: string;
  amount: string;
  cny: string;
  fxRate: string;
  paidCcy: string;
  fxLock: string;
  status: string;
  collected: string;
  collectedCny: string;
  pending: string;
  unpaid: string;
  paid: string;
  remit: string;
  manualIn: string;
  manualOut: string;
  locked: string;
  live: string;
  legacy: string;
  total: string;
  noteBooks: string;
  noteFx: string;
  noteTruck: string;
  legend: string;
};

const XL_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  left: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  right: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
};

const CAT_FILL: Record<CrossBorderExpenseCategory, string> = {
  collected: 'FFECFDF5',
  pending_inflow: 'FFFFFBEB',
  transport_unpaid: 'FFFEF2F2',
  transport_paid: 'FFEFF6FF',
  agency_remit: 'FFECFEFF',
  manual_income: 'FFF0FDF4',
  manual_expense: 'FFFFF1F2',
};

function exportLabels(isEn: boolean): ExportLabels {
  return isEn
    ? {
        title: 'Cross-border finance export',
        brand: 'MARKET LINK · Cross-border finance',
        summarySheet: 'Summary',
        detailSheet: 'Ledger',
        period: 'Period (Asia/Yangon)',
        station: 'Station',
        generated: 'Exported at',
        tz: 'Asia/Yangon',
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
        manualIn: 'Other income',
        manualOut: 'Other expense',
        locked: 'Locked',
        live: 'Live',
        legacy: 'Legacy MMK',
        total: 'Total',
        noteBooks: 'Customer CNY and Myanmar MMK are separate books. Do not add them together.',
        noteFx: 'Collected uses the locked rate. Pending inflow uses the live rate at export.',
        noteTruck: 'Truck fees stay in MMK and are not converted to CNY.',
        legend: 'Row tint = type: green collected / amber pending / red unpaid / blue paid.',
      }
    : {
        title: '跨境财务导出',
        brand: 'MARKET LINK · 跨境财务',
        summarySheet: '汇总',
        detailSheet: '明细',
        period: '期间（Asia/Yangon）',
        station: '站点',
        generated: '导出时间',
        tz: 'Asia/Yangon',
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
        manualIn: '其它收入',
        manualOut: '其它支出',
        locked: '锁定',
        live: '活汇率',
        legacy: '旧单无锁',
        total: '合计',
        noteBooks: '客户账人民币与缅甸开销缅币分列，不要互相加总。',
        noteFx: '已收用锁定汇率；待入账用导出时的活汇率。',
        noteTruck: '车费只记缅币，不折人民币。',
        legend: '行底色=类型：绿已收 / 黄待入账 / 红待付 / 蓝已付。',
      };
}

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

function rowCnyNum(row: CrossBorderExpenseRow, liveRate: number | null): number | null {
  if (!isCustomerLedgerCategory(row.category)) return null;
  const cny = resolveCustomerFeeCny({
    category: row.category,
    mmk: row.amount,
    lockedRate: row.fxMmkPerCny,
    paidCny: row.paidCny,
    liveRate,
  });
  return cny == null || !Number.isFinite(cny) ? null : cny;
}

function rowFxRateNum(row: CrossBorderExpenseRow, liveRate: number | null): number | null {
  if (!isCustomerLedgerCategory(row.category)) return null;
  const rate = displayRateForCustomerCategory(row.category, row.fxMmkPerCny, liveRate);
  return rate == null || !Number.isFinite(rate) ? null : rate;
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

export function buildHqFinanceExportCsv(params: ExportParams): string {
  const { entries, summary, periodLabel, stationLabel, isEn } = params;
  const liveRate = params.liveRate ?? null;
  const h = exportLabels(isEn);
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
      formatAmount(rowCnyNum(row, liveRate)),
      formatAmount(rowFxRateNum(row, liveRate)),
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

function paintFill(cell: import('exceljs').Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function styleTitle(ws: Worksheet, row: number, cols: number, text: string) {
  ws.mergeCells(row, 1, row, cols);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  paintFill(cell, 'FF0F172A');
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(row).height = 34;
}

function styleMeta(cell: import('exceljs').Cell, value: string, muted = false) {
  cell.value = value;
  cell.font = {
    name: 'Calibri',
    size: 10,
    bold: !muted,
    color: { argb: muted ? 'FF64748B' : 'FF334155' },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

function styleKpiLabel(cell: import('exceljs').Cell, value: string) {
  cell.value = value;
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF64748B' } };
  paintFill(cell, 'FFF8FAFC');
  cell.border = XL_BORDER;
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
}

function styleKpiValue(cell: import('exceljs').Cell, value: number | string, kind: 'mmk' | 'cny' | 'text') {
  cell.value = value;
  cell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  paintFill(cell, 'FFFFFFFF');
  cell.border = XL_BORDER;
  cell.alignment = { vertical: 'middle', horizontal: kind === 'text' ? 'left' : 'right' };
  if (kind === 'mmk') cell.numFmt = '#,##0';
  if (kind === 'cny') cell.numFmt = '#,##0.00';
}

function styleHeaderCell(cell: import('exceljs').Cell, value: string) {
  cell.value = value;
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  paintFill(cell, 'FF0F766E');
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = XL_BORDER;
}

function styleBodyCell(
  cell: import('exceljs').Cell,
  value: string | number | null,
  opts: { fill: string; align?: 'left' | 'center' | 'right'; numFmt?: string },
) {
  cell.value = value == null || value === '' ? '' : value;
  cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
  cell.alignment = { vertical: 'middle', horizontal: opts.align ?? 'left', wrapText: true };
  if (opts.numFmt && value != null && value !== '') cell.numFmt = opts.numFmt;
  paintFill(cell, opts.fill);
  cell.border = XL_BORDER;
}

function applyPrint(ws: Worksheet, landscape: boolean) {
  ws.pageSetup = {
    orientation: landscape ? 'landscape' : 'portrait',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.55, bottom: 0.45, header: 0.2, footer: 0.2 },
  };
  ws.headerFooter = {
    oddHeader: '&LMarket Link Express&C&B跨境财务 / Cross-border finance&RAsia/Yangon',
    oddFooter: '&L&F&C&P / &N&RInternal',
  };
}

function buildSummarySheet(wb: Workbook, params: ExportParams, labels: ExportLabels, generatedAt: string) {
  const ws = wb.addWorksheet(labels.summarySheet, {
    properties: { defaultRowHeight: 22, tabColor: { argb: 'FF0F172A' } },
    views: [{ showGridLines: false }],
  });
  ws.columns = [{ width: 22 }, { width: 18 }, { width: 22 }, { width: 18 }];
  styleTitle(ws, 1, 4, labels.brand);
  ws.mergeCells(2, 1, 2, 4);
  styleMeta(ws.getCell(2, 1), `${labels.period}  ${params.periodLabel}`);
  ws.mergeCells(3, 1, 3, 4);
  styleMeta(ws.getCell(3, 1), `${labels.station}  ${params.stationLabel}    ${labels.tz}`);
  ws.mergeCells(4, 1, 4, 4);
  styleMeta(ws.getCell(4, 1), `${labels.generated}  ${generatedAt}`, true);

  const summary = params.summary;
  const kpis: Array<{ label: string; value: number | string; kind: 'mmk' | 'cny' | 'text' }> = [
    { label: labels.collected, value: summary?.collectedTotal ?? 0, kind: 'mmk' },
    { label: labels.collectedCny, value: summary?.collectedCny ?? '', kind: summary?.collectedCny == null ? 'text' : 'cny' },
    { label: labels.pending, value: summary?.pendingInflowTotal ?? 0, kind: 'mmk' },
    { label: labels.unpaid, value: summary?.transportUnpaidTotal ?? 0, kind: 'mmk' },
    { label: labels.paid, value: summary?.transportPaidTotal ?? 0, kind: 'mmk' },
    { label: labels.remit, value: summary?.agencyRemittedTotal ?? 0, kind: 'mmk' },
    { label: labels.manualIn, value: summary?.manualIncomeTotal ?? 0, kind: 'mmk' },
    { label: labels.manualOut, value: summary?.manualExpenseTotal ?? 0, kind: 'mmk' },
  ];

  let row = 6;
  for (let i = 0; i < kpis.length; i += 2) {
    const left = kpis[i];
    const right = kpis[i + 1];
    styleKpiLabel(ws.getCell(row, 1), left.label);
    styleKpiValue(ws.getCell(row, 2), left.value, left.kind);
    if (right) {
      styleKpiLabel(ws.getCell(row, 3), right.label);
      styleKpiValue(ws.getCell(row, 4), right.value, right.kind);
    }
    ws.getRow(row).height = 28;
    row += 1;
  }

  row += 1;
  [labels.noteBooks, labels.noteFx, labels.noteTruck, labels.legend].forEach((line, index) => {
    ws.mergeCells(row + index, 1, row + index, 4);
    const cell = ws.getCell(row + index, 1);
    cell.value = line;
    cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };
    cell.alignment = { wrapText: true, vertical: 'middle' };
    ws.getRow(row + index).height = 20;
  });

  applyPrint(ws, false);
}

function buildDetailSheet(wb: Workbook, params: ExportParams, labels: ExportLabels) {
  const liveRate = params.liveRate ?? null;
  const ws = wb.addWorksheet(labels.detailSheet, {
    properties: { defaultRowHeight: 20, tabColor: { argb: 'FF0F766E' } },
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
  });
  ws.columns = [
    { width: 18 },
    { width: 22 },
    { width: 36 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];

  styleTitle(ws, 1, 10, labels.brand);
  ws.mergeCells(2, 1, 2, 10);
  styleMeta(ws.getCell(2, 1), `${params.periodLabel}  ·  ${params.stationLabel}  ·  ${labels.tz}`);
  ws.mergeCells(3, 1, 3, 10);
  styleMeta(ws.getCell(3, 1), labels.noteFx, true);

  const headers = [
    labels.time,
    labels.type,
    labels.detail,
    labels.station,
    labels.amount,
    labels.cny,
    labels.fxRate,
    labels.paidCcy,
    labels.fxLock,
    labels.status,
  ];
  headers.forEach((title, index) => styleHeaderCell(ws.getCell(4, index + 1), title));
  ws.getRow(4).height = 24;

  params.entries.forEach((entry, index) => {
    const excelRow = 5 + index;
    const fill = CAT_FILL[entry.category] || 'FFFFFFFF';
    const cny = rowCnyNum(entry, liveRate);
    const rate = rowFxRateNum(entry, liveRate);
    const values: Array<{
      value: string | number | null;
      align?: 'left' | 'center' | 'right';
      numFmt?: string;
    }> = [
      { value: formatWhen(entry.occurredAt) },
      { value: entry.title },
      { value: entry.subtitle },
      { value: `${entry.stationCode} ${entry.stationName}`.trim() },
      { value: entry.amount, align: 'right', numFmt: '#,##0.00' },
      { value: cny, align: 'right', numFmt: '#,##0.00' },
      { value: rate, align: 'right', numFmt: '#,##0.00' },
      { value: rowPaidCcy(entry), align: 'center' },
      { value: rowFxLock(entry, labels), align: 'center' },
      { value: entry.statusLabel, align: 'center' },
    ];
    values.forEach((item, col) => {
      styleBodyCell(ws.getCell(excelRow, col + 1), item.value, {
        fill,
        align: item.align,
        numFmt: item.numFmt,
      });
    });
    ws.getRow(excelRow).height = 20;
  });

  const firstData = 5;
  const lastData = 4 + params.entries.length;
  const totalRow = lastData + 1;
  if (params.entries.length > 0) {
    for (let col = 1; col <= 10; col += 1) {
      const cell = ws.getCell(totalRow, col);
      paintFill(cell, 'FF0F172A');
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = XL_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: col >= 5 && col <= 6 ? 'right' : 'left' };
    }
    ws.getCell(totalRow, 1).value = labels.total;
    ws.getCell(totalRow, 5).value = { formula: `SUM(E${firstData}:E${lastData})` };
    ws.getCell(totalRow, 5).numFmt = '#,##0.00';
    ws.getCell(totalRow, 6).value = { formula: `SUM(F${firstData}:F${lastData})` };
    ws.getCell(totalRow, 6).numFmt = '#,##0.00';
    ws.getRow(totalRow).height = 24;
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: lastData, column: 10 } };
  }

  applyPrint(ws, true);
}

export async function buildHqFinanceExportWorkbook(params: ExportParams): Promise<Workbook> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Market Link Express';
  wb.lastModifiedBy = 'ML Admin';
  wb.created = new Date();
  wb.modified = new Date();
  const labels = exportLabels(params.isEn);
  const generatedAt = new Date().toLocaleString(params.isEn ? 'en-GB' : 'zh-CN', { hour12: false });
  buildSummarySheet(wb, params, labels, generatedAt);
  buildDetailSheet(wb, params, labels);
  return wb;
}

export async function downloadHqFinanceExcel(filename: string, params: ExportParams): Promise<void> {
  const wb = await buildHqFinanceExportWorkbook(params);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
