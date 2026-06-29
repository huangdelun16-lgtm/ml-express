import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import type { Language } from '../i18n/types';
import { fetchBarcodeDataUri } from '../utils/barcodeImage';
import {
  isAndroidBluetoothThermalAvailable,
  printBluetoothEscPosLabel,
} from './bluetoothThermalPrinter';

const SETTINGS_KEY = 'inventory_printer_settings';

export type PrinterConnectionMode = 'system' | 'bluetooth';

export interface PrinterSettings {
  enabled: boolean;
  labelWidthMm: 40 | 50 | 60 | 80;
  copies: number;
  /** system：系统打印对话框；bluetooth：Android ESC/POS 直连 / iOS 记住的 AirPrint 蓝牙机 */
  connectionMode: PrinterConnectionMode;
  iosPrinterUrl?: string;
  iosPrinterName?: string;
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
  connectionMode: 'system',
};

export async function getPrinterSettings(): Promise<PrinterSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PrinterSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        connectionMode: parsed.connectionMode === 'bluetooth' ? 'bluetooth' : 'system',
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

export async function savePrinterSettings(s: PrinterSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function isBluetoothPrintMode(settings: PrinterSettings): boolean {
  return settings.connectionMode === 'bluetooth';
}

export async function pickIosLabelPrinter(): Promise<PrinterSettings> {
  if (Platform.OS !== 'ios') {
    throw new Error('IOS_PRINTER_PICKER_ONLY');
  }
  const printer = await Print.selectPrinterAsync();
  const current = await getPrinterSettings();
  const next: PrinterSettings = {
    ...current,
    connectionMode: 'bluetooth',
    iosPrinterUrl: printer.url,
    iosPrinterName: printer.name,
  };
  await savePrinterSettings(next);
  return next;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelPageStyles(widthMm: number): string {
  return `@page { size: ${widthMm}mm auto; margin: 2mm; }
    .label-page { page-break-after: always; break-after: page; }
    .label-page:last-child { page-break-after: auto; break-after: auto; }`;
}

function labelBodyStyles(widthMm: number): string {
  return `body { font-family: -apple-system, sans-serif; margin: 0; padding: 4mm; width: ${widthMm}mm; box-sizing: border-box; text-align: center; }
    .barcode-wrap { padding: 2mm 0; }
    .barcode-img { width: 100%; max-height: 22mm; object-fit: contain; display: block; margin: 0 auto; }
    .barcode-text, .code { font-family: monospace; font-size: 11pt; font-weight: 700; letter-spacing: 1px; text-align: center; margin-top: 2mm; word-break: break-all; }
    .input-code { font-family: monospace; font-size: 11pt; font-weight: 800; color: #0284c7; margin-bottom: 3mm; word-break: break-all; }
    .hint { font-size: 7pt; color: #666; text-align: center; margin-top: 3mm; }`;
}

/** 条码标签 HTML：内嵌 base64 Code128 图 */
export async function buildBarcodeLabelHtml(
  item: LabelPrintPayload & { widthMm?: number },
): Promise<string> {
  const w = item.widthMm ?? 50;
  const imgUri = await fetchBarcodeDataUri(item.barcode, { scale: 2, height: 12 });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    ${labelPageStyles(w)}
    ${labelBodyStyles(w)}
  </style></head><body class="label-page">
    <div class="barcode-wrap">
      <img class="barcode-img" src="${imgUri}" alt="barcode"/>
      <div class="barcode-text">${escapeHtml(item.barcode)}</div>
    </div>
    <div class="hint">MARKET LINK · Inventory</div>
  </body></html>`;
}

/** 入库打印：快递单号（上）+ Code128 图 + 自动生成条码（下） */
export async function buildInboundBarcodeOnlyHtml(
  barcode: string,
  inputBarcode?: string,
  widthMm = 50,
): Promise<string> {
  const imgUri = await fetchBarcodeDataUri(barcode, { scale: 2, height: 14 });
  const inputBlock = inputBarcode?.trim()
    ? `<div class="input-code">${escapeHtml(inputBarcode.trim())}</div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    ${labelPageStyles(widthMm)}
    ${labelBodyStyles(widthMm)}
    .code { font-size: 13pt; font-weight: 800; }
  </style></head><body class="label-page">
    ${inputBlock}
    <div class="barcode-wrap">
      <img class="barcode-img" src="${imgUri}" alt="barcode"/>
    </div>
    <div class="code">${escapeHtml(barcode)}</div>
  </body></html>`;
}

async function buildCombinedLabelHtml(parts: string[]): Promise<string> {
  if (parts.length === 1) return parts[0];
  const bodies = parts.map((html) => {
    const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return match?.[1]?.trim() ?? html;
  });
  const widthMatch = parts[0].match(/width:\s*(\d+)mm/);
  const widthMm = Number(widthMatch?.[1] ?? 50);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    ${labelPageStyles(widthMm)}
    ${labelBodyStyles(widthMm)}
    .code { font-size: 13pt; font-weight: 800; }
  </style></head><body>${bodies.map((chunk) => `<div class="label-page">${chunk}</div>`).join('')}</body></html>`;
}

async function submitHtmlPrint(html: string, settings: PrinterSettings, copies: number): Promise<void> {
  const count = Math.max(1, copies);
  const options: Print.PrintOptions = { html };

  if (Platform.OS === 'ios' && settings.connectionMode === 'bluetooth' && settings.iosPrinterUrl) {
    options.printerUrl = settings.iosPrinterUrl;
  }

  for (let i = 0; i < count; i += 1) {
    await Print.printAsync(options);
  }
}

async function printLabelJob(params: {
  barcode: string;
  inputBarcode?: string;
  packLabel?: LabelPrintPayload;
  settings: PrinterSettings;
}): Promise<void> {
  const { settings } = params;

  if (
    settings.connectionMode === 'bluetooth' &&
    Platform.OS === 'android' &&
    isAndroidBluetoothThermalAvailable()
  ) {
    await printBluetoothEscPosLabel({
      barcode: params.barcode,
      inputBarcode: params.inputBarcode,
      settings,
    });
    return;
  }

  const html =
    params.packLabel != null
      ? await buildBarcodeLabelHtml({ ...params.packLabel, widthMm: settings.labelWidthMm })
      : await buildInboundBarcodeOnlyHtml(
          params.barcode,
          params.inputBarcode,
          settings.labelWidthMm,
        );

  await submitHtmlPrint(html, settings, settings.copies);
}

export async function printBarcodeLabel(item: LabelPrintPayload): Promise<boolean> {
  const settings = await getPrinterSettings();
  if (!settings.enabled) return false;
  await printLabelJob({ barcode: item.barcode, packLabel: item, settings });
  return true;
}

export async function printInboundBarcodeOnly(
  barcode: string,
  inputBarcode?: string,
): Promise<boolean> {
  const settings = await getPrinterSettings();
  if (!settings.enabled) return false;
  await printLabelJob({ barcode, inputBarcode, settings });
  return true;
}

export type BatchPrintEntry = {
  kind: 'inbound' | 'pack';
  barcode: string;
  inputBarcode?: string;
  label?: LabelPrintPayload;
};

/** 批量打印多个标签（单次任务，避免重复弹出系统对话框） */
export async function printBatchLabels(entries: BatchPrintEntry[]): Promise<boolean> {
  if (entries.length === 0) return false;
  const settings = await getPrinterSettings();
  if (!settings.enabled) return false;

  if (
    settings.connectionMode === 'bluetooth' &&
    Platform.OS === 'android' &&
    isAndroidBluetoothThermalAvailable()
  ) {
    for (const entry of entries) {
      await printBluetoothEscPosLabel({
        barcode: entry.barcode,
        inputBarcode: entry.inputBarcode,
        settings,
      });
    }
    return true;
  }

  const parts: string[] = [];
  for (const entry of entries) {
    parts.push(
      entry.kind === 'pack' && entry.label
        ? await buildBarcodeLabelHtml({ ...entry.label, widthMm: settings.labelWidthMm })
        : await buildInboundBarcodeOnlyHtml(entry.barcode, entry.inputBarcode, settings.labelWidthMm),
    );
  }

  const html = await buildCombinedLabelHtml(parts);
  await submitHtmlPrint(html, settings, settings.copies);
  return true;
}

export function getBluetoothCapabilityHint(language: Language): string {
  if (Platform.OS === 'android') {
    return isAndroidBluetoothThermalAvailable()
      ? language === 'zh'
        ? '已启用 Android 蓝牙 ESC/POS 直连'
        : language === 'my'
          ? 'Android BT ESC/POS အသင့်ရှိ'
          : 'Android Bluetooth ESC/POS ready'
      : language === 'zh'
        ? '需重新编译 App 后可用蓝牙直连（Expo Go 不支持）'
        : language === 'my'
          ? 'App ပြန်တ-build လုပ်မှ BT ESC/POS'
          : 'Rebuild the app for Bluetooth ESC/POS (not in Expo Go)';
  }
  if (Platform.OS === 'ios') {
    return language === 'zh'
      ? '请在下方选择已配对的 AirPrint / 蓝牙标签机'
      : language === 'my'
        ? 'AirPrint/BT printer ရွေးပါ'
        : 'Select a paired AirPrint / Bluetooth label printer below';
  }
  return '';
}
