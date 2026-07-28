import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import {
  XPRINTER_P203A,
  labelPagePixels,
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
import {
  isIosBleThermalAvailable,
  printIosBleLabel,
} from './iosBleThermalPrinter';
import type { InboundInvoiceData } from '../components/InboundInvoiceView';
import {
  buildBarcodeOnlySheetHtml,
  buildExpressSheetHtml,
  buildInboundSheetHtml,
  buildPackSheetHtml,
  invoiceFromPrintPayload,
  normalizePrintContent,
  type PrintLabelSheetKind,
} from './printLabelSheets';

export type { PrintLabelSheetKind };

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
  /** iOS BLE：Xprinter SDK 设备 UUID（与 Xlabel 相同蓝牙通道） */
  iosBlePrinterId?: string;
  iosBlePrinterName?: string;
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
  connectionMode:
    Platform.OS === 'ios' ? 'bluetooth' : XPRINTER_P203A.defaultConnectionMode,
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
  return {
    ...DEFAULT_SETTINGS,
    connectionMode: 'bluetooth',
    printerModel: XPRINTER_P203A.modelId,
    labelWidthMm: XPRINTER_P203A.defaultWidthMm as LabelWidthMm,
    labelHeightMm: XPRINTER_P203A.defaultHeightMm as LabelHeightMm,
    labelGapMm: XPRINTER_P203A.defaultGapMm,
    printProtocol: XPRINTER_P203A.defaultProtocol,
    printerDpi: XPRINTER_P203A.dpi,
  };
}

/** iOS + Xprinter 蓝牙模式：P201A 不支持 AirPrint，无法走 expo-print 系统打印 */
export function isIosXprinterBluetoothMode(settings: PrinterSettings): boolean {
  return (
    Platform.OS === 'ios' &&
    settings.connectionMode === 'bluetooth' &&
    settings.printerModel === XPRINTER_P203A.modelId
  );
}

function isPrintUserCancelled(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /printing did not complete|print cancelled|cancelled|canceled/i.test(msg);
}

/** iOS：仅当设置里已手动绑定打印机时使用（不在打印前强制弹出 AirPrint 选择器） */
async function submitHtmlPrint(html: string, settings: PrinterSettings, copies: number): Promise<void> {
  const count = Math.max(1, copies);
  const { width, height } = labelPagePixels(settings.labelWidthMm, settings.labelHeightMm);
  const options: Print.PrintOptions = {
    html,
    width,
    height,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  if (Platform.OS === 'ios' && settings.iosPrinterUrl?.trim()) {
    options.printerUrl = settings.iosPrinterUrl.trim();
  }

  for (let i = 0; i < count; i += 1) {
    try {
      await Print.printAsync(options);
    } catch (error) {
      if (isPrintUserCancelled(error)) {
        throw new Error('PRINT_CANCELLED');
      }
      throw error;
    }
  }
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

function labelPageStyles(widthMm: number, heightMm: number, multiPage = true): string {
  const pageRule = `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`;
  if (!multiPage) {
    return `${pageRule}
    html, body { margin: 0; padding: 0; width: ${widthMm}mm; height: ${heightMm}mm; max-height: ${heightMm}mm; overflow: hidden; }`;
  }
  return `${pageRule}
    .label-page { page-break-after: always; break-after: page; width: ${widthMm}mm; height: ${heightMm}mm; box-sizing: border-box; overflow: hidden; }
    .label-page:last-child { page-break-after: auto; break-after: auto; }`;
}

function labelBodyStyles(widthMm: number, heightMm: number = DEFAULT_SETTINGS.labelHeightMm): string {
  const barcodeMaxMm = Math.max(10, Math.min(16, heightMm - 18));
  return `body { font-family: -apple-system, "Helvetica Neue", sans-serif; margin: 0; padding: 1.5mm 2mm; width: ${widthMm}mm; box-sizing: border-box; text-align: center; }
    .meta { font-size: 8pt; font-weight: 700; color: #334155; line-height: 1.2; margin: 0.5mm 0; word-break: break-word; }
    .meta-dest { color: #0369a1; font-size: 9pt; }
    .barcode-wrap { padding: 0.5mm 0; line-height: 0; }
    .barcode-img { width: 100%; max-height: ${barcodeMaxMm}mm; object-fit: contain; display: block; margin: 0 auto; }
    .barcode-text, .code { font-family: ui-monospace, Menlo, monospace; font-size: 10pt; font-weight: 800; letter-spacing: 0.3px; text-align: center; margin-top: 1mm; word-break: break-all; }
    .input-code { font-family: ui-monospace, Menlo, monospace; font-size: 9pt; font-weight: 800; color: #0284c7; margin-bottom: 1mm; word-break: break-all; }
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
  sheetKind: PrintLabelSheetKind = 'pack',
): Promise<string> {
  if (sheetKind === 'barcode') {
    return barcodeBlockHtml(content.barcode, barcodeScale, barcodeHeight + 2);
  }
  if (sheetKind === 'express') {
    const expressCode = (content.inputBarcode || content.barcode).trim();
    const parts = [
      `<div class="title">快递单</div>`,
      content.destination
        ? `<div class="meta meta-dest">${escapeHtml(truncateLabelText(`→ ${content.destination}`, 20))}</div>`
        : '',
      await barcodeBlockHtml(expressCode, barcodeScale, barcodeHeight),
    ];
    return parts.filter(Boolean).join('');
  }
  const inputBlock = content.inputBarcode
    ? `<div class="input-code">${escapeHtml(content.inputBarcode)}</div>`
    : '';
  return `${inputBlock}${buildMetaHtml(content)}
    ${await barcodeBlockHtml(content.barcode, barcodeScale, barcodeHeight)}
    <div class="code">${escapeHtml(content.barcode)}</div>`;
}

async function barcodeBlockHtml(code: string, scale: number, height: number): Promise<string> {
  const imgUri = await fetchBarcodeDataUri(code, { scale, height });
  return `<div class="barcode-wrap">
      <img class="barcode-img" src="${imgUri}" alt="barcode"/>
    </div>
    <div class="code">${escapeHtml(code)}</div>`;
}

export async function buildBarcodeLabelHtml(
  item: LabelPrintPayload & { widthMm?: number; heightMm?: number },
): Promise<string> {
  const w = item.widthMm ?? DEFAULT_SETTINGS.labelWidthMm;
  const h = item.heightMm ?? DEFAULT_SETTINGS.labelHeightMm;
  const content = normalizeLabelContent(item.barcode, item);
  const body = await buildLabelBodyHtml(content, 2, 11, 'pack');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    ${labelPageStyles(w, h, false)}
    ${labelBodyStyles(w, h)}
  </style></head><body>${body}</body></html>`;
}

export async function buildInboundBarcodeOnlyHtml(
  barcode: string,
  inputBarcode?: string,
  widthMm = DEFAULT_SETTINGS.labelWidthMm,
  heightMm = DEFAULT_SETTINGS.labelHeightMm,
  extras?: Partial<LabelPrintPayload>,
): Promise<string> {
  void extras;
  return buildBarcodeOnlySheetHtml(barcode, widthMm, heightMm, inputBarcode);
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

async function printLabelJob(params: {
  barcode: string;
  inputBarcode?: string;
  packLabel?: LabelPrintPayload;
  settings: PrinterSettings;
  sheetKind?: PrintLabelSheetKind;
  invoice?: InboundInvoiceData;
}): Promise<void> {
  const { settings } = params;
  const sheetKind = params.sheetKind ?? 'barcode';
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
    try {
      await printBluetoothLabel({
        barcode: params.barcode,
        inputBarcode: params.inputBarcode ?? params.packLabel?.inputBarcode,
        extras: labelExtras,
        settings,
        sheetKind,
      });
      return;
    } catch {
      /* Expo Go 或无蓝牙模块时回退系统 HTML 打印 */
    }
  }

  if (
    settings.connectionMode === 'bluetooth' &&
    Platform.OS === 'ios' &&
    isIosBleThermalAvailable() &&
    isIosXprinterBluetoothMode(settings)
  ) {
    await printIosBleLabel({
      barcode: params.barcode,
      inputBarcode: params.inputBarcode ?? params.packLabel?.inputBarcode,
      extras: labelExtras,
      settings,
      sheetKind,
    });
    return;
  }

  // Expo Go / 无原生 BLE 模块：回退系统 HTML 打印预览，便于调试布局。
  // P201A 不支持 AirPrint，真机直连仍需含 ml-xprinter-ble 的 IPA / 开发构建。

  const html = await buildSheetHtml({
    kind: sheetKind,
    barcode: params.barcode,
    inputBarcode: params.inputBarcode,
    packLabel: params.packLabel,
    invoice: params.invoice,
    settings,
  });

  await submitHtmlPrint(html, settings, settings.copies);
}

async function buildSheetHtml(params: {
  kind: PrintLabelSheetKind;
  barcode: string;
  inputBarcode?: string;
  packLabel?: LabelPrintPayload;
  invoice?: InboundInvoiceData;
  settings: PrinterSettings;
}): Promise<string> {
  const { settings } = params;
  const w = settings.labelWidthMm;
  const h = settings.labelHeightMm;
  const content = normalizePrintContent(params.barcode, {
    ...(params.packLabel ?? {}),
    inputBarcode: params.inputBarcode ?? params.packLabel?.inputBarcode,
  });

  if (params.kind === 'barcode') {
    return buildBarcodeOnlySheetHtml(
      params.barcode,
      w,
      h,
      params.inputBarcode ?? params.packLabel?.inputBarcode,
    );
  }
  if (params.kind === 'express') {
    return buildExpressSheetHtml(content, w, h);
  }
  if (params.kind === 'inbound') {
    const invoice =
      params.invoice ??
      invoiceFromPrintPayload({
        name: params.packLabel?.name ?? '',
        barcode: params.barcode,
        inputBarcode: params.inputBarcode,
        productName: params.packLabel?.productName,
        customerName: params.packLabel?.customerName,
        destination: params.packLabel?.destination,
        spec: params.packLabel?.spec,
        weight: params.packLabel?.weight,
        packaging: params.packLabel?.packaging,
      });
    return buildInboundSheetHtml(invoice, w, h);
  }
  return buildPackSheetHtml(content, w, h);
}

export async function printLabelSheet(params: {
  kind: PrintLabelSheetKind;
  barcode: string;
  inputBarcode?: string;
  packLabel?: LabelPrintPayload;
  invoice?: InboundInvoiceData;
}): Promise<boolean> {
  const settings = await getPrinterSettings();
  if (!settings.enabled) return false;
  await printLabelJob({
    barcode: params.barcode,
    inputBarcode: params.inputBarcode,
    packLabel: params.packLabel,
    invoice: params.invoice,
    settings,
    sheetKind: params.kind,
  });
  return true;
}

export async function printBarcodeLabel(item: LabelPrintPayload): Promise<boolean> {
  const settings = await getPrinterSettings();
  if (!settings.enabled) return false;
  await printLabelJob({ barcode: item.barcode, packLabel: item, settings, sheetKind: 'pack' });
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
    sheetKind: 'barcode',
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
    try {
      for (const entry of entries) {
        await printBluetoothLabel({
          barcode: entry.barcode,
          inputBarcode: entry.inputBarcode,
          extras: entry.label ?? { inputBarcode: entry.inputBarcode },
          settings,
          sheetKind: entry.kind === 'pack' ? 'pack' : 'barcode',
        });
      }
      return true;
    } catch {
      /* 回退下方 HTML 批量打印 */
    }
  }

  if (
    settings.connectionMode === 'bluetooth' &&
    Platform.OS === 'ios' &&
    isIosBleThermalAvailable() &&
    isIosXprinterBluetoothMode(settings)
  ) {
    for (const entry of entries) {
      await printIosBleLabel({
        barcode: entry.barcode,
        inputBarcode: entry.inputBarcode,
        extras: entry.label ?? { inputBarcode: entry.inputBarcode },
        settings: { ...settings, copies: 1 },
        sheetKind: entry.kind === 'pack' ? 'pack' : 'barcode',
      });
    }
    return true;
  }

  const parts: string[] = [];
  for (const entry of entries) {
    parts.push(
      await buildSheetHtml({
        kind: entry.kind === 'pack' ? 'pack' : 'barcode',
        barcode: entry.barcode,
        inputBarcode: entry.inputBarcode,
        packLabel: entry.label,
        settings,
      }),
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
    const bleReady = isIosBleThermalAvailable();
    const base =
      settings?.printerModel === XPRINTER_P203A.modelId
        ? bleReady
          ? language === 'zh'
            ? 'iPhone 蓝牙 TSPL 直连（与 Xlabel 相同方式）'
            : language === 'my'
              ? 'iPhone BT TSPL တိုက်ရိုက်'
              : 'iPhone Bluetooth TSPL direct print'
          : language === 'zh'
            ? '当前为 Expo Go：可预览系统打印；直连 P201A 需安装含原生模块的 IPA'
            : language === 'my'
              ? 'Expo Go: system print preview။ P201A တိုက်ရိုက် IPA လိုအပ်'
              : 'Expo Go: system print preview; P201A BLE needs custom IPA'
        : language === 'zh'
          ? '请选择 AirPrint 标签机'
          : language === 'my'
            ? 'AirPrint printer ရွေးပါ'
            : 'Select AirPrint label printer';
    return modelHint ? `${modelHint} · ${base}` : base;
  }
  return modelHint;
}
