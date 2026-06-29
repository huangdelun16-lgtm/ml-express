import { Platform } from 'react-native';
import type { PrinterSettings } from './printerService';

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
  if (widthMm <= 50) return 30;
  if (widthMm <= 60) return 36;
  return 42;
}

function escapeEscPosText(value: string): string {
  return value.replace(/[[\]]/g, ' ').trim();
}

/** Android 蓝牙 ESC/POS 直连（需先在系统设置中配对打印机） */
export async function printBluetoothEscPosLabel(params: {
  barcode: string;
  inputBarcode?: string;
  settings: PrinterSettings;
}): Promise<void> {
  const module = loadThermalModule();
  if (!module) {
    throw new Error('BLUETOOTH_MODULE_UNAVAILABLE');
  }

  const code = escapeEscPosText(params.barcode);
  const input = params.inputBarcode?.trim() ? escapeEscPosText(params.inputBarcode) : '';
  const lines: string[] = [];
  if (input) {
    lines.push(`[C]<font size='wide'>${input}</font>`);
    lines.push('[L]');
  }
  lines.push(`[C]<barcode type='128' height='48'>${code}</barcode>`);
  lines.push(`[C]<font size='tall'>${code}</font>`);
  lines.push('[L]');
  lines.push('[L]');
  lines.push('[C]MARKET LINK · Inventory');
  lines.push('[L]');
  lines.push('[L]');

  const payload = lines.join('\n');
  const copies = Math.max(1, params.settings.copies);

  for (let i = 0; i < copies; i += 1) {
    await module.printBluetooth({
      payload,
      printerWidthMM: params.settings.labelWidthMm,
      printerNbrCharactersPerLine: charsPerLine(params.settings.labelWidthMm),
      autoCut: true,
      mmFeedPaper: 6,
      timeout: 30000,
    });
  }
}
