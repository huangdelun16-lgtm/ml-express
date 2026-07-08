import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import {
  XPRINTER_P203A,
  type LabelPrintProtocol,
  type PrinterModelId,
} from '../constants/xprinterP203a';
import type { Language } from '../i18n/types';
import { normalizeLabelContent, truncateLabelText } from '../utils/labelPrintLayout';
import { fetchBarcodeDataUri } from '../utils/barcodeImage';
import {
  isAndroidBluetoothThermalAvailable,
  printBluetoothLabel,
} from './bluetoothThermalPrinter';

const SETTINGS_KEY = 'inventory_printer_settings';

export type PrinterConnectionMode = 'system' | 'bluetooth';
export type LabelWidthMm = 40 | 50 | 58 | 60 | 80;
export type LabelHeightMm = 30 | 40 | 50;

export interface PrinterSettings {
  enabled: boolean;
  labelWidthMm: LabelWidthMm;
  labelHeightMm: LabelHeightMm;
  labelGapMm: number;
  copies: number;
  printerModel: PrinterModelId;
  printProtocol: LabelPrintProtocol;
  printerDpi: number;
  connectionMode: PrinterConnectionMode;
  iosPrinterUrl?: string;
  iosPrinterName?: string;
  /** Android 可选：指定已配对蓝牙 MAC（如 P203A） */
  androidBluetoothMac?: string;
}

export type LabelPrintPayload = {
  name: string;
  barcode: string;
  productName?: string;
  spec?: string;
  unit?: string;
  weight?: string;
  packaging?: string;
  destination?: string;
  customerName?: string;
  inputBarcode?: string;
};

const DEFAULT_SETTINGS: PrinterSettings = {
  enabled: true,
  labelWidthMm: XPRINTER_P203A.defaultWidthMm as LabelWidthMm,
  labelHeightMm: XPRINTER_P203A.defaultHeightMm as LabelHeightMm,
  labelGapMm: XPRINTER_P203A.defaultGapMm,
  copies: 1,
  printerModel: XPRINTER_P203A.modelId,
  printProtocol: XPRINTER_P203A.defaultProtocol,
  printerDpi: XPRINTER_P203A.dpi,
  connectionMode: XPRINTER_P203A.defaultConnectionMode,
};

const VALID_WIDTHS = new Set<LabelWidthMm>([40, 50, 58, 60, 80]);
const VALID_HEIGHTS = new Set<LabelHeightMm>([30, 40, 50]);

function coerceSettings(parsed: Partial<PrinterSettings>): PrinterSettings {
  const labelWidthMm = VALID_WIDTHS.has(parsed.labelWidthMm as LabelWidthMm)
    ? (parsed.labelWidthMm as LabelWidthMm)
    : DEFAULT_SETTINGS.labelWidthMm;
  const labelHeightMm = VALID_HEIGHTS.has(parsed.labelHeightMm as LabelHeightMm)
    ? (parsed.labelHeightMm as LabelHeightMm)
    : DEFAULT_SETTINGS.labelHeightMm;
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    labelWidthMm,
    labelHeightMm,
    labelGapMm:
      Number.isFinite(parsed.labelGapMm) && (parsed.labelGapMm ?? 0) >= 0
        ? Number(parsed.labelGapMm)
        : DEFAULT_SETTINGS.labelGapMm,
    copies: Math.max(1, Math.min(9, Number(parsed.copies) || 1)),
    connectionMode: parsed.connectionMode === 'bluetooth' ? 'bluetooth' : 'system',
    printProtocol: parsed.printProtocol === 'escpos' ? 'escpos' : 'tspl',
    printerModel:
      parsed.printerModel === 'generic' ? 'generic' : XPRINTER_P203A.modelId,
    printerDpi: Number(parsed.printerDpi) > 0 ? Number(parsed.printerDpi) : XPRINTER_P203A.dpi,
  };
}

export async function getPrinterSettings(): Promise<PrinterSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return coerceSettings(JSON.parse(raw) as Partial<PrinterSettings>);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

export async function savePrinterSettings(s: PrinterSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(coerceSettings(s)));
}

export function getXprinterP203aPreset(): PrinterSettings {
  return { ...DEFAULT_SETTINGS };
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

function labelPageStyles(widthMm: number, heightMm: number): string {
  return `@page { size: ${widthMm}mm ${heightMm}mm; margin: 1.5mm; }
    .label-page { page-break-after: always; break-after: page; width: ${widthMm}mm; min-height: ${heightMm}mm; box-sizing: border-box; }
    .label-page:last-child { page-break-after: auto; break-after: auto; }`;
}

function labelBodyStyles(widthMm: number): string {
  return `body { font-family: -apple-system, "Helvetica Neue", sans-serif; margin: 0; padding: 2mm 2.5mm; width: ${widthMm}mm; box-sizing: border-box; text-align: center; }
    .meta { font-size: 8pt; font-weight: 700; color: #334155; line-height: 1.25; margin: 1mm 0; word-break: break-word; }
    .meta-dest { color: #0369a1; font-size: 9pt; }
    .barcode-wrap { padding: 1mm 0; }
    .barcode-img { width: 100%; max-height: 18mm; object-fit: contain; display: block; margin: 0 auto; }
    .barcode-text, .code { font-family: ui-monospace, Menlo, monospace; font-size: 10pt; font-weight: 800; letter-spacing: 0.5px; text-align: center; margin-top: 1.5mm; word-break: break-all; }
    .input-code { font-family: ui-monospace, Menlo, monospace; font-size: 9pt; font-weight: 800; color: #0284c7; margin-bottom: 2mm; word-break: break-all; }
    .hint { font-size: 6.5pt; color: #64748b; text-align: center; margin-top: 2mm; letter-spacing: 0.3px; }`;
}

function buildMetaHtml(content: ReturnType<typeof normalizeLabelContent>): string {
  const parts: string[] = [];
  if (content.destination) {
    parts.push(
      `<div class="meta meta-dest">${escapeHtml(truncateLabelText(`→ ${content.destination}`, 20))}</div>`,
    );
  }
  if (content.customerName) {
    parts.push(
      `<div class="meta">${escapeHtml(truncateLabelText(content.customerName, 18))}</div>`,
    );
  }
  if (content.productName) {
    parts.push(
      `<div class="meta">${escapeHtml(truncateLabelText(content.productName, 22))}</div>`,
    );
  }
  return parts.join('');
}

async function buildLabelBodyHtml(
  content: ReturnType<typeof normalizeLabelContent>,
  barcodeScale: number,
  barcodeHeight: number,
): Promise<string> {
  const imgUri = await fetchBarcodeDataUri(content.barcode, {
    scale: barcodeScale,
    height: barcodeHeight,
  });
  const inputBlock = content.inputBarcode
    ? `<div class="input-code">${escapeHtml(content.inputBarcode)}</div>`
    : '';
  return `${inputBlock}${buildMetaHtml(content)}
    <div class="barcode-wrap">
      <img class="barcode-img" src="${imgUri}" alt="barcode"/>
    </div>
    <div class="code">${escapeHtml(content.barcode)}</div>
    <div class="hint">MARKET LINK · Inventory</div>`;
}

export async function buildBarcodeLabelHtml(
  item: LabelPrintPayload & { widthMm?: number; heightMm?: number },
): Promise<string> {
  const w = item.widthMm ?? DEFAULT_SETTINGS.labelWidthMm;
  const h = item.heightMm ?? DEFAULT_SETTINGS.labelHeightMm;
  const content = normalizeLabelContent(item.barcode, item);
  const body = await buildLabelBodyHtml(content, 2, 11);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    ${labelPageStyles(w, h)}
    ${labelBodyStyles(w)}
  </style></head><body class="label-page">${body}</body></html>`;
}

export async function buildInboundBarcodeOnlyHtml(
  barcode: string,
  inputBarcode?: string,
  widthMm = DEFAULT_SETTINGS.labelWidthMm,
  heightMm = DEFAULT_SETTINGS.labelHeightMm,
  extras?: Partial<LabelPrintPayload>,
): Promise<string> {
  const content = normalizeLabelContent(barcode, { ...extras, inputBarcode });
  const body = await buildLabelBodyHtml(content, 2, 13);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    ${labelPageStyles(widthMm, heightMm)}
    ${labelBodyStyles(widthMm)}
    .code { font-size: 11pt; }
  </style></head><body class="label-page">${body}</body></html>`;
}

async function buildCombinedLabelHtml(parts: string[], widthMm: number, heightMm: number): Promise<string> {
  if (parts.length === 1) return parts[0];
  const bodies = parts.map((html) => {
    const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return match?.[1]?.trim() ?? html;
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    ${labelPageStyles(widthMm, heightMm)}
    ${labelBodyStyles(widthMm)}
    .code { font-size: 11pt; }
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
  const labelExtras: Partial<LabelPrintPayload> | undefined = params.packLabel ?? {
    name: '',
    barcode: params.barcode,
    inputBarcode: params.inputBarcode,
  };

  if (
    settings.connectionMode === 'bluetooth' &&
    Platform.OS === 'android' &&
    isAndroidBluetoothThermalAvailable()
  ) {
    await printBluetoothLabel({
      barcode: params.barcode,
      inputBarcode: params.inputBarcode ?? params.packLabel?.inputBarcode,
      extras: labelExtras,
      settings,
    });
    return;
  }

  const html =
    params.packLabel != null
      ? await buildBarcodeLabelHtml({
          ...params.packLabel,
          widthMm: settings.labelWidthMm,
          heightMm: settings.labelHeightMm,
        })
      : await buildInboundBarcodeOnlyHtml(
          params.barcode,
          params.inputBarcode,
          settings.labelWidthMm,
          settings.labelHeightMm,
          labelExtras,
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
  extras?: Partial<LabelPrintPayload>,
): Promise<boolean> {
  const settings = await getPrinterSettings();
  if (!settings.enabled) return false;
  await printLabelJob({
    barcode,
    inputBarcode,
    packLabel: extras
      ? { name: extras.name ?? extras.productName ?? '', barcode, inputBarcode, ...extras }
      : undefined,
    settings,
  });
  return true;
}

export type BatchPrintEntry = {
  kind: 'inbound' | 'pack';
  barcode: string;
  inputBarcode?: string;
  label?: LabelPrintPayload;
};

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
      await printBluetoothLabel({
        barcode: entry.barcode,
        inputBarcode: entry.inputBarcode,
        extras: entry.label ?? { inputBarcode: entry.inputBarcode },
        settings,
      });
    }
    return true;
  }

  const parts: string[] = [];
  for (const entry of entries) {
    parts.push(
      entry.kind === 'pack' && entry.label
        ? await buildBarcodeLabelHtml({
            ...entry.label,
            widthMm: settings.labelWidthMm,
            heightMm: settings.labelHeightMm,
          })
        : await buildInboundBarcodeOnlyHtml(
            entry.barcode,
            entry.inputBarcode,
            settings.labelWidthMm,
            settings.labelHeightMm,
            entry.label,
          ),
    );
  }

  const html = await buildCombinedLabelHtml(parts, settings.labelWidthMm, settings.labelHeightMm);
  await submitHtmlPrint(html, settings, settings.copies);
  return true;
}

export function getBluetoothCapabilityHint(language: Language, settings?: PrinterSettings): string {
  const modelHint =
    settings?.printerModel === XPRINTER_P203A.modelId
      ? language === 'zh'
        ? 'Xprinter P203A · 58×40mm · TSPL'
        : language === 'my'
          ? 'Xprinter P203A · 58×40mm · TSPL'
          : 'Xprinter P203A · 58×40mm · TSPL'
      : '';

  if (Platform.OS === 'android') {
    const base = isAndroidBluetoothThermalAvailable()
      ? language === 'zh'
        ? 'Android 蓝牙直连已就绪'
        : language === 'my'
          ? 'Android BT အသင့်'
          : 'Android Bluetooth ready'
      : language === 'zh'
        ? '需重新编译 App 后可用蓝牙直连（Expo Go 不支持）'
        : language === 'my'
          ? 'App rebuild လိုအပ်'
          : 'Rebuild app for Bluetooth (not in Expo Go)';
    return modelHint ? `${modelHint} · ${base}` : base;
  }
  if (Platform.OS === 'ios') {
    const base =
      language === 'zh'
        ? '请选择已配对的 AirPrint / 蓝牙标签机'
        : language === 'my'
          ? 'AirPrint/BT printer ရွေးပါ'
          : 'Select paired AirPrint / Bluetooth printer';
    return modelHint ? `${modelHint} · ${base}` : base;
  }
  return modelHint;
}
