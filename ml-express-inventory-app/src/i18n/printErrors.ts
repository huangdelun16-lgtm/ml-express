import { resolveAppError } from './resolveAppError';
import type { TranslationDict } from './translations';

export function resolvePrintError(t: TranslationDict, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');

  if (msg === 'BLUETOOTH_MODULE_UNAVAILABLE') {
    return t.settings.bluetoothPairHint;
  }
  if (/printBluetooth.*null|null.*printBluetooth/i.test(msg)) {
    return t.settings.bluetoothPairHint;
  }
  if (msg === 'IOS_XPRINTER_BT_UNSUPPORTED' || msg === 'IOS_BLE_MODULE_UNAVAILABLE') {
    return t.settings.iosXprinterBtUnsupported;
  }
  if (msg === 'IOS_BLE_PRINTER_NOT_SELECTED') {
    return t.settings.iosPrinterNotSelected;
  }
  if (
    msg === 'IOS_BLE_NOT_CONNECTED' ||
    msg === 'IOS_BLE_CONNECT_FAILED' ||
    msg === 'IOS_BLE_PRINTER_NOT_FOUND'
  ) {
    return t.settings.iosXprinterHint;
  }
  if (msg === 'IOS_BLE_PRINT_FAILED') {
    return t.settings.printFailed;
  }
  if (msg === 'PRINT_CANCELLED') {
    return t.settings.printCancelled;
  }
  if (msg === 'IOS_PRINTER_PICKER_ONLY') {
    return t.settings.iosSelectPrinter;
  }
  if (/bluetooth|paired|connect|socket|timeout|printer/i.test(msg)) {
    return `${t.settings.printFailed}: ${msg}`;
  }
  if (/Barcode image fetch failed/i.test(msg)) {
    return t.settings.printFailed;
  }

  return resolveAppError(t, error);
}
