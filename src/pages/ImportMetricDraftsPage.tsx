import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Workbook } from 'exceljs';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import {
  dbRowToImportMetricDraftClient,
  importMetricDraftService,
  type ImportMetricDraftDbRow,
  type ImportMetricDraftDbWrite,
} from '../services/supabase';
import ImportPriceListPage from './ImportPriceListPage';
import PersonalExpensePage from './PersonalExpensePage';

const CURRENCIES = [
  { value: 'USD', label: '美金 USD' },
  { value: 'CNY', label: '人民币 CNY' },
  { value: 'MMK', label: '缅币 MMK' },
];

const UNITS = ['KG', 'U', 'M2', 'M3', 'PR'] as const;
type UnitCode = (typeof UNITS)[number];

/** HS 附件在 Excel 中缩略约 3cm（96dpi）；行高（磅）近似 3cm */
const HS_ATTACHMENT_THUMB_PX = Math.round((3 / 2.54) * 96);
const HS_EXCEL_ROW_PT = Math.round((3 / 2.54) * 72);

function formatCurrencyTotal(currency: string, amount: number): string {
  if (!Number.isFinite(amount)) {
    return currency === 'USD' ? '$0.00' : currency === 'CNY' ? '¥0.00' : '0 MMK';
  }
  if (amount === 0) {
    return currency === 'USD' ? '$0.00' : currency === 'CNY' ? '¥0.00' : '0 MMK';
  }
  if (currency === 'USD') return `$${amount.toFixed(2)}`;
  if (currency === 'CNY') return `¥${amount.toFixed(2)}`;
  return `${Math.round(amount).toLocaleString('en-US')} MMK`;
}

function lineSubtotalNumber(price: number, qty: number): number {
  const s = price * qty;
  return Number.isFinite(s) ? s : 0;
}

function formatQtyTotal(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0';
  return n % 1 === 0 ? n.toLocaleString('en-US') : n.toFixed(4).replace(/\.?0+$/, '');
}

function isKnownUnit(u: string): u is UnitCode {
  return (UNITS as readonly string[]).includes(u);
}

type LineItem = {
  id: string;
  hsCode: string;
  cargoDesc: string;
  myanmarDesc: string;
  unitCode: string;
  unitPrice: string;
  currency: string;
  quantity: string;
  hsImageName: string;
  /** 证照/HS 图预览（JPEG/PNG；PDF 为首页栅格化），随 line_items 存库供 Excel 导出 */
  hsImageDataUrl: string;
  /** 包装/外箱图，Excel「PACKAGE IMAGE」列；与 HS 图独立，可同时保留 */
  packageImageName: string;
  packageImageDataUrl: string;
};

function emptyLineItem(): LineItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    hsCode: '',
    cargoDesc: '',
    myanmarDesc: '',
    unitCode: 'KG',
    unitPrice: '',
    currency: 'USD',
    quantity: '',
    hsImageName: '',
    hsImageDataUrl: '',
    packageImageName: '',
    packageImageDataUrl: '',
  };
}

/** 与表单行字段一致（持久化在 import_metric_drafts.line_items） */
export type SavedLineItem = Omit<LineItem, 'id'>;

export type ImportMetricDraftSaved = {
  id: string;
  savedAt: string;
  startDate: string;
  customerName: string;
  registerNo: string;
  portOfDischarge: string;
  lineItems: SavedLineItem[];
  edDate: string;
  totalCharges: string;
  depositFirst: string;
  depositSecond: string;
  depositThird: string;
  depositFirstPaidOn: string;
  depositSecondPaidOn: string;
  depositThirdPaidOn: string;
  firstHandler: string;
  firstAccount: string;
  secondHandler: string;
  secondAccount: string;
  thirdHandler: string;
  thirdAccount: string;
  /** 订单编码（LIC-####），入库后不可改 */
  licOrderCode: string;
  /** 商品明细 Group（整单，不在各商品卡片内） */
  cargoGroup: string;
};

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function draftToDbWrite(d: ImportMetricDraftSaved): ImportMetricDraftDbWrite {
  return {
    register_no: d.registerNo,
    start_date: d.startDate?.trim() ? d.startDate : null,
    customer_name: d.customerName,
    port_of_discharge: d.portOfDischarge,
    ed_date: d.edDate?.trim() ? d.edDate : null,
    line_items: d.lineItems,
    total_charges: d.totalCharges,
    deposit_first: d.depositFirst,
    deposit_second: d.depositSecond,
    deposit_third: d.depositThird,
    deposit_first_paid_on: d.depositFirstPaidOn?.trim() ? d.depositFirstPaidOn : null,
    deposit_second_paid_on: d.depositSecondPaidOn?.trim() ? d.depositSecondPaidOn : null,
    deposit_third_paid_on: d.depositThirdPaidOn?.trim() ? d.depositThirdPaidOn : null,
    first_handler: d.firstHandler,
    first_account: d.firstAccount,
    second_handler: d.secondHandler,
    second_account: d.secondAccount,
    third_handler: d.thirdHandler,
    third_account: d.thirdAccount,
    lic_order_code: d.licOrderCode?.trim() ? d.licOrderCode.trim() : '',
    cargo_group: d.cargoGroup?.trim() ?? '',
  };
}

export function importMetricDbRowToSaved(r: ImportMetricDraftDbRow): ImportMetricDraftSaved {
  const c = dbRowToImportMetricDraftClient(r);
  return {
    ...c,
    lineItems: (Array.isArray(c.lineItems) ? c.lineItems : []) as SavedLineItem[],
  };
}

type LineLike = Pick<LineItem, 'unitPrice' | 'quantity' | 'currency' | 'unitCode'>;

function computeGoodsTotalLabelAndUnits(lineItems: LineLike[]): {
  goodsTotalLabel: string;
  unitTotalsSummary: string;
} {
  const byCurrency: Record<string, number> = {};
  const byUnit: Record<string, number> = {};

  lineItems.forEach((row) => {
    const price = parseNumberLoose(row.unitPrice);
    const qty = parseNumberLoose(row.quantity);
    const sub = lineSubtotalNumber(price, qty);
    const cur = row.currency || 'USD';
    byCurrency[cur] = (byCurrency[cur] || 0) + sub;

    const u = row.unitCode?.trim() || 'KG';
    byUnit[u] = (byUnit[u] || 0) + qty;
  });

  const currencyOrder = ['USD', 'CNY', 'MMK'];
  const currencyParts: string[] = [];
  currencyOrder.forEach((c) => {
    const sum = byCurrency[c];
    if (sum != null && sum !== 0) currencyParts.push(formatCurrencyTotal(c, sum));
  });
  Object.keys(byCurrency)
    .filter((c) => !currencyOrder.includes(c))
    .sort()
    .forEach((c) => {
      const sum = byCurrency[c];
      if (sum !== 0) currencyParts.push(`${c} ${sum.toFixed(2)}`);
    });

  const allCurrencyZero =
    Object.keys(byCurrency).length === 0 || Object.values(byCurrency).every((v) => !v || v === 0);
  const goodsTotalLabel =
    (currencyParts.length > 0 ? currencyParts.join(' · ') : allCurrencyZero ? '$0.00' : '') || '$0.00';

  const unitParts: string[] = [];
  UNITS.forEach((u) => {
    const sum = byUnit[u];
    if (sum != null && sum !== 0) unitParts.push(`${u} ${formatQtyTotal(sum)}`);
  });
  Object.keys(byUnit)
    .filter((u) => !isKnownUnit(u))
    .sort()
    .forEach((u) => {
      const sum = byUnit[u];
      if (sum !== 0) unitParts.push(`${u} ${formatQtyTotal(sum)}`);
    });

  const unitTotalsSummary = unitParts.length > 0 ? unitParts.join(' · ') : '—';

  return { goodsTotalLabel, unitTotalsSummary };
}

type DraftTableSortKey =
  | 'registerNo'
  | 'licOrderCode'
  | 'startDate'
  | 'edDate'
  | 'customerName'
  | 'portOfDischarge'
  | 'lineItemCount'
  | 'totalQty'
  | 'totalAmount';

type DraftTableSortDirection = 'asc' | 'desc';

function draftTotalQtyNumeric(d: ImportMetricDraftSaved): number {
  return d.lineItems.reduce((sum, row) => sum + parseNumberLoose(row.quantity), 0);
}

function draftPrimaryAmountNumeric(d: ImportMetricDraftSaved): number {
  const byCurrency: Record<string, number> = {};
  d.lineItems.forEach((row) => {
    const sub = lineSubtotalNumber(
      parseNumberLoose(row.unitPrice),
      parseNumberLoose(row.quantity),
    );
    const cur = row.currency || 'USD';
    byCurrency[cur] = (byCurrency[cur] || 0) + sub;
  });
  if (byCurrency.USD != null && byCurrency.USD !== 0) return byCurrency.USD;
  if (byCurrency.CNY != null && byCurrency.CNY !== 0) return byCurrency.CNY;
  if (byCurrency.MMK != null && byCurrency.MMK !== 0) return byCurrency.MMK;
  const vals = Object.values(byCurrency).filter((v) => v !== 0);
  return vals.length ? vals[0] : 0;
}

function draftSortComparable(
  d: ImportMetricDraftSaved,
  key: DraftTableSortKey,
): string | number {
  switch (key) {
    case 'registerNo':
      return d.registerNo?.trim() || '';
    case 'licOrderCode':
      return d.licOrderCode?.trim() || '';
    case 'startDate':
      return d.startDate?.trim() || '';
    case 'edDate':
      return d.edDate?.trim() || '';
    case 'customerName':
      return d.customerName?.trim() || '';
    case 'portOfDischarge':
      return d.portOfDischarge?.trim() || '';
    case 'lineItemCount':
      return d.lineItems.length;
    case 'totalQty':
      return draftTotalQtyNumeric(d);
    case 'totalAmount':
      return draftPrimaryAmountNumeric(d);
    default:
      return '';
  }
}

function sortImportMetricDrafts(
  drafts: ImportMetricDraftSaved[],
  key: DraftTableSortKey,
  direction: DraftTableSortDirection,
): ImportMetricDraftSaved[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...drafts].sort((a, b) => {
    const va = draftSortComparable(a, key);
    const vb = draftSortComparable(b, key);
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * sign;
    }
    return (
      String(va).localeCompare(String(vb), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * sign
    );
  });
}

function formatDisplayDate(isoDate: string, locale = 'zh-CN'): string {
  if (!isoDate?.trim()) return '—';
  const d = new Date(`${isoDate}T12:00:00`);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString(locale) : isoDate;
}

/** 新建/编辑进口指标草稿弹窗内统一展示：日/月/两位年（dd/mm/yy） */
function formatDraftModalDate(isoDate: string): string {
  if (!isoDate?.trim()) return '—';
  const d = new Date(`${isoDate.trim()}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return isoDate.trim();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${yy}`;
}

function sanitizeFilenamePart(s: string): string {
  const x = (s || 'draft').replace(/[/\\?*:[\]"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80);
  return x || 'draft';
}

const XL_BORDER: {
  top: { style: 'thin'; color: { argb: string } };
  left: { style: 'thin'; color: { argb: string } };
  bottom: { style: 'thin'; color: { argb: string } };
  right: { style: 'thin'; color: { argb: string } };
} = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  left: { style: 'thin', color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
  right: { style: 'thin', color: { argb: 'FF94A3B8' } },
};

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

function excelLineValueNumFmt(currency: string): string {
  const c = (currency || 'USD').trim().toUpperCase();
  if (c === 'USD') return '$#,##0.00';
  if (c === 'CNY') return '¥#,##0.00';
  if (c === 'MMK') return '#,##0';
  return '#,##0.00';
}

async function exportDraftLineItemsExcel(d: ImportMetricDraftSaved): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ML Express Admin';
  const ws = wb.addWorksheet('商品明细', {
    views: [{ state: 'frozen', ySplit: 4 }],
    properties: { defaultRowHeight: 22 },
  });

  const reg = d.registerNo?.trim() || '—';
  const regFile = d.registerNo?.trim() || 'NO_REG';
  const orderNo = d.licOrderCode?.trim() || '—';

  ws.mergeCells(1, 1, 1, 13);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = '进口指标 · 商品明细';
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 40;

  ws.mergeCells(2, 1, 2, 13);
  const sub = ws.getCell(2, 1);
  sub.value = `REGISTER NO.  ${reg}    |    订单号 / Order no. (LIC): ${orderNo}    |    客户 / Customer: ${d.customerName?.trim() || '—'}    |    卸货港: ${d.portOfDischarge?.trim() || '—'}`;
  sub.font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  sub.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws.getRow(2).height = 30;

  ws.mergeCells(3, 1, 3, 13);
  const hint = ws.getCell(3, 1);
  hint.value = `导出时间 · Generated: ${new Date().toLocaleString('zh-CN', { hour12: false })}  ·  共 ${d.lineItems.length} 条商品行`;
  hint.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  hint.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws.getRow(3).height = 24;

  const groupVal = d.cargoGroup?.trim() || '—';
  const headers = [
    'REGISTER NO.',
    '订单号 · ORDER NO. · LIC',
    'GROUP',
    'H.S CODE',
    'CARGO DESCRIPTION',
    'MYANMAR DESCRIPTION',
    'UNIT',
    'UNIT PRICE',
    'CURRENCY',
    'QUANTITY',
    'VALUE',
    'HS IMAGE',
    'PACKAGE IMAGE',
  ];
  const headerRow = ws.getRow(4);
  headerRow.height = 28;
  headers.forEach((text, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = text;
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = XL_BORDER;
  });

  for (let i = 0; i < d.lineItems.length; i++) {
    const li = d.lineItems[i];
    const row = ws.getRow(5 + i);
    const price = parseNumberLoose(li.unitPrice);
    const qty = parseNumberLoose(li.quantity);
    const lineValue = Number.isFinite(price * qty) ? price * qty : 0;

    const licCell = d.licOrderCode?.trim() || '—';
    const strCols: string[] = [
      reg,
      licCell,
      groupVal,
      li.hsCode,
      li.cargoDesc,
      li.myanmarDesc,
      li.unitCode,
      li.unitPrice,
      li.currency,
      li.quantity,
    ];

    strCols.forEach((val, j) => {
      const cell = row.getCell(j + 1);
      cell.value = val ?? '';
      const isOrderCol = j === 1;
      const orderHighlight = isOrderCol && val && val !== '—';
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: !!orderHighlight,
        color: { argb: orderHighlight ? 'FFDC2626' : 'FF0F172A' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: j === 4 || j === 5 ? 'left' : 'center',
        wrapText: true,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: i % 2 === 1 ? 'FFF1F5F9' : 'FFFFFFFF' },
      };
      cell.border = XL_BORDER;
    });

    const valueCell = row.getCell(11);
    valueCell.value = lineValue;
    valueCell.numFmt = excelLineValueNumFmt(li.currency);
    valueCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
    valueCell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    valueCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: i % 2 === 1 ? 'FFF1F5F9' : 'FFFFFFFF' },
    };
    valueCell.border = XL_BORDER;

    const imgHsCell = row.getCell(12);
    imgHsCell.value =
      li.hsImageDataUrl?.startsWith('data:image/') ? '' : li.hsImageName || '';
    imgHsCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
    imgHsCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    imgHsCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: i % 2 === 1 ? 'FFF1F5F9' : 'FFFFFFFF' },
    };
    imgHsCell.border = XL_BORDER;

    const imgPkgCell = row.getCell(13);
    imgPkgCell.value =
      li.packageImageDataUrl?.startsWith('data:image/') ? '' : li.packageImageName || '';
    imgPkgCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
    imgPkgCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    imgPkgCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: i % 2 === 1 ? 'FFF1F5F9' : 'FFFFFFFF' },
    };
    imgPkgCell.border = XL_BORDER;

    if (li.hsImageDataUrl?.startsWith('data:image/')) {
      try {
        const { base64, extension } = await dataUrlToExcelEmbeddedPng(li.hsImageDataUrl);
        const imageId = wb.addImage({ base64, extension });
        ws.addImage(imageId, {
          tl: { col: 11, row: 4 + i },
          ext: { width: HS_ATTACHMENT_THUMB_PX, height: HS_ATTACHMENT_THUMB_PX },
          editAs: 'absolute',
        });
      } catch {
        /* 损坏或无法解析的图略过 */
      }
    }

    if (li.packageImageDataUrl?.startsWith('data:image/')) {
      try {
        const { base64, extension } = await dataUrlToExcelEmbeddedPng(li.packageImageDataUrl);
        const imageId = wb.addImage({ base64, extension });
        ws.addImage(imageId, {
          tl: { col: 12, row: 4 + i },
          ext: { width: HS_ATTACHMENT_THUMB_PX, height: HS_ATTACHMENT_THUMB_PX },
          editAs: 'absolute',
        });
      } catch {
        /* ignore */
      }
    }

    const hasAnyImg =
      li.hsImageDataUrl?.startsWith('data:image/') || li.packageImageDataUrl?.startsWith('data:image/');
    row.height = hasAnyImg ? Math.max(HS_EXCEL_ROW_PT, 28) : 26;
  }

  ws.columns = [
    { width: 15 },
    { width: 16 },
    { width: 12 },
    { width: 13 },
    { width: 34 },
    { width: 34 },
    { width: 9 },
    { width: 13 },
    { width: 11 },
    { width: 13 },
    { width: 14 },
    { width: 22 },
    { width: 22 },
  ];

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
  await downloadExcelWorkbook(wb, `import_line_items_${sanitizeFilenamePart(regFile)}_${stamp}.xlsx`);
}

async function exportDraftPermitSummaryExcel(d: ImportMetricDraftSaved, dateLocale: string): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const { goodsTotalLabel, unitTotalsSummary } = computeGoodsTotalLabelAndUnits(d.lineItems);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ML Express Admin';
  const ws = wb.addWorksheet('批文概要', {
    views: [{ state: 'frozen', ySplit: 2 }],
    properties: { defaultRowHeight: 22 },
  });

  const reg = d.registerNo?.trim() || '—';
  const regFile = d.registerNo?.trim() || 'NO_REG';

  ws.mergeCells(1, 1, 1, 2);
  const t1 = ws.getCell(1, 1);
  t1.value = '进口指标 · 批文概要';
  t1.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  t1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 40;

  ws.mergeCells(2, 1, 2, 2);
  const t2 = ws.getCell(2, 1);
  t2.value = `Import permit summary  ·  ${new Date().toLocaleString(dateLocale, { hour12: false })}`;
  t2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  t2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(2).height = 24;

  let r = 3;

  const addSection = (title: string) => {
    ws.mergeCells(r, 1, r, 2);
    const c = ws.getCell(r, 1);
    c.value = title;
    c.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(r).height = 28;
    r += 1;
  };

  const addPair = (label: string, value: string, valueStyle?: { bold?: boolean; colorArgb?: string }) => {
    const row = ws.getRow(r);
    const c1 = row.getCell(1);
    const c2 = row.getCell(2);
    c1.value = label;
    c2.value = value;
    c1.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF334155' } };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    c2.font = {
      name: 'Calibri',
      size: 11,
      bold: valueStyle?.bold ?? false,
      color: { argb: valueStyle?.colorArgb ?? 'FF0F172A' },
    };
    c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    c2.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    c1.border = XL_BORDER;
    c2.border = XL_BORDER;
    const lines = Math.max(String(label).length / 30, String(value).length / 40, 1);
    row.height = Math.min(120, 22 + Math.ceil(lines) * 14);
    r += 1;
  };

  addSection('基本信息 · General');
  addPair('REGISTER NO.', reg);
  addPair(
    '订单号 · 订单编码 / Order code (LIC)',
    d.licOrderCode?.trim() || '—',
    d.licOrderCode?.trim() ? { bold: true, colorArgb: 'FFDC2626' } : undefined,
  );
  addPair('START DATE', formatDisplayDate(d.startDate, dateLocale));
  addPair('ED DATE', formatDisplayDate(d.edDate, dateLocale));
  addPair('客户 / Customer', d.customerName?.trim() || '—');
  addPair('卸货港 / Port of discharge', d.portOfDischarge?.trim() || '—');

  addSection('费用 · Charges (MMK)');
  addPair('Total Charges For License', d.totalCharges?.trim() || '—');
  addPair('第一期 · 申请批文订金', d.depositFirst?.trim() || '—');
  addPair('第一期 · 付款日期', d.depositFirstPaidOn?.trim() ? formatDisplayDate(d.depositFirstPaidOn, dateLocale) : '—');
  addPair('第二期 · ANNI Fees', d.depositSecond?.trim() || '—');
  addPair('第二期 · 付款日期', d.depositSecondPaidOn?.trim() ? formatDisplayDate(d.depositSecondPaidOn, dateLocale) : '—');
  addPair('第三期 · LICENSE', d.depositThird?.trim() || '—');
  addPair('第三期 · 付款日期（付清全款）', d.depositThirdPaidOn?.trim() ? formatDisplayDate(d.depositThirdPaidOn, dateLocale) : '—');

  addSection('汇款与收款账号 · Remittance / receiving');
  addPair('1st 汇款账号名', d.firstHandler?.trim() || '—');
  addPair('1st 收款账号名', d.firstAccount?.trim() || '—');
  addPair('2nd 汇款账号名', d.secondHandler?.trim() || '—');
  addPair('2nd 收款账号名', d.secondAccount?.trim() || '—');
  addPair('3rd 汇款账号名', d.thirdHandler?.trim() || '—');
  addPair('3rd 收款账号名', d.thirdAccount?.trim() || '—');

  addSection('汇总 · Roll-up');
  addPair('货款 / Goods amount', goodsTotalLabel);
  addPair('数量合计 / Quantity', unitTotalsSummary);
  addPair('商品行数 / Line count', String(d.lineItems.length));
  addPair('最近更新 / Last updated', d.savedAt ? new Date(d.savedAt).toLocaleString(dateLocale, { hour12: false }) : '—');

  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 52;

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
  await downloadExcelWorkbook(wb, `import_permit_summary_${sanitizeFilenamePart(regFile)}_${stamp}.xlsx`);
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseNumberLoose(s: string): number {
  if (!s || !s.trim()) return 0;
  const n = parseFloat(s.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

/** 缅币整数金额：只保留数字并加千分位（输入框用） */
function digitsOnlyToCommaMmk(digitsRaw: string): string {
  const d = digitsRaw.replace(/\D/g, '');
  if (!d) return '';
  const noLeading = d.replace(/^0+(?=\d)/, '') || '0';
  return noLeading.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatLineTotal(currency: string, price: number, qty: number): string {
  const sub = price * qty;
  if (!Number.isFinite(sub) || (price === 0 && qty === 0)) {
    return currency === 'USD' ? '$0.00' : currency === 'CNY' ? '¥0.00' : '0 MMK';
  }
  if (currency === 'USD') return `$${sub.toFixed(2)}`;
  if (currency === 'CNY') return `¥${sub.toFixed(2)}`;
  return `${Math.round(sub).toLocaleString('en-US')} MMK`;
}

function formatMmk(n: number): string {
  const rounded = Math.round(n);
  return `${rounded.toLocaleString('en-US')} MMK`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('read'));
    r.readAsDataURL(file);
  });
}

async function resizeRasterDataUrl(dataUrl: string, maxSide: number): Promise<string> {
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('img'));
    img.src = dataUrl;
  });
  let w = img.naturalWidth || 1;
  let h = img.naturalHeight || 1;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.88);
}

function isHsPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function isHsRasterImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name);
}

async function pdfFirstPageToPngDataUrl(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const vp1 = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, 1100 / Math.max(vp1.width, 1));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  const task = page.render({ canvasContext: ctx, viewport });
  await task.promise;
  return canvas.toDataURL('image/png');
}

async function hsAttachmentToPreviewDataUrl(file: File): Promise<string> {
  if (isHsPdfFile(file)) return pdfFirstPageToPngDataUrl(file);
  if (!isHsRasterImageFile(file)) throw new Error('unsupported');
  const raw = await readFileAsDataUrl(file);
  return resizeRasterDataUrl(raw, 1400);
}

function dataUrlToExcelImageParts(dataUrl: string): { base64: string; extension: 'png' | 'jpeg' } {
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!m?.[2]) {
    throw new Error('bad image data');
  }
  const kind = m[1].toLowerCase();
  const ext = kind === 'png' ? 'png' : 'jpeg';
  return { base64: m[2], extension: ext };
}

/**
 * 重采样为 PNG 再写入 xlsx。避免 WebP 等被标成 jpeg 扩展名、或移动版 Excel / iOS 预览无法解码等问题。
 */
async function dataUrlToExcelEmbeddedPng(dataUrl: string): Promise<{ base64: string; extension: 'png' }> {
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('bad image data');
  }
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
    img.onerror = () => {
      try {
        const legacy = dataUrlToExcelImageParts(dataUrl);
        if (legacy.extension === 'png') {
          resolve({ base64: legacy.base64, extension: 'png' });
          return;
        }
      } catch {
        /* ignore */
      }
      reject(new Error('image load'));
    };
    img.src = dataUrl;
  });
}

type NewDraftModalProps = {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  onSave: (draft: ImportMetricDraftSaved) => void | Promise<void>;
  initialDraft: ImportMetricDraftSaved | null;
};

function savedLinesToFormLineItems(draft: ImportMetricDraftSaved): LineItem[] {
  if (!draft.lineItems?.length) return [emptyLineItem()];
  return draft.lineItems.map((li, i) => ({
    ...emptyLineItem(),
    ...li,
    id: `ln_${draft.id}_${i}_${Math.random().toString(36).slice(2, 9)}`,
    hsImageDataUrl: li.hsImageDataUrl ?? '',
    packageImageName: li.packageImageName ?? '',
    packageImageDataUrl: li.packageImageDataUrl ?? '',
  }));
}

const inputBase: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 14px',
  borderRadius: 11,
  border: '1px solid rgba(100, 116, 139, 0.45)',
  background: 'rgba(15, 23, 42, 0.72)',
  color: '#f1f5f9',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
};

/** 草稿弹窗内：单价/数量/行计等小字段的统一的标签与控件高度 */
const lineMetricsLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  marginBottom: 8,
  color: 'rgba(148, 163, 184, 0.95)',
};

const lineMetricsInputStyle: React.CSSProperties = {
  ...inputBase,
  minHeight: 44,
  height: 44,
  padding: '10px 12px',
};

const lineMetricsShellStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: '16px 16px 18px',
  borderRadius: 14,
  background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.58) 0%, rgba(15, 23, 42, 0.35) 100%)',
  border: '1px solid rgba(56, 189, 248, 0.16)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  alignItems: 'start',
};

/** 随正文高度自动伸长的描述框（按换行/字数测量 scrollHeight） */
const AutoHeightTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  minHeightPx?: number;
  maxHeightPx?: number;
  lineHeight?: number;
}> = ({
  value,
  onChange,
  placeholder,
  minHeightPx = 76,
  maxHeightPx = 420,
  lineHeight = 1.5,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    const sh = el.scrollHeight;
    const h = Math.min(Math.max(sh, minHeightPx), maxHeightPx);
    el.style.height = `${h}px`;
    el.style.overflowY = sh > maxHeightPx ? 'auto' : 'hidden';
  }, [minHeightPx, maxHeightPx]);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  useEffect(() => {
    const el = ref.current;
    const obsRoot = el?.parentElement;
    if (!el || !obsRoot || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => syncHeight());
    ro.observe(obsRoot);
    return () => ro.disconnect();
  }, [syncHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      style={{
        ...inputBase,
        minHeight: minHeightPx,
        maxHeight: maxHeightPx,
        lineHeight,
        resize: 'none',
        overflow: 'hidden',
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  );
};

const dateInputModalStyle: React.CSSProperties = {
  ...inputBase,
  colorScheme: 'dark',
};

function depositPhaseCardShell(accent: string): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: '14px 14px 16px',
    background: 'linear-gradient(160deg, rgba(30, 41, 59, 0.88) 0%, rgba(15, 23, 42, 0.68) 100%)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
    borderLeft: `3px solid ${accent}`,
  };
}

function depositStepBadgeShell(accent: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 26,
    height: 26,
    padding: '0 7px',
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
    background: `${accent}2e`,
    color: '#e2e8f0',
    border: `1px solid ${accent}55`,
    marginRight: 10,
  };
}

const sectionBoxStyle = (): React.CSSProperties => ({
  background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.72) 0%, rgba(15, 23, 42, 0.5) 100%)',
  border: '1px solid rgba(71, 85, 105, 0.35)',
  borderRadius: 16,
  padding: '18px 20px 18px 24px',
  marginBottom: 16,
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
});

const sectionAccentBar: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 10,
  bottom: 10,
  width: 3,
  borderRadius: '0 4px 4px 0',
  background: 'linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)',
  opacity: 0.95,
  boxShadow: '0 0 12px rgba(37, 99, 235, 0.35)',
};

const ModalSection: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ ...sectionBoxStyle(), ...style }}>
    <div style={sectionAccentBar} aria-hidden />
    <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
  </div>
);

const readonlyFieldBox: React.CSSProperties = {
  ...inputBase,
  cursor: 'default',
  userSelect: 'text',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const readonlyMetricsCell: React.CSSProperties = {
  ...readonlyFieldBox,
  minHeight: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  padding: '10px 12px',
};

function myanmarMultiRestSnippet(lines: SavedLineItem[]): string {
  const firstMy = lines.map((l) => l.myanmarDesc.trim()).find(Boolean);
  const firstCargo = lines.map((l) => l.cargoDesc.trim()).find(Boolean);
  const snippet = (firstMy || firstCargo || '').replace(/\s+/g, ' ');
  const short = snippet.length > 44 ? `${snippet.slice(0, 44)}…` : snippet;
  return short;
}

/** 缅文摘要展示用字体栈（系统无对应字体时降级无衬线） */
const MYANMAR_SNIPPET_FONT =
  "'Noto Sans Myanmar', 'Myanmar Text', Pyidaungsu, 'Padauk', 'Myanmar3', 'Noto Sans', 'PingFang SC', system-ui, sans-serif";

type LineItemsPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  draft: ImportMetricDraftSaved | null;
  isMobile: boolean;
  language: string;
};

const ImportMetricLineItemsPreviewModal: React.FC<LineItemsPreviewModalProps> = ({
  open,
  onClose,
  draft,
  isMobile,
  language,
}) => {
  if (!open || !draft) return null;
  const lines = draft.lineItems?.length ? draft.lineItems : [];

  const title =
    language === 'en' ? 'Line items' : language === 'my' ? 'ကုန်ပစ္စည်း အသေးစိတ်' : '商品明细';
  const licDisplay = draft.licOrderCode?.trim() || '—';
  const sub =
    language === 'en'
      ? `Register: ${draft.registerNo?.trim() || '—'} · Customer: ${draft.customerName?.trim() || '—'}`
      : language === 'my'
        ? `${draft.registerNo?.trim() || '—'} · ${draft.customerName?.trim() || '—'}`
        : `REGISTER NO. ${draft.registerNo?.trim() || '—'} · 客户 ${draft.customerName?.trim() || '—'}`;
  const orderNoLine =
    language === 'en'
      ? `Order no. · order code (LIC): ${licDisplay}`
      : language === 'my'
        ? `အော်ဒါနံပါတ် · order code (LIC): ${licDisplay}`
        : `订单号 · 订单编码（LIC）：${licDisplay}`;
  const closeLbl = language === 'en' ? 'Close' : language === 'my' ? 'ပိတ်ရန်' : '关闭';
  const colName =
    language === 'en' ? 'Product' : language === 'my' ? 'ကုန်ပစ္စည်းအမည်' : '商品名称';
  const colUnit = language === 'en' ? 'Unit' : language === 'my' ? 'ယူနစ်' : '单位';
  const colPrice = language === 'en' ? 'Price' : language === 'my' ? 'စျေးနှုန်း' : '价格';
  const colCur = language === 'en' ? 'Cur.' : language === 'my' ? 'ငွေကြေး' : '币种';
  const colQty = language === 'en' ? 'Qty' : language === 'my' ? 'အရေအတွက်' : '数量';

  const lineName = (row: SavedLineItem) =>
    row.cargoDesc?.trim() || row.myanmarDesc?.trim() || '—';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="line-items-preview-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1250,
        background: 'rgba(2, 8, 23, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: isMobile ? '12px 10px 28px' : '48px 14px 32px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 520,
          marginTop: isMobile ? 0 : 8,
          marginBottom: 12,
          background: 'linear-gradient(165deg, #0f172a 0%, #131c2e 100%)',
          borderRadius: 14,
          border: '1px solid rgba(96, 165, 250, 0.22)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
          color: '#f8fafc',
          fontFamily:
            "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif",
          boxSizing: 'border-box',
        }}
      >
        <header
          style={{
            padding: '12px 40px 10px 14px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLbl}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.28)',
              background: 'rgba(15, 23, 42, 0.55)',
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
          <h2
            id="line-items-preview-title"
            style={{
              margin: 0,
              fontSize: isMobile ? '1.02rem' : '1.08rem',
              fontWeight: 800,
              color: '#f1f5f9',
            }}
          >
            {title}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 11, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.72)' }}>
            {sub}
          </p>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 11,
              lineHeight: 1.5,
              color: 'rgba(186, 230, 253, 0.88)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {orderNoLine}
          </p>
        </header>

        <div
          style={{
            padding: '10px 12px 14px',
            maxHeight: isMobile ? 'none' : 'min(70vh, 420px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                minWidth: isMobile ? 400 : 0,
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.92)' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148,163,184,0.2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {colName}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 8px',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148,163,184,0.2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {colUnit}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px 8px',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148,163,184,0.2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {colPrice}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 8px',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148,163,184,0.2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {colCur}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px 10px',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148,163,184,0.2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {colQty}
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row, idx) => {
                  const curLabel = CURRENCIES.find((c) => c.value === row.currency)?.label ?? row.currency;
                  return (
                    <tr
                      key={`prev-${idx}`}
                      style={{
                        borderBottom: '1px solid rgba(148,163,184,0.1)',
                        background: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.25)' : 'transparent',
                      }}
                    >
                      <td
                        style={{
                          padding: '8px 10px',
                          verticalAlign: 'top',
                          maxWidth: 200,
                          wordBreak: 'break-word',
                          lineHeight: 1.4,
                        }}
                      >
                        {lineName(row)}
                      </td>
                      <td style={{ padding: '8px 8px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                        {row.unitCode?.trim() || '—'}
                      </td>
                      <td
                        style={{
                          padding: '8px 8px',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          verticalAlign: 'top',
                        }}
                      >
                        {row.unitPrice?.trim() || '—'}
                      </td>
                      <td style={{ padding: '8px 8px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                        {curLabel}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          verticalAlign: 'top',
                        }}
                      >
                        {row.quantity?.trim() || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewImportMetricDraftModal: React.FC<NewDraftModalProps> = ({
  open,
  onClose,
  isMobile,
  onSave,
  initialDraft,
}) => {
  const { language } = useLanguage();
  const [startDate, setStartDate] = useState(todayIso);
  const [customerName, setCustomerName] = useState('');
  const [registerNo, setRegisterNo] = useState('');
  const [portOfDischarge, setPortOfDischarge] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>(() => [emptyLineItem()]);
  const [edDate, setEdDate] = useState(todayIso);
  const [totalCharges, setTotalCharges] = useState('');
  const [depositFirst, setDepositFirst] = useState('');
  const [depositSecond, setDepositSecond] = useState('');
  const [depositThird, setDepositThird] = useState('');
  const [depositFirstPaidOn, setDepositFirstPaidOn] = useState('');
  const [depositSecondPaidOn, setDepositSecondPaidOn] = useState('');
  const [depositThirdPaidOn, setDepositThirdPaidOn] = useState('');
  const [firstHandler, setFirstHandler] = useState('');
  const [firstAccount, setFirstAccount] = useState('');
  const [secondHandler, setSecondHandler] = useState('');
  const [secondAccount, setSecondAccount] = useState('');
  const [thirdHandler, setThirdHandler] = useState('');
  const [thirdAccount, setThirdAccount] = useState('');
  const [licOrderCode, setLicOrderCode] = useState('');
  const [cargoGroup, setCargoGroup] = useState('');

  const licCodeLocked = useMemo(
    () => isUuid(initialDraft?.id ?? '') && Boolean(initialDraft?.licOrderCode?.trim()),
    [initialDraft?.id, initialDraft?.licOrderCode],
  );

  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const setLineField = useCallback((id: string, patch: Partial<LineItem>) => {
    setLineItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addLine = useCallback(() => {
    setLineItems((rows) => [...rows, emptyLineItem()]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLineItems((rows) => {
      if (rows.length <= 1) return rows;
      return rows.filter((r) => r.id !== id);
    });
  }, []);

  const confirmRemoveLine = useCallback(
    (lineId: string) => {
      const msg =
        language === 'en'
          ? 'Remove this product line from the draft?'
          : language === 'my'
            ? 'ဤကုန်ကြောင်းကို ဖယ်ရှားမလား?'
            : '确定移除此条商品明细？';
      if (!window.confirm(msg)) return;
      removeLine(lineId);
    },
    [language, removeLine],
  );

  const { goodsTotalLabel, unitTotalsSummary } = useMemo(
    () => computeGoodsTotalLabelAndUnits(lineItems),
    [lineItems],
  );

  const d1 = parseNumberLoose(depositFirst);
  const d2 = parseNumberLoose(depositSecond);
  const d3 = parseNumberLoose(depositThird);
  const tc = parseNumberLoose(totalCharges);
  const balanceMmk = tc - (d1 + d2 + d3);

  const payDateLabel =
    language === 'en' ? 'Payment date' : language === 'my' ? 'ငွေပေးချေသည့်နေ့' : '付款日期';
  const payDateSub =
    language === 'en'
      ? 'When this instalment was paid (dd/mm/yy)'
      : language === 'my'
        ? 'ပေးချေသည့်ရက်စွဲ (dd/mm/yy)'
        : '实际付款日（日/月/年，dd/mm/yy）';
  const fullPaySub =
    language === 'en'
      ? 'Balance / licence — final payment'
      : language === 'my'
        ? 'အကြွေးကျေခြင်း / နောက်ဆုံးသွင်း'
        : '尾款 / LICENSE（付清全款）';

  const resetForm = useCallback(() => {
    setStartDate(todayIso());
    setCustomerName('');
    setRegisterNo('');
    setPortOfDischarge('');
    setLineItems([emptyLineItem()]);
    setEdDate(todayIso());
    setTotalCharges('');
    setDepositFirst('');
    setDepositSecond('');
    setDepositThird('');
    setDepositFirstPaidOn('');
    setDepositSecondPaidOn('');
    setDepositThirdPaidOn('');
    setFirstHandler('');
    setFirstAccount('');
    setSecondHandler('');
    setSecondAccount('');
    setThirdHandler('');
    setThirdAccount('');
    setLicOrderCode('');
    setCargoGroup('');
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialDraft) {
      setStartDate(initialDraft.startDate || todayIso());
      setCustomerName(initialDraft.customerName || '');
      setRegisterNo(initialDraft.registerNo || '');
      setPortOfDischarge(initialDraft.portOfDischarge || '');
      setCargoGroup(initialDraft.cargoGroup || '');
      setLineItems(savedLinesToFormLineItems(initialDraft));
      setEdDate(initialDraft.edDate || todayIso());
      setTotalCharges(digitsOnlyToCommaMmk(initialDraft.totalCharges || ''));
      setDepositFirst(digitsOnlyToCommaMmk(initialDraft.depositFirst || ''));
      setDepositSecond(digitsOnlyToCommaMmk(initialDraft.depositSecond || ''));
      setDepositThird(digitsOnlyToCommaMmk(initialDraft.depositThird || ''));
      setDepositFirstPaidOn(initialDraft.depositFirstPaidOn?.trim() || '');
      setDepositSecondPaidOn(initialDraft.depositSecondPaidOn?.trim() || '');
      setDepositThirdPaidOn(initialDraft.depositThirdPaidOn?.trim() || '');
      setFirstHandler(initialDraft.firstHandler || '');
      setFirstAccount(initialDraft.firstAccount || '');
      setSecondHandler(initialDraft.secondHandler || '');
      setSecondAccount(initialDraft.secondAccount || '');
      setThirdHandler(initialDraft.thirdHandler || '');
      setThirdAccount(initialDraft.thirdAccount || '');
      setLicOrderCode(initialDraft.licOrderCode?.trim() ?? '');
    } else {
      resetForm();
    }
  }, [open, initialDraft?.id, initialDraft?.licOrderCode, resetForm]);

  useEffect(() => {
    if (!open) return;
    if (licCodeLocked) return;
    const name = customerName.trim();
    if (!name) {
      setLicOrderCode('');
      return;
    }
    if (licOrderCode.trim()) return;
    let cancelled = false;
    void (async () => {
      const next = await importMetricDraftService.nextLicOrderCode();
      if (!cancelled) setLicOrderCode(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, licCodeLocked, customerName, licOrderCode]);

  useEffect(() => {
    if (!open) return;
    const styleId = 'import-metric-draft-modal-focus';
    if (document.getElementById(styleId)) return undefined;
    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = `
      #import-metric-draft-modal-root input:focus-visible,
      #import-metric-draft-modal-root textarea:focus-visible,
      #import-metric-draft-modal-root select:focus-visible {
        border-color: rgba(96, 165, 250, 0.8) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.32);
        background: rgba(15, 23, 42, 0.95) !important;
      }
    `;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [open]);

  const handleSaveDraft = async () => {
    let finalLic = licCodeLocked
      ? (initialDraft?.licOrderCode ?? '').trim()
      : licOrderCode.trim();
    if (!licCodeLocked && customerName.trim() && !finalLic) {
      finalLic = await importMetricDraftService.nextLicOrderCode();
      setLicOrderCode(finalLic);
    }
    const payload: ImportMetricDraftSaved = {
      id: initialDraft?.id ?? `imd_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      savedAt: initialDraft?.savedAt ?? new Date().toISOString(),
      startDate,
      customerName: customerName.trim(),
      registerNo,
      portOfDischarge: portOfDischarge.trim(),
      lineItems: lineItems.map(
        ({
          hsCode,
          cargoDesc,
          myanmarDesc,
          unitCode,
          unitPrice,
          currency,
          quantity,
          hsImageName,
          hsImageDataUrl,
          packageImageName,
          packageImageDataUrl,
        }) => ({
          hsCode,
          cargoDesc,
          myanmarDesc,
          unitCode,
          unitPrice,
          currency,
          quantity,
          hsImageName,
          hsImageDataUrl,
          packageImageName,
          packageImageDataUrl,
        }),
      ),
      edDate,
      totalCharges,
      depositFirst,
      depositSecond,
      depositThird,
      depositFirstPaidOn,
      depositSecondPaidOn,
      depositThirdPaidOn,
      firstHandler,
      firstAccount,
      secondHandler,
      secondAccount,
      thirdHandler,
      thirdAccount,
      licOrderCode: finalLic,
      cargoGroup: cargoGroup.trim(),
    };
    const saveErr =
      language === 'en'
        ? 'Could not save. Check your connection and try again.'
        : language === 'my'
          ? 'သိမ်းမရပါ။ အင်တာနက်နှင့် ပြန်လည်ကြိုးစားပါ။'
          : '保存失败，请检查网络或权限后重试。';
    try {
      await Promise.resolve(onSave(payload));
      resetForm();
      onClose();
    } catch (e) {
      console.error(e);
      const detail = e instanceof Error && e.message ? e.message : '';
      window.alert(detail && detail !== 'import_metric_drafts update failed' ? `${saveErr}\n\n${detail}` : saveErr);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-metric-draft-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(2, 8, 23, 0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: isMobile ? '12px 10px 32px' : '28px 20px 40px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        id="import-metric-draft-modal-root"
        lang="en-GB"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 860,
          marginTop: isMobile ? 4 : 12,
          marginBottom: 24,
          background:
            'linear-gradient(168deg, #0c1222 0%, #131d32 38%, #162045 72%, #1a1f3a 100%)',
          borderRadius: 20,
          border: '1px solid rgba(96, 165, 250, 0.22)',
          boxShadow:
            '0 28px 90px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.08) inset',
          color: '#f8fafc',
          fontFamily:
            "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif",
          boxSizing: 'border-box',
        }}
      >
        <header
          style={{
            padding: '20px 22px 16px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
            position: 'relative',
            background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.12) 0%, transparent 55%)',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            aria-label="关闭"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 38,
              height: 38,
              borderRadius: 11,
              border: '1px solid rgba(148, 163, 184, 0.28)',
              background: 'rgba(15, 23, 42, 0.55)',
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            ×
          </button>
          <h2
            id="import-metric-draft-title"
            style={{
              margin: 0,
              fontSize: isMobile ? '1.18rem' : '1.4rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(92deg, #f8fafc 0%, #bae6fd 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {initialDraft ? '编辑进口指标草稿' : '新建进口指标草稿'}
          </h2>
          <p style={{ margin: '12px 42px 0 0', fontSize: 13, lineHeight: 1.65, color: 'rgba(226, 232, 240, 0.82)' }}>
            同一批文内可添加多「条」商品，Register No.、H.S Code 等均可选填，保存时不强制校验位数；建议后续补全便于报关与价格表汇总。
          </p>
        </header>

        <div style={{ padding: '18px 22px 24px', maxHeight: isMobile ? 'none' : 'calc(100vh - 200px)', overflowY: isMobile ? 'visible' : 'auto' }}>
          {/* 生效起始 */}
          <ModalSection>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>生效起始 · Start Date</div>
            <p style={{ margin: '0 0 14px', fontSize: 12, opacity: 0.82, lineHeight: 1.55 }}>
              批文或指标开始生效的日期与客户名称；填写后再填写下方注册号与商品明细。订单编码在填写客户名称后自动生成，保存草稿后不可更改。
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(150px, 1fr) minmax(200px, 2fr) auto',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <label style={{ minWidth: 0, display: 'block' }}>
                <span style={{ display: 'block', fontSize: 12, marginBottom: 6, opacity: 0.85 }}>Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ ...inputBase, ...dateInputModalStyle }}
                />
                {startDate.trim() ? (
                  <div style={{ fontSize: 11, opacity: 0.78, marginTop: 8, color: '#bae6fd' }}>
                    {language === 'en' ? 'Selected: ' : language === 'my' ? 'ရွေးချယ်: ' : '已选 · '}
                    {formatDraftModalDate(startDate.trim())}
                  </div>
                ) : null}
              </label>
              <label style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, marginBottom: 6, opacity: 0.85 }}>客户名称 · Customer Name</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="客户或公司名称"
                  style={inputBase}
                />
              </label>
              <div style={{ minWidth: 0, paddingBottom: isMobile ? 0 : 2 }}>
                <span style={{ display: 'block', fontSize: 12, marginBottom: 6, opacity: 0.85 }}>
                  订单编码 · Order code
                </span>
                <div
                  title={
                    licCodeLocked
                      ? language === 'en'
                        ? 'Locked after save'
                        : '保存后已固定'
                      : language === 'en'
                        ? 'Auto-assigned; locked after save'
                        : '自动生成，保存后不可修改'
                  }
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    minHeight: 42,
                    justifyContent: 'center',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.72)',
                    border: '1px solid rgba(96, 165, 250, 0.22)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: 15,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      color: licOrderCode.trim() ? '#f87171' : 'rgba(148, 163, 184, 0.65)',
                    }}
                  >
                    {licOrderCode.trim() || 'LIC-'}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.68, lineHeight: 1.35 }}>
                    {licCodeLocked
                      ? language === 'en'
                        ? 'Locked'
                        : language === 'my'
                          ? 'ချုပ်ထား'
                          : '已固定，不可修改'
                      : language === 'en'
                        ? 'Auto; locked after «Save draft»'
                        : language === 'my'
                          ? 'သိမ်းပြီးမှ အတည်ပြု'
                          : customerName.trim()
                            ? '保存草稿后不可再改'
                            : '填写客户名后自动生成'}
                  </span>
                </div>
              </div>
            </div>
          </ModalSection>

          {/* Section 1 */}
          <ModalSection>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              <span style={{ color: '#60a5fa', marginRight: 8 }}>1</span>
              注册号与口岸 · Register &amp; Port
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, opacity: 0.82, lineHeight: 1.55 }}>
              Register 固定 9 位数字；可从别处复制整单粘贴。卸货港填写城市或口岸英文/当地惯用写法。
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <label style={{ flex: '1 1 200px', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, marginBottom: 6, opacity: 0.85 }}>Register Number</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={32}
                  value={registerNo}
                  onChange={(e) => setRegisterNo(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="000000000 (9 位)"
                  style={inputBase}
                />
              </label>
              <label style={{ flex: '2 1 260px', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, marginBottom: 6, opacity: 0.85 }}>
                  Port Of Discharge（卸货港 / 城市）
                </span>
                <input
                  type="text"
                  value={portOfDischarge}
                  onChange={(e) => setPortOfDischarge(e.target.value)}
                  placeholder="例如: Yangon, Muse..."
                  style={inputBase}
                />
              </label>
            </div>
          </ModalSection>

          {/* Section 2 — 商品 */}
          <ModalSection style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                  <span style={{ color: '#60a5fa', marginRight: 8 }}>2</span>
                  商品明细
                </div>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.82, lineHeight: 1.55, maxWidth: 520 }}>
                  每笔批文可有多个商品；每张卡片填写 HS、描述与金额。Group 为整单分组，不随「添加商品」复制。当前 {lineItems.length} 条。
                </p>
              </div>
              <button
                type="button"
                onClick={addLine}
                style={{
                  padding: '9px 18px',
                  borderRadius: 11,
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.35) 0%, rgba(30, 58, 138, 0.3) 100%)',
                  color: '#e0f2fe',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 12px rgba(37, 99, 235, 0.2)',
                }}
              >
                + 添加商品
              </button>
            </div>

            <label
              style={{
                display: 'block',
                marginBottom: 14,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(251, 191, 36, 0.28)',
                background: 'rgba(251, 191, 36, 0.06)',
              }}
            >
              <span style={{ display: 'block', fontSize: 12, marginBottom: 6, opacity: 0.9, fontWeight: 700 }}>
                Group
              </span>
              <input
                type="text"
                value={cargoGroup}
                onChange={(e) => setCargoGroup(e.target.value)}
                placeholder="整单分组，例如 A / B / 批次号（导出 Excel 时写入 GROUP 列）"
                style={{ ...inputBase, width: '100%' }}
              />
            </label>

            {lineItems.map((row, idx) => (
              <div
                key={row.id}
                style={{
                  background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.42) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.14)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.18)',
                  borderRadius: 12,
                  padding: '14px 14px 12px',
                  marginBottom: idx < lineItems.length - 1 ? 12 : 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    fontSize: 13,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>
                    商品 {idx + 1} / 共 {lineItems.length} 条
                  </span>
                  <span style={{ opacity: 0.75, fontSize: 12 }}>
                    {lineItems.length <= 1 ? '至少保留 1 条' : (
                      <button
                        type="button"
                        onClick={() => confirmRemoveLine(row.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fca5a5',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          fontSize: 12,
                          padding: 0,
                        }}
                      >
                        移除此条
                      </button>
                    )}
                  </span>
                </div>

                <label style={{ display: 'block', marginBottom: 10 }}>
                  <span style={{ display: 'block', fontSize: 12, marginBottom: 6, opacity: 0.85 }}>H.S CODE（10 位）</span>
                  <input
                    type="text"
                    value={row.hsCode}
                    onChange={(e) => setLineField(row.id, { hsCode: e.target.value })}
                    placeholder="粘贴或输入 10 位关税编码"
                    style={{ ...inputBase, width: '100%' }}
                  />
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 12px 10px',
                      borderRadius: 12,
                      border: '1px solid rgba(56, 189, 248, 0.18)',
                      background: 'rgba(15, 23, 42, 0.35)',
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.9, fontWeight: 600 }}>
                      HS 证照图 → Excel「HS IMAGE」
                    </span>
                    <input
                      ref={(el) => {
                        fileInputsRef.current[`hs-${row.id}`] = el;
                      }}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const input = e.currentTarget;
                        const f = input.files?.[0];
                        if (!f) return;
                        try {
                          const dataUrl = await hsAttachmentToPreviewDataUrl(f);
                          setLineField(row.id, { hsImageName: f.name, hsImageDataUrl: dataUrl });
                        } catch {
                          window.alert('请上传 PDF、JPG 或 PNG，且文件需可被读取（PDF 将使用第一页生成预览）。');
                          setLineField(row.id, { hsImageName: '', hsImageDataUrl: '' });
                        }
                        input.value = '';
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => fileInputsRef.current[`hs-${row.id}`]?.click()}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          border: '1px solid rgba(96, 165, 250, 0.45)',
                          background: 'rgba(30, 58, 138, 0.4)',
                          color: '#93c5fd',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        上传 HS 图
                      </button>
                      {row.hsImageDataUrl || row.hsImageName ? (
                        <button
                          type="button"
                          onClick={() => setLineField(row.id, { hsImageName: '', hsImageDataUrl: '' })}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(248, 113, 113, 0.4)',
                            background: 'transparent',
                            color: '#fca5a5',
                            cursor: 'pointer',
                            fontSize: 11,
                          }}
                        >
                          清除 HS 图
                        </button>
                      ) : null}
                    </div>
                    <span style={{ fontSize: 10, opacity: 0.62, marginTop: 6, display: 'block' }}>
                      PDF / JPG / PNG；导出 Excel 时该列仅显示缩略图（不写入文件名）。
                    </span>
                    {row.hsImageDataUrl ? (
                      <div style={{ marginTop: 8 }}>
                        {row.hsImageName ? (
                          <span style={{ fontSize: 11, opacity: 0.75, display: 'block' }}>{row.hsImageName}</span>
                        ) : null}
                        <img
                          src={row.hsImageDataUrl}
                          alt=""
                          style={{
                            display: 'block',
                            marginTop: 6,
                            width: HS_ATTACHMENT_THUMB_PX,
                            height: HS_ATTACHMENT_THUMB_PX,
                            objectFit: 'contain',
                            borderRadius: 10,
                            border: '1px solid rgba(148, 163, 184, 0.35)',
                            background: 'rgba(15, 23, 42, 0.6)',
                          }}
                        />
                      </div>
                    ) : row.hsImageName ? (
                      <span style={{ fontSize: 11, opacity: 0.7, marginTop: 6, display: 'block' }}>{row.hsImageName}</span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      padding: '12px 12px 10px',
                      borderRadius: 12,
                      border: '1px solid rgba(45, 212, 191, 0.2)',
                      background: 'rgba(15, 23, 42, 0.35)',
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.9, fontWeight: 600 }}>
                      包装图 PACKAGE → Excel「PACKAGE IMAGE」
                    </span>
                    <input
                      ref={(el) => {
                        fileInputsRef.current[`pkg-${row.id}`] = el;
                      }}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const input = e.currentTarget;
                        const f = input.files?.[0];
                        if (!f) return;
                        try {
                          const dataUrl = await hsAttachmentToPreviewDataUrl(f);
                          setLineField(row.id, { packageImageName: f.name, packageImageDataUrl: dataUrl });
                        } catch {
                          window.alert('请上传 PDF、JPG 或 PNG，且文件需可被读取（PDF 将使用第一页生成预览）。');
                          setLineField(row.id, { packageImageName: '', packageImageDataUrl: '' });
                        }
                        input.value = '';
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => fileInputsRef.current[`pkg-${row.id}`]?.click()}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          border: '1px solid rgba(45, 212, 191, 0.45)',
                          background: 'rgba(13, 148, 136, 0.28)',
                          color: '#5eead4',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        上传包装图
                      </button>
                      {row.packageImageDataUrl || row.packageImageName ? (
                        <button
                          type="button"
                          onClick={() => setLineField(row.id, { packageImageName: '', packageImageDataUrl: '' })}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(248, 113, 113, 0.4)',
                            background: 'transparent',
                            color: '#fca5a5',
                            cursor: 'pointer',
                            fontSize: 11,
                          }}
                        >
                          清除包装图
                        </button>
                      ) : null}
                    </div>
                    <span style={{ fontSize: 10, opacity: 0.62, marginTop: 6, display: 'block' }}>
                      与 HS 图独立；可同时保留两张。
                    </span>
                    {row.packageImageDataUrl ? (
                      <div style={{ marginTop: 8 }}>
                        {row.packageImageName ? (
                          <span style={{ fontSize: 11, opacity: 0.75, display: 'block' }}>{row.packageImageName}</span>
                        ) : null}
                        <img
                          src={row.packageImageDataUrl}
                          alt=""
                          style={{
                            display: 'block',
                            marginTop: 6,
                            width: HS_ATTACHMENT_THUMB_PX,
                            height: HS_ATTACHMENT_THUMB_PX,
                            objectFit: 'contain',
                            borderRadius: 10,
                            border: '1px solid rgba(148, 163, 184, 0.35)',
                            background: 'rgba(15, 23, 42, 0.6)',
                          }}
                        />
                      </div>
                    ) : row.packageImageName ? (
                      <span style={{ fontSize: 11, opacity: 0.7, marginTop: 6, display: 'block' }}>{row.packageImageName}</span>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '3fr 1fr',
                    gap: 10,
                    marginBottom: 12,
                    alignItems: 'stretch',
                  }}
                >
                  <label style={{ display: 'block', minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>
                      货物描述 · Cargo Description
                    </span>
                    <AutoHeightTextarea
                      value={row.cargoDesc}
                      onChange={(e) => setLineField(row.id, { cargoDesc: e.target.value })}
                      placeholder={'Cargo Name & Brand\nPower · Weight · Size'}
                      minHeightPx={88}
                      maxHeightPx={440}
                      lineHeight={1.5}
                    />
                  </label>
                  <label style={{ display: 'block', minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.85 }}>Myanmar Description</span>
                    <AutoHeightTextarea
                      value={row.myanmarDesc}
                      onChange={(e) => setLineField(row.id, { myanmarDesc: e.target.value })}
                      placeholder="မြန်မာဘာသာဖြင့် ဖော်ပြပါ"
                      minHeightPx={88}
                      maxHeightPx={440}
                      lineHeight={1.45}
                    />
                  </label>
                </div>

                <div
                  style={{
                    ...lineMetricsShellStyle,
                    gridTemplateColumns: isMobile
                      ? 'repeat(2, minmax(0, 1fr))'
                      : 'minmax(96px, 0.95fr) minmax(108px, 1.2fr) minmax(118px, 1.05fr) minmax(100px, 1.1fr) minmax(132px, 1.35fr)',
                    columnGap: isMobile ? 10 : 14,
                    rowGap: isMobile ? 12 : 0,
                  }}
                >
                  <label style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={lineMetricsLabelStyle}>Unit code</span>
                    <select
                      value={row.unitCode}
                      onChange={(e) => setLineField(row.id, { unitCode: e.target.value })}
                      style={{ ...lineMetricsInputStyle, cursor: 'pointer' }}
                    >
                      {!isKnownUnit(row.unitCode) && row.unitCode ? (
                        <option value={row.unitCode}>{row.unitCode}</option>
                      ) : null}
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={lineMetricsLabelStyle}>Set price · 单价</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.unitPrice}
                      onChange={(e) => setLineField(row.id, { unitPrice: e.target.value })}
                      placeholder="例如 0.6"
                      style={{ ...lineMetricsInputStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={lineMetricsLabelStyle}>Currency</span>
                    <select
                      value={row.currency}
                      onChange={(e) => setLineField(row.id, { currency: e.target.value })}
                      style={{ ...lineMetricsInputStyle, cursor: 'pointer' }}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={lineMetricsLabelStyle}>Quantity · 数量</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.quantity}
                      onChange={(e) => setLineField(row.id, { quantity: e.target.value })}
                      placeholder="整数 (大额可用)"
                      style={{ ...lineMetricsInputStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    />
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      gridColumn: isMobile ? '1 / -1' : undefined,
                    }}
                  >
                    <span style={lineMetricsLabelStyle}>Line total</span>
                    <div
                      style={{
                        ...lineMetricsInputStyle,
                        opacity: 0.98,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#7dd3fc',
                        background: 'rgba(30, 58, 95, 0.55)',
                        border: '1px solid rgba(56, 189, 248, 0.28)',
                      }}
                    >
                      {formatLineTotal(row.currency, parseNumberLoose(row.unitPrice), parseNumberLoose(row.quantity))}
                    </div>
                  </label>
                </div>
              </div>
            ))}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>TOTAL AMOUNT · 商品金额合计</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#93c5fd' }}>{goodsTotalLabel}</div>
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
                  各币种分别等于同币种下全部 Line Total 之和（多币种时用「 · 」分隔）。
                </div>
              </div>
              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  fontSize: 13,
                  fontWeight: 700,
                  maxWidth: isMobile ? '100%' : 420,
                  textAlign: isMobile ? 'left' : 'right',
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                }}
                title="按 Unit code 汇总各行数量"
              >
                {unitTotalsSummary}
              </div>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 11, opacity: 0.72, lineHeight: 1.55 }}>
              操作提示：新卡片会追加在下方。填写时请从上到下逐条完成。留空的 Register / HS 亦可保存。
            </p>
          </ModalSection>

          {/* Section 3 */}
          <ModalSection>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              <span style={{ color: '#60a5fa', marginRight: 8 }}>3</span>
              期限 · ED Date
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.82 }}>指标或许可证相关截止日期。</p>
            <label style={{ display: 'block', maxWidth: 220 }}>
              <span style={{ display: 'block', fontSize: 12, marginBottom: 6, opacity: 0.85 }}>ED date</span>
              <input
                type="date"
                value={edDate}
                onChange={(e) => setEdDate(e.target.value)}
                style={{ ...inputBase, ...dateInputModalStyle }}
              />
              {edDate.trim() ? (
                <div style={{ fontSize: 11, opacity: 0.78, marginTop: 8, color: '#bae6fd' }}>
                  {language === 'en' ? 'Selected: ' : language === 'my' ? 'ရွေးချယ်: ' : '已选 · '}
                  {formatDraftModalDate(edDate.trim())}
                </div>
              ) : null}
            </label>
          </ModalSection>

          {/* Section 4 */}
          <ModalSection>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              <span style={{ color: '#60a5fa', marginRight: 8 }}>4</span>
              三期款项 · Deposits（货币 MMK）
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, opacity: 0.82, lineHeight: 1.55 }}>
              以下三项均为缅币金额；右侧填写 Total Charges For License（总额），底部余额 = Total Charges − 三期合计。每一期可单独记录
              <strong style={{ color: '#93c5fd' }}> 付款日期（日/月/年）</strong>
              。金额 &gt; 0 时显示「汇款 / 收款账号」便于对账。
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', maxWidth: 320, marginLeft: 'auto' }}>
                <span style={{ display: 'block', fontSize: 12, marginBottom: 6, opacity: 0.85, textAlign: 'right' }}>
                  TOTAL CHARGES FOR LICENSE
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totalCharges}
                    onChange={(e) => setTotalCharges(digitsOnlyToCommaMmk(e.target.value))}
                    placeholder="例如 10,000,000"
                    style={{ ...inputBase, textAlign: 'right' }}
                  />
                  <span style={{ fontSize: 13, opacity: 0.85, flexShrink: 0 }}>MMK</span>
                </div>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
              <div style={depositPhaseCardShell('#38bdf8')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={depositStepBadgeShell('#38bdf8')}>1</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', lineHeight: 1.35 }}>
                      First · 申请批文订金
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>First deposited · MMK</div>
                  </div>
                </div>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.75, marginBottom: 6 }}>金额 Amount</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={depositFirst}
                      onChange={(e) => setDepositFirst(digitsOnlyToCommaMmk(e.target.value))}
                      placeholder="例如 10,000,000"
                      style={{ ...inputBase, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 12, opacity: 0.8, flexShrink: 0 }}>MMK</span>
                  </div>
                </label>
                <label style={{ display: 'block', marginTop: 12 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#7dd3fc', marginBottom: 4 }}>
                    {payDateLabel}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.65, marginBottom: 8 }}>{payDateSub}</span>
                  <input
                    type="date"
                    value={depositFirstPaidOn}
                    onChange={(e) => setDepositFirstPaidOn(e.target.value)}
                    style={dateInputModalStyle}
                  />
                  {depositFirstPaidOn.trim() ? (
                    <div style={{ fontSize: 11, opacity: 0.78, marginTop: 8, color: '#bae6fd' }}>
                      {language === 'en' ? 'Selected: ' : language === 'my' ? 'ရွေးချယ်: ' : '已选日期 · '}
                      {formatDraftModalDate(depositFirstPaidOn.trim())}
                    </div>
                  ) : null}
                </label>
                {d1 > 0 ? (
                  <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                    <input
                      type="text"
                      value={firstHandler}
                      onChange={(e) => setFirstHandler(e.target.value)}
                      placeholder="汇款账号名"
                      style={inputBase}
                    />
                    <input
                      type="text"
                      value={firstAccount}
                      onChange={(e) => setFirstAccount(e.target.value)}
                      placeholder="收款账号名"
                      style={inputBase}
                    />
                  </div>
                ) : null}
              </div>

              <div style={depositPhaseCardShell('#a78bfa')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={depositStepBadgeShell('#a78bfa')}>2</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', lineHeight: 1.35 }}>
                      Second · ANNI Fees
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>Second instalment · MMK</div>
                  </div>
                </div>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.75, marginBottom: 6 }}>金额 Amount</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={depositSecond}
                      onChange={(e) => setDepositSecond(digitsOnlyToCommaMmk(e.target.value))}
                      placeholder="例如 10,000,000"
                      style={{ ...inputBase, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 12, opacity: 0.8, flexShrink: 0 }}>MMK</span>
                  </div>
                </label>
                <label style={{ display: 'block', marginTop: 12 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#c4b5fd', marginBottom: 4 }}>
                    {payDateLabel}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.65, marginBottom: 8 }}>{payDateSub}</span>
                  <input
                    type="date"
                    value={depositSecondPaidOn}
                    onChange={(e) => setDepositSecondPaidOn(e.target.value)}
                    style={dateInputModalStyle}
                  />
                  {depositSecondPaidOn.trim() ? (
                    <div style={{ fontSize: 11, opacity: 0.78, marginTop: 8, color: '#ddd6fe' }}>
                      {language === 'en' ? 'Selected: ' : language === 'my' ? 'ရွေးချယ်: ' : '已选日期 · '}
                      {formatDraftModalDate(depositSecondPaidOn.trim())}
                    </div>
                  ) : null}
                </label>
                {d2 > 0 ? (
                  <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                    <input
                      type="text"
                      value={secondHandler}
                      onChange={(e) => setSecondHandler(e.target.value)}
                      placeholder="汇款账号名"
                      style={inputBase}
                    />
                    <input
                      type="text"
                      value={secondAccount}
                      onChange={(e) => setSecondAccount(e.target.value)}
                      placeholder="收款账号名"
                      style={inputBase}
                    />
                  </div>
                ) : null}
              </div>

              <div style={depositPhaseCardShell('#34d399')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={depositStepBadgeShell('#34d399')}>3</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', lineHeight: 1.35 }}>Final · LICENSE</div>
                    <div style={{ fontSize: 11, opacity: 0.72, marginTop: 3 }}>{fullPaySub}</div>
                  </div>
                </div>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.75, marginBottom: 6 }}>金额 Amount</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={depositThird}
                      onChange={(e) => setDepositThird(digitsOnlyToCommaMmk(e.target.value))}
                      placeholder="例如 10,000,000"
                      style={{ ...inputBase, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 12, opacity: 0.8, flexShrink: 0 }}>MMK</span>
                  </div>
                </label>
                <label style={{ display: 'block', marginTop: 12 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6ee7b7', marginBottom: 4 }}>
                    {payDateLabel}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.65, marginBottom: 8 }}>
                    {language === 'zh'
                      ? '付清全款日期（第三期）'
                      : language === 'en'
                        ? 'Final payment date (3rd)'
                        : 'နောက်ဆုံးပေးချေမှု'}
                  </span>
                  <input
                    type="date"
                    value={depositThirdPaidOn}
                    onChange={(e) => setDepositThirdPaidOn(e.target.value)}
                    style={dateInputModalStyle}
                  />
                  {depositThirdPaidOn.trim() ? (
                    <div style={{ fontSize: 11, opacity: 0.78, marginTop: 8, color: '#a7f3d0' }}>
                      {language === 'en' ? 'Selected: ' : language === 'my' ? 'ရွေးချယ်: ' : '已选日期 · '}
                      {formatDraftModalDate(depositThirdPaidOn.trim())}
                    </div>
                  ) : null}
                </label>
                {d3 > 0 ? (
                  <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                    <input
                      type="text"
                      value={thirdHandler}
                      onChange={(e) => setThirdHandler(e.target.value)}
                      placeholder="汇款账号名"
                      style={inputBase}
                    />
                    <input
                      type="text"
                      value={thirdAccount}
                      onChange={(e) => setThirdAccount(e.target.value)}
                      placeholder="收款账号名"
                      style={inputBase}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                BALANCE · 余额（TOTAL CHARGES − 三期款项合计）
              </div>
              <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 8 }}>
                Total Charges For License − (申请批文订金 + ANNI Fees + License)
              </div>
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(96, 165, 250, 0.25)',
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#e2e8f0',
                }}
              >
                {formatMmk(balanceMmk)}
              </div>
            </div>
          </ModalSection>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: 'flex-end',
              marginTop: 12,
              paddingTop: 18,
              borderTop: '1px solid rgba(148, 163, 184, 0.14)',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: '1px solid rgba(148, 163, 184, 0.4)',
                background: 'transparent',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              style={{
                padding: '10px 22px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
              }}
            >
              {initialDraft ? '保存修改' : '保存草稿'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type MetricHubPanel = null | 'prices' | 'personal';

/** 进口指标批文草稿台账（列表 Supabase import_metric_drafts） */
const ImportMetricDraftsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [hubPanelOpen, setHubPanelOpen] = useState<MetricHubPanel>(null);
  const [editingDraft, setEditingDraft] = useState<ImportMetricDraftSaved | null>(null);
  const [lineItemsPreviewDraft, setLineItemsPreviewDraft] = useState<ImportMetricDraftSaved | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<ImportMetricDraftSaved[]>([]);
  const [tableSort, setTableSort] = useState<{
    key: DraftTableSortKey | null;
    direction: DraftTableSortDirection;
  }>({ key: null, direction: 'asc' });

  const reloadDrafts = useCallback(async () => {
    const rows = await importMetricDraftService.listAll();
    setSavedDrafts(rows.map(importMetricDbRowToSaved));
  }, []);

  useEffect(() => {
    void reloadDrafts();
  }, [reloadDrafts]);

  useEffect(() => {
    const openPrice = searchParams.get('openPrice') === '1';
    const openPersonal = searchParams.get('openPersonal') === '1';
    if (!openPrice && !openPersonal) return;
    setHubPanelOpen(openPersonal ? 'personal' : 'prices');
    const next = new URLSearchParams(searchParams);
    next.delete('openPrice');
    next.delete('openPersonal');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (hubPanelOpen == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHubPanelOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hubPanelOpen]);

  useEffect(() => {
    const id = 'import-metric-drafts-table-scroll-style';
    if (document.getElementById(id)) return undefined;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      .import-metric-drafts-table-scroll::-webkit-scrollbar { height: 12px; }
      .import-metric-drafts-table-scroll::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.5);
        border-radius: 8px;
        margin: 0 8px;
      }
      .import-metric-drafts-table-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, rgba(148, 163, 184, 0.55), rgba(100, 116, 139, 0.55));
        border-radius: 8px;
        border: 2px solid rgba(15, 23, 42, 0.5);
      }
      .import-metric-drafts-table-scroll::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, rgba(186, 230, 253, 0.65), rgba(125, 211, 252, 0.55));
      }
    `;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);

  const persistDraft = useCallback(
    async (draft: ImportMetricDraftSaved) => {
      const created_by =
        (typeof window !== 'undefined' &&
          (sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser'))) ||
        'admin';
      const write = draftToDbWrite(draft);
      const missingColsMsg =
        language === 'en'
          ? 'Other fields were saved. Payment dates were skipped because import_metric_drafts is missing DATE columns: deposit_first_paid_on, deposit_second_paid_on, deposit_third_paid_on.\n\nRun the SQL in repo file supabase/migrations/20260509134500_import_metric_deposit_paid_dates.sql (Supabase → SQL Editor), then save again.'
          : language === 'my'
            ? 'အချို့သာသိမ်းပြီး။ ငွေပေးချေရက်များ မှတ်မှတ်မရပါ ။ Supabase တွင် migration SQL ဖြည့်ပါ။'
            : '其余内容已保存，但三期「付款日期」未写入：数据库表缺少列 deposit_first_paid_on、deposit_second_paid_on、deposit_third_paid_on。\n\n请在 Supabase Dashboard → SQL Editor 执行项目内文件 supabase/migrations/20260509134500_import_metric_deposit_paid_dates.sql，执行成功后重新打开本草稿再点「保存修改」即可同步付款日期。';
      if (isUuid(draft.id)) {
        const result = await importMetricDraftService.update(draft.id, write);
        if (!result.ok) {
          throw new Error(result.message);
        }
        if ('warningCode' in result && result.warningCode === 'missing_deposit_date_columns') {
          window.alert(missingColsMsg);
        }
      } else {
        const result = await importMetricDraftService.insert({ ...write, created_by });
        if (!result.ok) {
          throw new Error(result.message);
        }
        if ('warningCode' in result && result.warningCode === 'missing_deposit_date_columns') {
          window.alert(missingColsMsg);
        }
      }
      await reloadDrafts();
    },
    [reloadDrafts, language],
  );

  const removeDraft = useCallback(
    async (id: string, confirmMsg: string) => {
      if (!window.confirm(confirmMsg)) return;
      if (!isUuid(id)) return;
      const ok = await importMetricDraftService.remove(id);
      if (!ok) {
        window.alert(
          language === 'en'
            ? 'Could not delete. Try again.'
            : language === 'my'
              ? 'မဖျက်နိုင်ပါ။'
              : '删除失败，请重试。',
        );
        return;
      }
      await reloadDrafts();
    },
    [language, reloadDrafts],
  );

  const t =
    language === 'en'
      ? {
          kicker: 'ML Express · Admin',
          hubTitle: 'Metric management',
          draftsTabBtn: '📑 Import metric drafts',
          pricesTabBtn: '💲 Product prices',
          personalTabBtn: '🧾 Personal expenses',
          proxyTabBtn: '🛒 Proxy purchase',
          title: 'Import metric drafts',
          subtitle:
            'Draft permit ledger: includes customer name; each entry can list multiple line items, each with HS, description and valuation on one card. Saved lines roll up to the «Import price list». The «Myanmar Description» / count column is clickable (shows «1 item» or «N items» plus a short excerpt) to open Cargo details.',
          newDraft: 'New draft',
          back: 'Dashboard',
          empty: 'No records yet. Click «New draft».',
          colRegister: 'REGISTER NO.',
          colOrderNo: 'ORDER CODE',
          colStart: 'START DATE',
          colEd: 'ED DATE',
          colCustomer: 'Customer',
          colPort: 'Port of discharge',
          colMmDesc: 'Myanmar Description',
          colQty: 'Total qty',
          colAmt: 'Total amount',
          colActions: 'Actions',
          exportLineItems: 'Excel line items',
          exportPermitSummary: 'Excel permit summary',
          tableScrollHint:
            'On touch screens, swipe left or right on the table; on desktop, drag the bar below to see all columns.',
          edit: 'Edit',
          delete: 'Delete',
          deleteConfirm: 'Delete this draft? This cannot be undone.',
        }
      : language === 'my'
        ? {
            kicker: 'ML Express · Admin',
            hubTitle: 'မီတြခစီမံခန့်ခွဲမှု',
            draftsTabBtn: '📑 သွင်းကုန် မီတြိ မူကြမ်း',
            pricesTabBtn: '💲 ကုန်စျေးနှုန်း',
            personalTabBtn: '🧾 ကိုယ်ပိုင်ကုန်ကျစရိတ်',
            proxyTabBtn: '🛒 ကြားခံဝယ်ယူမှု',
            title: 'သွင်းကုန် မီတြိခြင်းမူကြမ်း',
            subtitle:
              'ခွင့်ပြုချက်မူကြမ်း — ဖောက်သည်အမည်ပါသည်။ တစ်မှုတွင် ကုန်ပစ္စည်း များစွာ မှတ်တမ်းတင်နိုင်ပြီး HS၊ ဖော်ပြချက် နှင့် တန်ဖိုး။ သိမ်းပြီးပါက 「သွင်းကုန်စျေးနှုန်းဇယား」 သို့ စုသည်။',
            newDraft: 'မူကြမ်းအသစ်',
            back: 'ဒါဘုတ်',
            empty: 'မှတ်တမ်းမရှိပါ။ «မူကြမ်းအသစ်» ကိုနှိပ်ပါ။',
            colRegister: 'REGISTER NO.',
            colOrderNo: 'ORDER CODE',
            colStart: 'START DATE',
            colEd: 'ED DATE',
            colCustomer: 'ဖောက်သည်',
            colPort: 'ကားဆင်းဆိပ်',
            colMmDesc: 'Myanmar Description',
            colQty: 'အရေအတွင်း စုစုပေါင်း',
            colAmt: 'ငွေပမာဏ စုစုပေါင်း',
            colActions: 'လုပ်ဆောင်ချက်များ',
            exportLineItems: 'Excel ကုန်ပစ္စည်းများ',
            exportPermitSummary: 'Excel ခွင့်ပြုချက်အကျဉ်း',
            tableScrollHint: 'ကော်လံအားလုံး ကြည့်ရန် ဘေးသို့ ပွတ်ဆွဲပါ။',
            edit: 'ပြင်ဆင်ရန်',
            delete: 'ဖျက်ရန်',
            deleteConfirm: 'ဤမူကြမ်းကို ဖျက်မလား?',
          }
        : {
            kicker: 'ML Express · Admin',
            hubTitle: '指标管理',
            draftsTabBtn: '📑 进口指标草稿',
            pricesTabBtn: '💲 商品价格',
            personalTabBtn: '🧾 个人开销',
            proxyTabBtn: '🛒 代购',
            title: '进口指标草稿',
            subtitle:
              '批文草稿台账：含客户名称；单笔可登记多条商品，每条在一张卡片内完成 HS、描述与计价。保存后的明细会汇总到「进口价格表」。列表「Myanmar Description」列可点击，显示「共 N 项」标签（含 N=1）及摘要后查看 Cargo 明细。',
            newDraft: '新建草稿',
            back: '控制台',
            empty: '暂无记录，请点击「新建草稿」。',
            colRegister: 'REGISTER NO.',
            colOrderNo: 'ORDER CODE',
            colStart: 'START DATE',
            colEd: 'ED DATE',
            colCustomer: '客户名称',
            colPort: '卸货港',
            colMmDesc: 'Myanmar Description',
            colQty: '数量合计',
            colAmt: '金额汇总',
            colActions: '操作',
            exportLineItems: 'Excel商品明细',
            exportPermitSummary: 'Excel批文概要',
            tableScrollHint: '← 在表格区域上左右滑动（或拖动底部滚动条）可查看全部列 →',
            edit: '编辑',
            delete: '删除',
            deleteConfirm: '确定删除该条草稿？此操作不可恢复。',
          };

  const dateLocale = language === 'en' ? 'en-US' : language === 'my' ? 'my-MM' : 'zh-CN';

  const displayedDrafts = useMemo(() => {
    if (!tableSort.key) return savedDrafts;
    return sortImportMetricDrafts(savedDrafts, tableSort.key, tableSort.direction);
  }, [savedDrafts, tableSort]);

  const toggleTableSort = useCallback((key: DraftTableSortKey) => {
    setTableSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  }, []);

  const draftTableColumns: {
    sortKey?: DraftTableSortKey;
    label: string;
    align?: 'left' | 'right';
    compact?: boolean;
  }[] = [
    { sortKey: 'registerNo', label: t.colRegister, compact: true },
    { sortKey: 'licOrderCode', label: t.colOrderNo, compact: true },
    { sortKey: 'startDate', label: t.colStart, compact: true },
    { sortKey: 'edDate', label: t.colEd, compact: true },
    { sortKey: 'customerName', label: t.colCustomer },
    { sortKey: 'portOfDischarge', label: t.colPort },
    { sortKey: 'lineItemCount', label: t.colMmDesc },
    { sortKey: 'totalQty', label: t.colQty },
    { sortKey: 'totalAmount', label: t.colAmt },
    { label: t.colActions, align: 'right' },
  ];

  const draftsTabSelected = hubPanelOpen === null;
  const pricesTabSelected = hubPanelOpen === 'prices';
  const personalTabSelected = hubPanelOpen === 'personal';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 40%, #312e81 100%)',
        padding: isMobile ? '14px 12px 96px' : '24px 20px 96px',
        color: '#fff',
        fontFamily:
          "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif",
        boxSizing: 'border-box',
      }}
    >
      <NewImportMetricDraftModal
        open={draftModalOpen}
        onClose={() => {
          setDraftModalOpen(false);
          setEditingDraft(null);
        }}
        isMobile={isMobile}
        onSave={persistDraft}
        initialDraft={editingDraft}
      />

      <ImportMetricLineItemsPreviewModal
        open={lineItemsPreviewDraft != null}
        onClose={() => setLineItemsPreviewDraft(null)}
        draft={lineItemsPreviewDraft}
        isMobile={isMobile}
        language={language}
      />

      {hubPanelOpen ? (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.78)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: isMobile ? '10px' : '22px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setHubPanelOpen(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={hubPanelOpen === 'prices' ? t.pricesTabBtn : t.personalTabBtn}
            style={{
              maxWidth: hubPanelOpen === 'personal' ? 1180 : 1340,
              margin: '0 auto',
              background:
                hubPanelOpen === 'personal'
                  ? 'linear-gradient(165deg, #0a0f1c 0%, #0f172a 28%, #172554 55%, #1e1b4b 100%)'
                  : 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 40%, #1a1740 100%)',
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.22)',
              boxShadow: '0 28px 90px rgba(0,0,0,0.5)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {hubPanelOpen === 'prices' ? (
              <ImportPriceListPage variant="embedded" onCloseEmbedded={() => setHubPanelOpen(null)} />
            ) : (
              <PersonalExpensePage variant="embedded" onCloseEmbedded={() => setHubPanelOpen(null)} />
            )}
          </div>
        </div>
      ) : null}

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 22,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: 0.75,
                marginBottom: 6,
              }}
            >
              {t.kicker}
            </div>
            <h2
              style={{
                margin: '4px 0 0',
                fontSize: isMobile ? '1.2rem' : '1.35rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
              }}
            >
              {t.hubTitle}
            </h2>
            <div
              role="tablist"
              aria-label={t.hubTitle}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 14,
                marginBottom: 2,
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={draftsTabSelected}
                onClick={() => setHubPanelOpen(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  border: draftsTabSelected ? 'none' : '1px solid rgba(255,255,255,0.22)',
                  background: draftsTabSelected
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: draftsTabSelected ? 700 : 600,
                  fontSize: 13,
                  boxShadow: draftsTabSelected ? '0 6px 18px rgba(37, 99, 235, 0.3)' : 'none',
                }}
              >
                {t.draftsTabBtn}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pricesTabSelected}
                onClick={() => setHubPanelOpen('prices')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  border: pricesTabSelected ? 'none' : '1px solid rgba(255,255,255,0.22)',
                  background: pricesTabSelected
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: pricesTabSelected ? 700 : 600,
                  fontSize: 13,
                  boxShadow: pricesTabSelected ? '0 6px 18px rgba(79, 70, 229, 0.32)' : 'none',
                }}
              >
                {t.pricesTabBtn}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={personalTabSelected}
                onClick={() => setHubPanelOpen('personal')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  border: personalTabSelected ? 'none' : '1px solid rgba(255,255,255,0.22)',
                  background: personalTabSelected
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: personalTabSelected ? 700 : 600,
                  fontSize: 13,
                  boxShadow: personalTabSelected ? '0 6px 18px rgba(4, 120, 87, 0.35)' : 'none',
                }}
              >
                {t.personalTabBtn}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={false}
                onClick={() => navigate('/admin/proxy-purchase')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.22)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {t.proxyTabBtn}
              </button>
            </div>
            <p
              style={{
                margin: '12px 0 0',
                opacity: 0.9,
                fontSize: isMobile ? 13 : 14,
                maxWidth: 920,
                lineHeight: 1.6,
              }}
            >
              {t.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setEditingDraft(null);
                setDraftModalOpen(true);
              }}
              style={{
                padding: '11px 22px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 14,
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
              }}
            >
              {t.newDraft}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ← {t.back}
            </button>
          </div>
        </header>

        <section
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            borderRadius: 16,
            border: '1px solid rgba(148, 163, 184, 0.18)',
            overflow: 'hidden',
          }}
        >
          <p
            style={{
              margin: 0,
              padding: isMobile ? '12px 14px 8px' : '12px 18px 8px',
              fontSize: isMobile ? 12 : 12,
              opacity: 0.72,
              lineHeight: 1.5,
              borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
            }}
          >
            {t.tableScrollHint}
          </p>
          <div
            className="import-metric-drafts-table-scroll"
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: 'contain',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(148, 163, 184, 0.55) rgba(15, 23, 42, 0.35)',
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: 1220,
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.85)', borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                  {draftTableColumns.map((col) => {
                    const sortable = Boolean(col.sortKey);
                    const active = sortable && tableSort.key === col.sortKey;
                    const sortMark = active
                      ? tableSort.direction === 'asc'
                        ? ' ▲'
                        : ' ▼'
                      : sortable
                        ? ' ⇅'
                        : '';
                    const headerInner = (
                      <>
                        {col.label}
                        {sortable ? (
                          <span
                            style={{
                              marginLeft: 4,
                              fontSize: 10,
                              opacity: active ? 1 : 0.45,
                              color: active ? '#7dd3fc' : 'rgba(148, 163, 184, 0.9)',
                            }}
                            aria-hidden
                          >
                            {sortMark.trim() || '⇅'}
                          </span>
                        ) : null}
                      </>
                    );
                    return (
                      <th
                        key={col.sortKey ?? col.label}
                        style={{
                          textAlign: col.align === 'right' ? 'right' : 'left',
                          padding: 0,
                          fontWeight: 700,
                          verticalAlign: 'middle',
                        }}
                      >
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleTableSort(col.sortKey!)}
                            title={
                              language === 'en'
                                ? active
                                  ? `Sorted ${tableSort.direction === 'asc' ? 'A→Z' : 'Z→A'}; click to reverse`
                                  : 'Click to sort'
                                : language === 'my'
                                  ? 'စီရန် နှိပ်ပါ'
                                  : active
                                    ? `已${tableSort.direction === 'asc' ? '升序' : '降序'}；再次点击切换`
                                    : '点击排序'
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              width: '100%',
                              textAlign: col.align === 'right' ? 'right' : 'left',
                              padding: '14px 16px',
                              margin: 0,
                              border: 'none',
                              background: active
                                ? 'rgba(37, 99, 235, 0.22)'
                                : 'transparent',
                              color: 'rgba(248, 250, 252, 0.95)',
                              cursor: 'pointer',
                              fontWeight: 700,
                              letterSpacing: col.compact ? '0.04em' : 'normal',
                              fontSize: col.compact ? 12 : 13,
                              whiteSpace: 'nowrap',
                              fontFamily: 'inherit',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!active) {
                                e.currentTarget.style.background = 'rgba(51, 65, 85, 0.55)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = active
                                ? 'rgba(37, 99, 235, 0.22)'
                                : 'transparent';
                            }}
                          >
                            {headerInner}
                          </button>
                        ) : (
                          <div
                            style={{
                              padding: '14px 16px',
                              letterSpacing: col.compact ? '0.04em' : 'normal',
                              fontSize: col.compact ? 12 : 13,
                              color: 'rgba(248, 250, 252, 0.95)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {headerInner}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {savedDrafts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: '52px 20px',
                        textAlign: 'center',
                        color: 'rgba(226, 232, 240, 0.72)',
                        fontSize: 14,
                      }}
                    >
                      {t.empty}
                    </td>
                  </tr>
                ) : (
                  displayedDrafts.map((d, rowIdx) => {
                    const { goodsTotalLabel, unitTotalsSummary } = computeGoodsTotalLabelAndUnits(d.lineItems);
                    const regDisplay = d.registerNo?.trim() ? d.registerNo : '—';
                    return (
                      <tr
                        key={d.id}
                        style={{
                          background: rowIdx % 2 === 0 ? 'rgba(15, 23, 42, 0.25)' : 'transparent',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
                          verticalAlign: 'top',
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{regDisplay}</td>
                        <td
                          style={{
                            padding: '12px 16px',
                            color: d.licOrderCode?.trim() ? '#f87171' : 'rgba(148, 163, 184, 0.75)',
                            whiteSpace: 'nowrap',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontWeight: 700,
                            fontSize: 13,
                            letterSpacing: d.licOrderCode?.trim() ? '0.04em' : 'normal',
                          }}
                        >
                          {d.licOrderCode?.trim() || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                          {formatDisplayDate(d.startDate, dateLocale)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                          {formatDisplayDate(d.edDate, dateLocale)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{d.customerName?.trim() || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{d.portOfDischarge?.trim() || '—'}</td>
                        <td
                          style={{
                            padding: '12px 14px',
                            color: '#cbd5e1',
                            maxWidth: 300,
                            minWidth: 148,
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            verticalAlign: 'top',
                          }}
                        >
                          {(() => {
                            const lines = d.lineItems;
                            const n = lines.length;
                            if (!n) return '—';
                            const rest = myanmarMultiRestSnippet(lines);
                            const countBadge =
                              language === 'en' ? (
                                <>
                                  <span
                                    style={{
                                      fontVariantNumeric: 'tabular-nums',
                                      fontWeight: 900,
                                      color: '#fef08a',
                                    }}
                                  >
                                    {n}
                                  </span>
                                  <span style={{ marginLeft: 5, opacity: 0.92 }}>
                                    {n > 1 ? 'items' : 'item'}
                                  </span>
                                </>
                              ) : language === 'my' ? (
                                <>
                                  <span
                                    style={{
                                      fontVariantNumeric: 'tabular-nums',
                                      fontWeight: 900,
                                      color: '#fef08a',
                                      marginRight: 4,
                                    }}
                                  >
                                    {n}
                                  </span>
                                  <span style={{ opacity: 0.92 }}>ခု</span>
                                </>
                              ) : (
                                <>
                                  <span style={{ opacity: 0.88 }}>共</span>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      margin: '0 5px',
                                      minWidth: '1.15em',
                                      textAlign: 'center',
                                      fontVariantNumeric: 'tabular-nums',
                                      fontWeight: 900,
                                      fontSize: '1.08em',
                                      color: '#fef9c3',
                                      textShadow: '0 0 14px rgba(253, 224, 71, 0.35)',
                                    }}
                                  >
                                    {n}
                                  </span>
                                  <span style={{ opacity: 0.88 }}>项</span>
                                </>
                              );
                            return (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'stretch',
                                  gap: 10,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setLineItemsPreviewDraft(d)}
                                  title={
                                    language === 'en'
                                      ? 'Open line items'
                                      : language === 'my'
                                        ? 'ကုန်ပစ္စည်းစာရင်းဖွင့်ရန်'
                                        : '查看商品明细'
                                  }
                                  style={{
                                    alignSelf: 'flex-start',
                                    padding: '6px 16px',
                                    borderRadius: 999,
                                    border: '1px solid rgba(125, 211, 252, 0.48)',
                                    background:
                                      'linear-gradient(155deg, rgba(37, 99, 235, 0.5) 0%, rgba(8, 145, 178, 0.38) 100%)',
                                    color: '#e0f2fe',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    letterSpacing: language === 'zh' ? '0.04em' : '0.02em',
                                    lineHeight: 1.35,
                                    boxShadow: '0 2px 14px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255,255,255,0.12)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {countBadge}
                                </button>
                                {rest ? (
                                  <span
                                    style={{
                                      display: 'block',
                                      fontFamily: MYANMAR_SNIPPET_FONT,
                                      fontSize: 13,
                                      lineHeight: 1.75,
                                      color: 'rgba(254, 243, 199, 0.96)',
                                      padding: '9px 12px',
                                      borderRadius: 11,
                                      background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.82) 0%, rgba(15, 23, 42, 0.75) 100%)',
                                      border: '1px solid rgba(251, 191, 36, 0.22)',
                                      borderLeft: '3px solid rgba(251, 191, 36, 0.75)',
                                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {rest}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#93c5fd', fontWeight: 600 }}>{unitTotalsSummary}</td>
                        <td style={{ padding: '12px 16px', color: '#93c5fd', fontWeight: 700 }}>{goodsTotalLabel}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 8,
                              width: 'fit-content',
                              maxWidth: 360,
                              marginLeft: 'auto',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                void exportDraftLineItemsExcel(d).catch((err) => {
                                  console.error(err);
                                  window.alert(
                                    language === 'en'
                                      ? 'Excel export failed. Please try again.'
                                      : language === 'my'
                                        ? 'Excel တင်ပို့မရပါ။'
                                        : 'Excel 导出失败，请重试。',
                                  );
                                });
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(52, 211, 153, 0.5)',
                                background: 'rgba(6, 78, 59, 0.35)',
                                color: '#a7f3d0',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 12,
                                lineHeight: 1.35,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.exportLineItems}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDraft(d);
                                setDraftModalOpen(true);
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(96, 165, 250, 0.45)',
                                background: 'rgba(37, 99, 235, 0.22)',
                                color: '#bfdbfe',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 12,
                                lineHeight: 1.35,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void (async () => {
                                  try {
                                    let draftForExport: ImportMetricDraftSaved = d;
                                    if (isUuid(d.id)) {
                                      const row = await importMetricDraftService.getById(d.id);
                                      if (row) {
                                        draftForExport = importMetricDbRowToSaved(row);
                                      }
                                    }
                                    await exportDraftPermitSummaryExcel(draftForExport, dateLocale);
                                  } catch (err) {
                                    console.error(err);
                                    window.alert(
                                      language === 'en'
                                        ? 'Excel export failed. Please try again.'
                                        : language === 'my'
                                          ? 'Excel တင်ပို့မရပါ။'
                                          : 'Excel 导出失败，请重试。',
                                    );
                                  }
                                })();
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(45, 212, 191, 0.45)',
                                background: 'rgba(13, 148, 136, 0.25)',
                                color: '#5eead4',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 12,
                                lineHeight: 1.35,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.exportPermitSummary}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDraft(d.id, t.deleteConfirm)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(248, 113, 113, 0.45)',
                                background: 'rgba(127, 29, 29, 0.25)',
                                color: '#fecaca',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 12,
                                lineHeight: 1.35,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ImportMetricDraftsPage;
