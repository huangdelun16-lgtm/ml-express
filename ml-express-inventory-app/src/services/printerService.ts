import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { getBarcodeImageUrl } from '../utils/barcodeImage';

const SETTINGS_KEY = 'inventory_printer_settings';

export interface PrinterSettings {
  enabled: boolean;
  labelWidthMm: 40 | 50 | 60 | 80;
  copies: number;
}

export type LabelPrintPayload = {
  name: string;
  barcode: string;
  spec?: string;
  unit?: string;
  weight?: string;
  packaging?: string;
  destination?: string;
  customerName?: string;
};

const DEFAULT_SETTINGS: PrinterSettings = {
  enabled: true,
  labelWidthMm: 50,
  copies: 1,
};

export async function getPrinterSettings(): Promise<PrinterSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

export async function savePrinterSettings(s: PrinterSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function metaLine(label: string, value?: string): string {
  if (!value?.trim()) return '';
  return `<div class="spec">${escapeHtml(label)} ${escapeHtml(value)}</div>`;
}

/** 条码标签 HTML：仅 Code128 图 + 包装号/条码文字 */
export function buildBarcodeLabelHtml(
  item: LabelPrintPayload & { widthMm?: number },
): string {
  const w = item.widthMm ?? 50;
  const imgUrl = getBarcodeImageUrl(item.barcode, { scale: 2, height: 12, includeText: false });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    @page { margin: 2mm; }
    body { font-family: -apple-system, sans-serif; margin: 0; padding: 4mm; width: ${w}mm; box-sizing: border-box; text-align: center; }
    .barcode-wrap { padding: 2mm 0; }
    .barcode-img { width: 100%; max-height: 18mm; object-fit: contain; }
    .barcode-text { font-family: monospace; font-size: 11pt; font-weight: 700; letter-spacing: 1px; text-align: center; margin-top: 2mm; }
    .hint { font-size: 7pt; color: #666; text-align: center; margin-top: 3mm; }
  </style></head><body>
    <div class="barcode-wrap">
      <img class="barcode-img" src="${escapeHtml(imgUrl)}" alt="barcode"/>
      <div class="barcode-text">${escapeHtml(item.barcode)}</div>
    </div>
    <div class="hint">MARKET LINK · Inventory</div>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 入库打印：快递单号（上）+ Code128 图 + 自动生成条码（下） */
export function buildInboundBarcodeOnlyHtml(
  barcode: string,
  inputBarcode?: string,
  widthMm = 50,
): string {
  const imgUrl = getBarcodeImageUrl(barcode, { scale: 2, height: 14, includeText: false });
  const inputBlock = inputBarcode?.trim()
    ? `<div class="input-code">${escapeHtml(inputBarcode.trim())}</div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    @page { margin: 2mm; }
    body { font-family: -apple-system, sans-serif; margin: 0; padding: 5mm; width: ${widthMm}mm; box-sizing: border-box; text-align: center; }
    .input-code { font-family: monospace; font-size: 11pt; font-weight: 800; color: #0284c7; margin-bottom: 3mm; }
    .code { font-family: monospace; font-size: 13pt; font-weight: 800; letter-spacing: 1px; margin-top: 3mm; }
    .barcode-wrap { padding: 2mm 0; }
    .barcode-img { width: 100%; max-height: 22mm; object-fit: contain; }
  </style></head><body>
    ${inputBlock}
    <div class="barcode-wrap">
      <img class="barcode-img" src="${escapeHtml(imgUrl)}" alt="barcode"/>
    </div>
    <div class="code">${escapeHtml(barcode)}</div>
  </body></html>`;
}

export async function printBarcodeLabel(item: LabelPrintPayload): Promise<boolean> {
  const settings = await getPrinterSettings();
  if (!settings.enabled) return false;
  const html = buildBarcodeLabelHtml({ ...item, widthMm: settings.labelWidthMm });
  for (let i = 0; i < Math.max(1, settings.copies); i += 1) {
    await Print.printAsync({ html });
  }
  return true;
}

export async function printInboundBarcodeOnly(
  barcode: string,
  inputBarcode?: string,
): Promise<boolean> {
  const settings = await getPrinterSettings();
  if (!settings.enabled) return false;
  const html = buildInboundBarcodeOnlyHtml(barcode, inputBarcode, settings.labelWidthMm);
  for (let i = 0; i < Math.max(1, settings.copies); i += 1) {
    await Print.printAsync({ html });
  }
  return true;
}
