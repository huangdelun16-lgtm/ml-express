import type { Workbook } from 'exceljs';

export type ProxyQuoteRow = {
  id: string;
  quoteDate: string;
  productName: string;
  productImageDataUrl: string;
  productImageName: string;
  quantity: string;
  unitPrice: string;
};

const XL_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  left: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  right: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
};

const IMAGE_COL = 4;
const THUMB_PX = 72;
const ROW_PT = 58;

function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sanitizeFilenamePart(s: string): string {
  const x = (s || 'quote').replace(/[/\\?*:[\]"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 60);
  return x || 'quote';
}

function formatExcelDate(isoDate: string): string {
  if (!isoDate?.trim()) return '';
  const d = new Date(`${isoDate.trim()}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return isoDate.trim();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function styleHeaderCell(cell: import('exceljs').Cell, value: string) {
  cell.value = value;
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = XL_BORDER;
}

function styleBodyCell(
  cell: import('exceljs').Cell,
  value: string | number,
  opts?: { align?: 'left' | 'center' | 'right'; alt?: boolean; numFmt?: string },
) {
  cell.value = value;
  cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
  cell.alignment = {
    vertical: 'middle',
    horizontal: opts?.align ?? 'left',
    wrapText: true,
  };
  if (opts?.numFmt) cell.numFmt = opts.numFmt;
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: opts?.alt ? 'FFF1F5F9' : 'FFFFFFFF' },
  };
  cell.border = XL_BORDER;
}

async function dataUrlToExcelEmbeddedPng(dataUrl: string): Promise<{ base64: string; extension: 'png' }> {
  if (!dataUrl.startsWith('data:image/')) throw new Error('bad image data');
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = 480;
        const w0 = img.naturalWidth || img.width || 1;
        const h0 = img.naturalHeight || img.height || 1;
        const scale = Math.min(1, maxSide / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * scale));
        const h = Math.max(1, Math.round(h0 * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL('image/png');
        const m = out.match(/^data:image\/png;base64,(.+)$/);
        if (!m?.[1]) {
          reject(new Error('png encode'));
          return;
        }
        resolve({ base64: m[1], extension: 'png' });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('image load'));
    img.src = dataUrl;
  });
}

export function rowHasQuoteContent(row: ProxyQuoteRow): boolean {
  return Boolean(
    row.productName.trim() ||
      row.quantity.trim() ||
      row.unitPrice.trim() ||
      row.productImageDataUrl.trim(),
  );
}

export async function exportProxyQuoteExcel(opts: {
  rows: ProxyQuoteRow[];
  customerName?: string;
  note?: string;
}): Promise<void> {
  const rows = opts.rows.filter(rowHasQuoteContent);
  if (rows.length === 0) throw new Error('empty');

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ML Express Admin';
  const ws = wb.addWorksheet('代购报价', {
    views: [{ state: 'frozen', ySplit: 4 }],
    properties: { defaultRowHeight: 22 },
  });

  const COL_COUNT = 7;
  const customer = opts.customerName?.trim() || '客户';
  const generatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
  const stamp = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;

  ws.mergeCells(1, 1, 1, COL_COUNT);
  const title = ws.getCell(1, 1);
  title.value = 'MARKET LINK · 代购报价表';
  title.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 36;

  ws.mergeCells(2, 1, 2, COL_COUNT);
  const sub = ws.getCell(2, 1);
  sub.value = `客户 Customer: ${customer}    |    导出 ${generatedAt}${opts.note?.trim() ? `    |    ${opts.note.trim()}` : ''}`;
  sub.font = { name: 'Calibri', size: 11, color: { argb: 'FF334155' } };
  sub.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws.getRow(2).height = 22;

  const headerRow = ws.getRow(4);
  headerRow.height = 24;
  ['序号', '日期', '货物名称', '产品图片', '个数', '单价 (¥)', '小计 (¥)'].forEach((label, idx) => {
    styleHeaderCell(headerRow.getCell(idx + 1), label);
  });

  let total = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const excelRow = ws.getRow(5 + i);
    const qty = parseNum(row.quantity);
    const unit = parseNum(row.unitPrice);
    const lineTotal = round2(qty * unit);
    total += lineTotal;
    const alt = i % 2 === 1;

    styleBodyCell(excelRow.getCell(1), i + 1, { align: 'center', alt });
    styleBodyCell(excelRow.getCell(2), formatExcelDate(row.quoteDate), { align: 'center', alt });
    styleBodyCell(excelRow.getCell(3), row.productName.trim(), { alt });
    styleBodyCell(excelRow.getCell(4), row.productImageDataUrl.startsWith('data:image/') ? '' : row.productImageName || '', {
      align: 'center',
      alt,
    });
    styleBodyCell(excelRow.getCell(5), qty || '', { align: 'center', alt, numFmt: qty ? '#,##0.##' : undefined });
    styleBodyCell(excelRow.getCell(6), unit || '', { align: 'right', alt, numFmt: unit ? '¥#,##0.00' : undefined });
    styleBodyCell(excelRow.getCell(7), lineTotal || '', { align: 'right', alt, numFmt: lineTotal ? '¥#,##0.00' : undefined });

    if (row.productImageDataUrl.startsWith('data:image/')) {
      try {
        const { base64, extension } = await dataUrlToExcelEmbeddedPng(row.productImageDataUrl);
        const imageId = wb.addImage({ base64, extension });
        ws.addImage(imageId, {
          tl: { col: IMAGE_COL - 1, row: 4 + i },
          ext: { width: THUMB_PX, height: THUMB_PX },
          editAs: 'absolute',
        });
        excelRow.height = ROW_PT;
      } catch {
        excelRow.height = 26;
      }
    } else {
      excelRow.height = 26;
    }
  }

  const sumRowIdx = 5 + rows.length;
  ws.mergeCells(sumRowIdx, 1, sumRowIdx, 6);
  const sumLabel = ws.getCell(sumRowIdx, 1);
  sumLabel.value = '合计 Total (¥)';
  sumLabel.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  sumLabel.alignment = { vertical: 'middle', horizontal: 'right' };
  sumLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
  sumLabel.border = XL_BORDER;

  const sumValue = ws.getCell(sumRowIdx, 7);
  sumValue.value = round2(total);
  sumValue.numFmt = '¥#,##0.00';
  sumValue.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF065F46' } };
  sumValue.alignment = { vertical: 'middle', horizontal: 'right' };
  sumValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
  sumValue.border = XL_BORDER;
  ws.getRow(sumRowIdx).height = 28;

  ws.columns = [
    { width: 6 },
    { width: 14 },
    { width: 42 },
    { width: 14 },
    { width: 8 },
    { width: 12 },
    { width: 12 },
  ];

  const hint = sanitizeFilenamePart(customer);
  await downloadExcelWorkbook(wb, `代购报价表_${hint}_${stamp}.xlsx`);
}
