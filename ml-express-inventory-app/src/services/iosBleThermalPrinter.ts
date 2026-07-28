import { Platform } from 'react-native';
import type { PrintLabelSheetKind } from './printLabelSheets';
import type { LabelPrintPayload, PrinterSettings } from './printerService';
import { buildTsplInboundLabel } from './tsplLabelBuilder';

type BleModule = typeof import('ml-xprinter-ble');

let cachedModule: BleModule | null | undefined;

const CONNECT_TIMEOUT_MS = 15000;

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

async function withTimeout<T>(promise: Promise<T>, ms: number, code: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(code)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
  return withTimeout(mod.connectBlePrinter(deviceId), CONNECT_TIMEOUT_MS, 'IOS_BLE_CONNECT_FAILED');
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
    try {
      const ok = await withTimeout(
        mod.connectBlePrinter(deviceId),
        CONNECT_TIMEOUT_MS,
        'IOS_BLE_CONNECT_FAILED',
      );
      if (!ok) throw new Error('IOS_BLE_CONNECT_FAILED');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error ?? '');
      if (
        msg === 'IOS_BLE_CONNECT_FAILED' ||
        msg === 'IOS_BLE_PRINTER_NOT_FOUND' ||
        /connect|timeout|not found/i.test(msg)
      ) {
        throw new Error('IOS_BLE_CONNECT_FAILED');
      }
      throw error;
    }
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

  await withTimeout(mod.sendTsplPayload(tspl), CONNECT_TIMEOUT_MS, 'IOS_BLE_PRINT_FAILED');
}
