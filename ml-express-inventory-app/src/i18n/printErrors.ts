import { resolveAppError } from './resolveAppError';
import type { TranslationDict } from './translations';

export function resolvePrintError(t: TranslationDict, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');

  if (msg === 'BLUETOOTH_MODULE_UNAVAILABLE') {
    return t.settings.bluetoothPairHint;
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
