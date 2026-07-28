import type { InboundInvoiceData } from '../components/InboundInvoiceView';
import { stockUnitLabel } from '../utils/itemFieldFormat';
import { fetchBarcodeDataUri } from '../utils/barcodeImage';
import {
  normalizeLabelContent,
  truncateLabelText,
  type NormalizedLabelContent,
} from '../utils/labelPrintLayout';
import type { LabelPrintPayload } from './printerService';

export type PrintLabelSheetKind = 'express' | 'inbound' | 'barcode' | 'pack';

function labelPageStyles(widthMm: number, heightMm: number, multiPage: boolean): string {
  const pageRule = `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`;
  if (multiPage) {
    return `${pageRule}
    .label-page { page-break-after: always; break-after: page; width: ${widthMm}mm; height: ${heightMm}mm; box-sizing: border-box; overflow: hidden; }
    .label-page:last-child { page-break-after: auto; break-after: auto; }`;
  }
  return `${pageRule}
    html, body { margin: 0; padding: 0; width: ${widthMm}mm; height: ${heightMm}mm; max-height: ${heightMm}mm; overflow: hidden; }
    body { page-break-after: avoid; break-after: avoid; box-sizing: border-box; }`;
}

function labelBodyStyles(widthMm: number, heightMm: number): string {
  const barcodeMaxMm = Math.max(10, Math.min(16, heightMm - 18));
  const codeSize = heightMm <= 40 ? '8pt' : '10pt';
  const inputSize = heightMm <= 40 ? '8pt' : '9pt';
  return `body { font-family: -apple-system, "Helvetica Neue", sans-serif; margin: 0; padding: 1.5mm 2mm; width: ${widthMm}mm; box-sizing: border-box; text-align: center; }
    .meta { font-size: 8pt; font-weight: 700; color: #334155; line-height: 1.2; margin: 0.5mm 0; word-break: break-word; }
    .meta-dest { color: #0369a1; font-size: 9pt; }
    .barcode-wrap { padding: 0.5mm 0; line-height: 0; }
    .barcode-img { width: 100%; max-height: ${barcodeMaxMm}mm; object-fit: contain; display: block; margin: 0 auto; }
    .barcode-text, .code { font-family: ui-monospace, Menlo, monospace; font-size: ${codeSize}; font-weight: 800; letter-spacing: 0.3px; text-align: center; margin-top: 1mm; word-break: break-all; line-height: 1.15; }
    .input-code { font-family: ui-monospace, Menlo, monospace; font-size: ${inputSize}; font-weight: 800; color: #0284c7; margin-bottom: 1mm; word-break: break-all; line-height: 1.15; }
    .title { font-size: 11pt; font-weight: 900; color: #0f172a; margin-bottom: 1.5mm; }
    .row { display: flex; justify-content: space-between; gap: 2mm; font-size: 7.5pt; margin: 1mm 0; text-align: left; }
    .row-label { color: #64748b; font-weight: 700; flex: 1; }
    .row-value { color: #0f172a; font-weight: 800; flex: 1.2; text-align: right; word-break: break-word; }`;
}

function wrapLabelPage(body: string, widthMm: number, heightMm: number): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    ${labelPageStyles(widthMm, heightMm, false)}
    ${labelBodyStyles(widthMm, heightMm)}
  </style></head><body>${body}</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function barcodeBlock(
  code: string,
  widthMm: number,
  heightMm: number,
  scale = 2,
): Promise<string> {
  const barHeight = heightMm <= 40 ? 9 : heightMm <= 50 ? 11 : 13;
  const imgUri = await fetchBarcodeDataUri(code, { scale, height: barHeight });
  return `<div class="barcode-wrap"><img class="barcode-img" src="${imgUri}" alt="barcode"/></div>
    <div class="code">${escapeHtml(code)}</div>`;
}

function invoiceRow(label: string, value?: string): string {
  if (!value?.trim()) return '';
  return `<div class="row"><span class="row-label">${escapeHtml(label)}</span><span class="row-value">${escapeHtml(value)}</span></div>`;
}

export async function buildBarcodeOnlySheetHtml(
  barcode: string,
  widthMm: number,
  heightMm: number,
  inputBarcode?: string,
): Promise<string> {
  const code = barcode.trim();
  const parts: string[] = [];
  if (inputBarcode?.trim()) {
    parts.push(`<div class="input-code">${escapeHtml(inputBarcode.trim())}</div>`);
  }
  parts.push(await barcodeBlock(code, widthMm, heightMm));
  return wrapLabelPage(parts.join(''), widthMm, heightMm);
}

export async function buildExpressSheetHtml(
  content: NormalizedLabelContent,
  widthMm: number,
  heightMm: number,
): Promise<string> {
  const expressCode = (content.inputBarcode || content.barcode).trim();
  const parts: string[] = [`<div class="title">快递单</div>`];
  if (content.destination) {
    parts.push(
      `<div class="meta meta-dest">${escapeHtml(truncateLabelText(`→ ${content.destination}`, 20))}</div>`,
    );
  }
  parts.push(await barcodeBlock(expressCode, widthMm, heightMm));
  return wrapLabelPage(parts.join(''), widthMm, heightMm);
}

export async function buildPackSheetHtml(
  content: NormalizedLabelContent,
  widthMm: number,
  heightMm: number,
): Promise<string> {
  const parts: string[] = [`<div class="title">包装单</div>`];
  if (content.destination) {
    parts.push(
      `<div class="meta meta-dest">${escapeHtml(truncateLabelText(`→ ${content.destination}`, 20))}</div>`,
    );
  }
  if (content.productName) {
    parts.push(`<div class="meta">${escapeHtml(truncateLabelText(content.productName, 22))}</div>`);
  }
  parts.push(await barcodeBlock(content.barcode, widthMm, heightMm));
  return wrapLabelPage(parts.join(''), widthMm, heightMm);
}

export async function buildInboundSheetHtml(
  invoice: InboundInvoiceData,
  widthMm: number,
  heightMm: number,
): Promise<string> {
  const parts: string[] = [
    `<div class="title">入库单</div>`,
    `<div class="meta">${escapeHtml(invoice.inboundDateLabel)}</div>`,
    invoiceRow('客户', invoice.recipientName),
    invoiceRow('商品', invoice.productName),
    invoiceRow('目的地', invoice.destination),
    invoiceRow('数量', `${invoice.qty} ${stockUnitLabel()}`),
    invoiceRow('规格', invoice.spec),
    invoiceRow('重量', invoice.weight),
    invoiceRow('总费用', invoice.totalFee ? `${invoice.totalFee} MMK` : undefined),
    invoiceRow('备注', invoice.note),
  ];
  if (invoice.inputBarcode?.trim()) {
    parts.push(`<div class="input-code">${escapeHtml(invoice.inputBarcode.trim())}</div>`);
  }
  parts.push(await barcodeBlock(invoice.barcode, widthMm, heightMm));
  return wrapLabelPage(parts.filter(Boolean).join(''), widthMm, heightMm);
}

export function normalizePrintContent(
  barcode: string,
  extras?: Partial<LabelPrintPayload>,
): NormalizedLabelContent {
  return normalizeLabelContent(barcode, extras);
}

export function invoiceFromPrintPayload(
  payload: LabelPrintPayload & { qty?: number; inboundDateLabel?: string },
): InboundInvoiceData {
  return {
    barcode: payload.barcode,
    inputBarcode: payload.inputBarcode,
    productName: payload.productName || payload.name,
    inboundDateLabel: payload.inboundDateLabel || new Date().toLocaleDateString('zh-CN'),
    recipientName: payload.customerName || '—',
    destination: payload.destination || '—',
    qty: payload.qty ?? 1,
    spec: payload.spec,
    weight: payload.weight,
    packaging: payload.packaging,
  };
}
