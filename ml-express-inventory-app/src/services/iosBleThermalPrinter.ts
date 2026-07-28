import { Platform } from 'react-native';
import type { PrintLabelSheetKind } from './printLabelSheets';
import type { LabelPrintPayload, PrinterSettings } from './printerService';
import { buildTsplInboundLabel } from './tsplLabelBuilder';

type BleModule = typeof import('ml-xprinter-ble');

let cachedModule: BleModule | null | undefined;

function loadBleModule(): BleModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS !== 'ios') {
    cachedModule = null;
    return cachedModule;
  }
  try {
    cachedModule = require('ml-xprinter-ble') as BleModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function isIosBleThermalAvailable(): boolean {
  const mod = loadBleModule();
  if (!mod) return false;
  try {
    return mod.isIosBlePrintAvailable();
  } catch {
    return false;
  }
}

export type IosBlePrinterDevice = {
  id: string;
  name: string;
  rssi: number;
};

export async function scanIosBlePrinters(
  onDevices: (devices: IosBlePrinterDevice[]) => void,
): Promise<() => void> {
  const mod = loadBleModule();
  if (!mod) throw new Error('IOS_BLE_MODULE_UNAVAILABLE');
  const sub = mod.startBleScan(onDevices);
  return () => {
    sub.remove();
    void mod.stopBleScan();
  };
}

export async function connectIosBlePrinter(deviceId: string): Promise<boolean> {
  const mod = loadBleModule();
  if (!mod) throw new Error('IOS_BLE_MODULE_UNAVAILABLE');
  return mod.connectBlePrinter(deviceId);
}

export async function disconnectIosBlePrinter(): Promise<void> {
  const mod = loadBleModule();
  if (!mod) return;
  await mod.disconnectBlePrinter();
}

export function isIosBlePrinterConnected(): boolean {
  const mod = loadBleModule();
  if (!mod) return false;
  try {
    return mod.isBlePrinterConnected();
  } catch {
    return false;
  }
}

export async function printIosBleLabel(params: {
  barcode: string;
  inputBarcode?: string;
  extras?: Partial<LabelPrintPayload>;
  settings: PrinterSettings;
  sheetKind?: PrintLabelSheetKind;
}): Promise<void> {
  const mod = loadBleModule();
  if (!mod) throw new Error('IOS_BLE_MODULE_UNAVAILABLE');

  const deviceId = params.settings.iosBlePrinterId?.trim();
  if (!deviceId) throw new Error('IOS_BLE_PRINTER_NOT_SELECTED');

  if (!mod.isBlePrinterConnected()) {
    const ok = await mod.connectBlePrinter(deviceId);
    if (!ok) throw new Error('IOS_BLE_CONNECT_FAILED');
  }

  const tspl = buildTsplInboundLabel({
    barcode: params.barcode,
    extras: {
      ...params.extras,
      inputBarcode: params.inputBarcode ?? params.extras?.inputBarcode,
    },
    widthMm: params.settings.labelWidthMm,
    heightMm: params.settings.labelHeightMm,
    gapMm: params.settings.labelGapMm,
    copies: params.settings.copies,
    sheetKind: params.sheetKind ?? 'barcode',
  });

  await mod.sendTsplPayload(tspl);
}
