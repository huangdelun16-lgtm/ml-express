import type { Workbook, Worksheet } from 'exceljs';

export type ProxyPurchaseStatus = 'pending' | 'receive';

export type ProxyPurchaseRow = {
  id: string;
  customerName: string;
  orderDate: string;
  address: string;
  phone: string;
  platform: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  /** pending · receive（旧数据 received 视为 receive） */
  status?: ProxyPurchaseStatus;
};

export function normalizeProxyPurchaseStatus(raw: unknown): ProxyPurchaseStatus {
  if (raw === 'receive' || raw === 'received') return 'receive';
  return 'pending';
}

export function proxyPurchaseStatusLabel(
  status: ProxyPurchaseStatus,
  _language: 'zh' | 'en' | 'my' = 'zh',
): string {
  return status === 'receive' ? 'receive' : 'pending';
}

export function rowHasExportContent(row: ProxyPurchaseRow): boolean {
  return Boolean(
    row.customerName.trim() ||
      row.productName.trim() ||
      row.platform.trim() ||
      parseNum(row.unitPrice) > 0 ||
      parseNum(row.quantity) > 0,
  );
}

function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcProxyFee(unitPrice: number, feePercent: number): number {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(feePercent)) return 0;
  return round2(unitPrice * (feePercent / 100));
}

export function calcLineTotalRmb(unitPrice: number, feePercent: number): number {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return 0;
  return round2(unitPrice + calcProxyFee(unitPrice, feePercent));
}

const XL_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  left: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  right: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
};

function formatExcelDate(isoDate: string): string {
  if (!isoDate?.trim()) return '';
  const d = new Date(`${isoDate.trim()}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return isoDate.trim();
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

async function downloadExcelWorkbook(wb: Workbook, filename: string): Promise<void> {
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

function sanitizeFilenamePart(s: string): string {
  const x = (s || 'list').replace(/[/\\?*:[\]"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 60);
  return x || 'list';
}

function styleMergedBanner(
  ws: Worksheet,
  row: number,
  colSpan: number,
  value: string,
  opts: { bg: string; color: string; size: number; bold?: boolean; height?: number },
) {
  ws.mergeCells(row, 1, row, colSpan);
  const cell = ws.getCell(row, 1);
  cell.value = value;
  cell.font = {
    name: 'Calibri',
    size: opts.size,
    bold: opts.bold ?? false,
    color: { argb: opts.color },
  };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  if (opts.height) ws.getRow(row).height = opts.height;
}

const MYANMAR_SCRIPT_RE = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;

/** Apple system Myanmar font; Android Excel substitutes Noto Sans Myanmar when absent. */
const MYANMAR_EXCEL_FONT = 'Myanmar Sangam MN';

function hasMyanmarScript(text: string): boolean {
  return MYANMAR_SCRIPT_RE.test(text);
}

type ScriptRun = { text: string; myanmar: boolean };

function splitByMyanmarScript(text: string): ScriptRun[] {
  if (!text) return [];
  const runs: ScriptRun[] = [];
  let buf = '';
  let isMyanmar: boolean | null = null;

  for (const char of text) {
    const my = hasMyanmarScript(char);
    if (isMyanmar === null) {
      isMyanmar = my;
      buf = char;
      continue;
    }
    if (my === isMyanmar) {
      buf += char;
    } else {
      runs.push({ text: buf, myanmar: isMyanmar });
      buf = char;
      isMyanmar = my;
    }
  }
  if (buf) runs.push({ text: buf, myanmar: isMyanmar ?? false });
  return runs;
}

function buildProductCellValue(productName: string): string | import('exceljs').CellRichTextValue {
  const text = productName.trim();
  if (!text) return '';
  if (!hasMyanmarScript(text)) return text;

  const runs = splitByMyanmarScript(text);
  return {
    richText: runs.map((run) => ({
      text: run.text,
      font: {
        name: run.myanmar ? MYANMAR_EXCEL_FONT : 'Calibri',
        size: run.myanmar ? 11 : 10.5,
        color: { argb: 'FF0F172A' },
      },
    })),
  };
}

const DATA_ROW_HEIGHT = 32;

function applyDataCellStyle(
  cell: import('exceljs').Cell,
  colNumber: number,
  stripe: 'even' | 'odd',
  kind: 'text' | 'product' | 'money' | 'fee' | 'total' | 'index' | 'qty' | 'platform' | 'status',
  productText?: string,
  status?: ProxyPurchaseStatus,
) {
  cell.border = XL_BORDER;
  const stripeBg = stripe === 'odd' ? 'FFF8FAFC' : 'FFFFFFFF';
  let bg = stripeBg;
  let align: 'left' | 'center' | 'right' = 'left';
  let vertical: 'middle' | 'top' = 'middle';
  let wrap = false;

  if (kind === 'index' || kind === 'qty') align = 'center';
  if (kind === 'money' || kind === 'fee' || kind === 'total') align = 'right';
  if (kind === 'product') {
    align = 'left';
    vertical = 'middle';
    wrap = true;
    bg = stripe === 'odd' ? 'FFF0F9FF' : 'FFF8FAFC';
  }
  if (kind === 'platform') align = 'center';
  if (kind === 'status') align = 'center';
  if (kind === 'fee') bg = stripe === 'odd' ? 'FFFFFBEB' : 'FFFEFCE8';
  if (kind === 'total') bg = stripe === 'odd' ? 'FFECFDF5' : 'FFF0FDF4';
  if (kind === 'status') {
    const isReceive = status === 'receive';
    bg = isReceive
      ? stripe === 'odd'
        ? 'FFD1FAE5'
        : 'FFECFDF5'
      : stripe === 'odd'
        ? 'FFFEF9C3'
        : 'FFFFFBEB';
  }

  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.alignment = { vertical, horizontal: align, wrapText: wrap };
  const productBurmese = kind === 'product' && productText ? hasMyanmarScript(productText) : false;
  if (!(kind === 'product' && productBurmese)) {
    const statusColor =
      kind === 'status' ? (status === 'receive' ? 'FF047857' : 'FFB45309') : undefined;
    cell.font = {
      name: 'Calibri',
      size: kind === 'product' ? 10.5 : 11,
      color: {
        argb: statusColor ?? (kind === 'total' ? 'FF047857' : 'FF0F172A'),
      },
      bold: kind === 'total' || kind === 'status',
    };
  }

  if (kind === 'money' || kind === 'fee' || kind === 'total') {
    cell.numFmt = '¥#,##0.00';
  }
  if (kind === 'index') {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF475569' } };
  }
}

export async function exportProxyPurchaseExcel(opts: {
  rows: ProxyPurchaseRow[];
  proxyFeePercent: number;
  exchangeRate: number;
  filenameHint?: string;
}): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ML Express Admin';
  wb.created = new Date();

  const COL_COUNT = 12;
  const feePct = Number.isFinite(opts.proxyFeePercent) ? opts.proxyFeePercent : 5;
  const rate = Number.isFinite(opts.exchangeRate) ? opts.exchangeRate : 595;

  const exportRows = opts.rows.filter(rowHasExportContent);
  if (exportRows.length === 0) {
    throw new Error('NO_ROWS');
  }

  const PRODUCT_COL_WIDTH = 52;

  const ws = wb.addWorksheet('supplier', {
    views: [{ state: 'frozen', ySplit: 4, activeCell: 'G5' }],
    properties: { defaultRowHeight: DATA_ROW_HEIGHT },
  });

  ws.columns = [
    { width: 7 },
    { width: 14 },
    { width: 11 },
    { width: 12 },
    { width: 13 },
    { width: 12 },
    { width: PRODUCT_COL_WIDTH },
    { width: 8 },
    { width: 12 },
    { width: 14 },
    { width: 13 },
    { width: 12 },
  ];

  styleMergedBanner(ws, 1, COL_COUNT, 'MARKET LINK · 代购清单', {
    bg: 'FF0F172A',
    color: 'FFFFFFFF',
    size: 18,
    bold: true,
    height: 42,
  });

  const firstCustomer = exportRows.find((r) => r.customerName.trim())?.customerName.trim() || '—';
  const generatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
  styleMergedBanner(
    ws,
    2,
    COL_COUNT,
    `客户 Customer: ${firstCustomer}    |    代购费 Proxy fee: ${feePct}%    |    汇率 Rate: 1 RMB = ${rate.toLocaleString()} MMK    |    导出 ${generatedAt}`,
    {
      bg: 'FFDBEAFE',
      color: 'FF1E3A8A',
      size: 11,
      height: 30,
    },
  );

  styleMergedBanner(ws, 3, COL_COUNT, `共 ${exportRows.length} 条记录 · ${exportRows.length} item(s) exported`, {
    bg: 'FFF1F5F9',
    color: 'FF64748B',
    size: 10,
    height: 22,
  });

  const headers = [
    '序号 No.',
    '客户姓名 Customer Name',
    '下单日期 Order Date',
    '地址 Address',
    '联系电话 Contact Phone',
    '购物平台 Shopping Platform',
    '商品名称 Product Name',
    '数量 Quantity',
    '单价 (¥) Unit Price',
    `代购费 (${feePct}%) Proxy Fee`,
    '合计 Total (¥)',
    '状态 Status',
  ];

  const headerRow = ws.getRow(4);
  headerRow.height = 40;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    const isProductCol = i === 6;
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isProductCol ? 'FF1D4ED8' : 'FF2563EB' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = XL_BORDER;
  });

  let grandTotal = 0;
  exportRows.forEach((row, idx) => {
    const unitPrice = parseNum(row.unitPrice);
    const fee = calcProxyFee(unitPrice, feePct);
    const total = calcLineTotalRmb(unitPrice, feePct);
    grandTotal += total;
    const stripe: 'even' | 'odd' = idx % 2 === 0 ? 'even' : 'odd';

    const productName = row.productName.trim();
    const rowStatus = normalizeProxyPurchaseStatus(row.status);
    const r = ws.addRow([
      idx + 1,
      row.customerName.trim(),
      formatExcelDate(row.orderDate),
      row.address.trim(),
      row.phone.trim(),
      row.platform.trim(),
      productName,
      parseNum(row.quantity) || '',
      unitPrice || '',
      fee || '',
      total || '',
      proxyPurchaseStatusLabel(rowStatus, 'zh'),
    ]);
    r.height = DATA_ROW_HEIGHT;

    const productCell = r.getCell(7);
    productCell.value = buildProductCellValue(productName);

    r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber === 1) applyDataCellStyle(cell, colNumber, stripe, 'index');
      else if (colNumber === 6) applyDataCellStyle(cell, colNumber, stripe, 'platform');
      else if (colNumber === 7) applyDataCellStyle(cell, colNumber, stripe, 'product', productName);
      else if (colNumber === 8) applyDataCellStyle(cell, colNumber, stripe, 'qty');
      else if (colNumber === 9) applyDataCellStyle(cell, colNumber, stripe, 'money');
      else if (colNumber === 10) applyDataCellStyle(cell, colNumber, stripe, 'fee');
      else if (colNumber === 11) applyDataCellStyle(cell, colNumber, stripe, 'total');
      else if (colNumber === 12) applyDataCellStyle(cell, colNumber, stripe, 'status', undefined, rowStatus);
      else applyDataCellStyle(cell, colNumber, stripe, 'text');
    });
  });

  const summaryRowNum = ws.rowCount + 2;
  const summaryRow = ws.getRow(summaryRowNum);
  summaryRow.height = 28;

  ws.mergeCells(summaryRowNum, 1, summaryRowNum, 7);
  const noteCell = summaryRow.getCell(1);
  noteCell.value = '合计 Summary';
  noteCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } };
  noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  noteCell.alignment = { vertical: 'middle', horizontal: 'right' };
  noteCell.border = XL_BORDER;

  for (let c = 8; c <= 9; c += 1) {
    const cell = summaryRow.getCell(c);
    cell.border = XL_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  }

  const rateCell = summaryRow.getCell(10);
  rateCell.value = `1RMB = ${rate} MMK`;
  rateCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF854D0E' } };
  rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB3B' } };
  rateCell.alignment = { vertical: 'middle', horizontal: 'center' };
  rateCell.border = XL_BORDER;

  const totalCell = summaryRow.getCell(11);
  totalCell.value = round2(grandTotal);
  totalCell.numFmt = '¥#,##0.00';
  totalCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF065F46' } };
  totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB3B' } };
  totalCell.alignment = { vertical: 'middle', horizontal: 'center' };
  totalCell.border = XL_BORDER;

  const mmkRowNum = summaryRowNum + 1;
  ws.mergeCells(mmkRowNum, 1, mmkRowNum, 7);
  const mmkLabel = ws.getCell(mmkRowNum, 1);
  mmkLabel.value = '约合缅币 Total (MMK)';
  mmkLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } };
  mmkLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  mmkLabel.alignment = { vertical: 'middle', horizontal: 'right' };
  mmkLabel.border = XL_BORDER;

  for (let c = 8; c <= 9; c += 1) {
    const cell = ws.getRow(mmkRowNum).getCell(c);
    cell.border = XL_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  }

  const mmkCell = ws.getCell(mmkRowNum, 11);
  mmkCell.value = Math.round(grandTotal * rate);
  mmkCell.numFmt = '#,##0';
  mmkCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF065F46' } };
  mmkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  mmkCell.alignment = { vertical: 'middle', horizontal: 'center' };
  mmkCell.border = XL_BORDER;
  ws.getRow(mmkRowNum).height = 26;

  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const hint = sanitizeFilenamePart(opts.filenameHint || firstCustomer || 'supplier');
  await downloadExcelWorkbook(wb, `代购清单_${hint}_${stamp}.xlsx`);
}
