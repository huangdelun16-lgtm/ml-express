import { Platform } from 'react-native';
import { XPRINTER_P203A } from '../constants/xprinterP203a';
import { normalizeLabelContent, truncateLabelText } from '../utils/labelPrintLayout';
import type { LabelPrintPayload, PrinterSettings } from './printerService';
import { buildTsplInboundLabel } from './tsplLabelBuilder';

type ThermalPrinterModule = {
  printBluetooth: (config: Record<string, unknown>) => Promise<void>;
  defaultConfig?: Record<string, unknown>;
};

let cachedModule: ThermalPrinterModule | null | undefined;

function loadThermalModule(): ThermalPrinterModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS !== 'android') {
    cachedModule = null;
    return cachedModule;
  }
  try {
    const mod = require('react-native-thermal-printer').default as ThermalPrinterModule;
    cachedModule = typeof mod?.printBluetooth === 'function' ? mod : null;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function isAndroidBluetoothThermalAvailable(): boolean {
  return loadThermalModule() !== null;
}

function charsPerLine(widthMm: PrinterSettings['labelWidthMm']): number {
  if (widthMm <= 40) return 24;
  if (widthMm <= 50) return 28;
  if (widthMm <= 58) return 32;
  if (widthMm <= 60) return 36;
  return 42;
}

function escapeEscPosText(value: string): string {
  return value.replace(/[[\]]/g, ' ').trim();
}

function buildEscPosPayload(content: ReturnType<typeof normalizeLabelContent>): string {
  const code = escapeEscPosText(content.barcode);
  const input = content.inputBarcode ? escapeEscPosText(content.inputBarcode) : '';
  const lines: string[] = [];
  if (input) {
    lines.push(`[C]<font size='wide'>${input}</font>`);
    lines.push('[L]');
  }
  const meta = [
    content.destination ? truncateLabelText(`→ ${content.destination}`, 16) : '',
    content.customerName ? truncateLabelText(content.customerName, 14) : '',
    content.productName ? truncateLabelText(content.productName, 18) : '',
  ].filter(Boolean);
  for (const line of meta) {
    lines.push(`[C]<font size='normal'>${escapeEscPosText(line)}</font>`);
  }
  if (meta.length) lines.push('[L]');
  lines.push(`[C]<barcode type='128' height='80'>${code}</barcode>`);
  lines.push(`[C]<font size='tall'>${code}</font>`);
  lines.push('[L]');
  lines.push('[C]MARKET LINK');
  lines.push('[L]');
  return lines.join('\n');
}

async function sendBluetoothPayload(params: {
  payload: string;
  settings: PrinterSettings;
  isTspl: boolean;
}): Promise<void> {
  const module = loadThermalModule();
  if (!module) {
    throw new Error('BLUETOOTH_MODULE_UNAVAILABLE');
  }

  const copies = Math.max(1, params.settings.copies);
  const widthMm = params.settings.labelWidthMm;
  const dpi = params.settings.printerDpi ?? XPRINTER_P203A.dpi;

  for (let i = 0; i < copies; i += 1) {
    await module.printBluetooth({
      payload: params.payload,
      printerWidthMM: widthMm,
      printerNbrCharactersPerLine: charsPerLine(widthMm),
      printerDpi: dpi,
      autoCut: !params.isTspl,
      openCashbox: false,
      mmFeedPaper: params.isTspl ? 0 : 2,
      timeout: 30000,
      ...(params.settings.androidBluetoothMac?.trim()
        ? { macAddress: params.settings.androidBluetoothMac.trim() }
        : {}),
    });
  }
}

/** Android 蓝牙打印（Xprinter P203A 默认 TSPL；可切换 ESC/POS） */
export async function printBluetoothLabel(params: {
  barcode: string;
  inputBarcode?: string;
  extras?: Partial<LabelPrintPayload>;
  settings: PrinterSettings;
}): Promise<void> {
  const content = normalizeLabelContent(params.barcode, {
    ...params.extras,
    inputBarcode: params.inputBarcode ?? params.extras?.inputBarcode,
  });

  const useTspl = params.settings.printProtocol !== 'escpos';

  if (useTspl) {
    const tspl = buildTsplInboundLabel({
      barcode: content.barcode,
      extras: content,
      widthMm: params.settings.labelWidthMm,
      heightMm: params.settings.labelHeightMm,
      gapMm: params.settings.labelGapMm,
      copies: 1,
    });
    await sendBluetoothPayload({ payload: tspl, settings: params.settings, isTspl: true });
    return;
  }

  const payload = buildEscPosPayload(content);
  await sendBluetoothPayload({ payload, settings: params.settings, isTspl: false });
}

/** @deprecated 使用 printBluetoothLabel */
export async function printBluetoothEscPosLabel(params: {
  barcode: string;
  inputBarcode?: string;
  settings: PrinterSettings;
}): Promise<void> {
  await printBluetoothLabel(params);
}
