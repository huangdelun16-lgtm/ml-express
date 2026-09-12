import type { Workbook, Worksheet } from 'exceljs';

export type AdminExcelCell = string | number | boolean | Date | null | undefined;

export type AdminExcelColumn = {
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
};

export type AdminExcelSheetInput = {
  name: string;
  title?: string;
  subtitle?: string;
  columns: AdminExcelColumn[];
  rows: AdminExcelCell[][];
};

const XL_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  left: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
  right: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
};

function paint(cell: import('exceljs').Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function inferAlign(value: AdminExcelCell, fallback?: 'left' | 'center' | 'right') {
  if (fallback) return fallback;
  return typeof value === 'number' ? 'right' : 'left';
}

function inferNumFmt(value: AdminExcelCell, explicit?: string) {
  if (explicit) return explicit;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Number.isInteger(value) ? '#,##0' : '#,##0.00';
}

function applyPrint(ws: Worksheet, colCount: number) {
  ws.pageSetup = {
    orientation: colCount > 6 ? 'landscape' : 'portrait',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.45, header: 0.2, footer: 0.2 },
  };
  ws.headerFooter = {
    oddHeader: '&LMarket Link Express&CAdmin export&R',
    oddFooter: '&L&F&C&P / &N&RInternal',
  };
}

function writeSheet(wb: Workbook, spec: AdminExcelSheetInput) {
  const name = spec.name.replace(/[\\/*?[\]:]/g, ' ').slice(0, 31) || 'Sheet';
  const headerOffset = spec.title ? (spec.subtitle ? 3 : 2) : spec.subtitle ? 2 : 1;
  const headerRow = headerOffset;
  const ws = wb.addWorksheet(name, {
    properties: { defaultRowHeight: 20, tabColor: { argb: 'FF0F172A' } },
    views: [{ state: 'frozen', ySplit: headerRow, showGridLines: false }],
  });

  ws.columns = spec.columns.map((col) => ({
    width: col.width ?? Math.min(36, Math.max(12, col.header.length + 4)),
  }));

  if (spec.title) {
    ws.mergeCells(1, 1, 1, Math.max(1, spec.columns.length));
    const title = ws.getCell(1, 1);
    title.value = spec.title;
    title.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    paint(title, 'FF0F172A');
    title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(1).height = 30;
  }

  if (spec.subtitle) {
    const row = spec.title ? 2 : 1;
    ws.mergeCells(row, 1, row, Math.max(1, spec.columns.length));
    const sub = ws.getCell(row, 1);
    sub.value = spec.subtitle;
    sub.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
    sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  }

  spec.columns.forEach((col, index) => {
    const cell = ws.getCell(headerRow, index + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    paint(cell, 'FF0F766E');
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = XL_BORDER;
  });
  ws.getRow(headerRow).height = 22;

  spec.rows.forEach((row, rowIndex) => {
    const excelRow = headerRow + 1 + rowIndex;
    const alt = rowIndex % 2 === 1;
    spec.columns.forEach((col, colIndex) => {
      const value = row[colIndex];
      const cell = ws.getCell(excelRow, colIndex + 1);
      cell.value = value == null ? '' : value;
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: inferAlign(value, col.align),
        wrapText: true,
      };
      const numFmt = inferNumFmt(value, col.numFmt);
      if (numFmt && typeof value === 'number') cell.numFmt = numFmt;
      paint(cell, alt ? 'FFF1F5F9' : 'FFFFFFFF');
      cell.border = XL_BORDER;
    });
  });

  const lastData = headerRow + spec.rows.length;
  if (spec.rows.length > 0) {
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: lastData, column: spec.columns.length },
    };
  }
  applyPrint(ws, spec.columns.length);
}

export async function buildAdminExcelWorkbook(sheets: AdminExcelSheetInput[]): Promise<Workbook> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Market Link Express';
  wb.lastModifiedBy = 'ML Admin';
  wb.created = new Date();
  wb.modified = new Date();
  (sheets.length ? sheets : [{ name: 'Sheet', columns: [{ header: '—', width: 12 }], rows: [] }]).forEach(
    (sheet) => writeSheet(wb, sheet),
  );
  return wb;
}

export async function downloadAdminExcel(
  filename: string,
  sheets: AdminExcelSheetInput[],
): Promise<void> {
  const wb = await buildAdminExcelWorkbook(sheets);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
