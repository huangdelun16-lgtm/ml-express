import { feedbackService } from './FeedbackService';
import type { OrderBarcodeData } from '../components/OrderBarcodeModal';
import type { TranslationDict } from '../i18n/translations';
import { loadSavedBluetoothDevice } from './bluetoothScanner';
import { printOrderBarcodeLabel } from './bleLabelPrinter';
import { requestPrinterPicker } from './printerPickerBridge';
import type { LabelBarcodeLayoutConfig } from '../constants/labelBarcodeLayout';
import type { LabelPaperSpec } from '../constants/labelPaperSpec';

export function resolvePrintError(t: TranslationDict, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (msg === 'BLE_PRINTER_NOT_CONNECTED') return t.settings.scanPrinterConnectFailed;
  if (msg === 'BLE_WRITE_CHAR_NOT_FOUND') return t.settings.printWindowWriteCharMissing;
  if (/connect|timeout|not connected/i.test(msg)) return t.settings.scanPrinterConnectFailed;
  return msg || t.settings.printFailed;
}

export async function ensurePrinterSelected(): Promise<boolean> {
  const saved = await loadSavedBluetoothDevice();
  if (saved) return true;
  return requestPrinterPicker();
}

export async function runBarcodeLabelPrint(
  data: OrderBarcodeData,
  copies = 1,
  layout?: LabelBarcodeLayoutConfig,
  paper?: LabelPaperSpec,
): Promise<void> {
  await printOrderBarcodeLabel(data, copies, layout, paper);
}

export function runBarcodeLabelPrintWithAlert(
  data: OrderBarcodeData,
  t: TranslationDict,
  onSuccess?: () => void,
): void {
  void (async () => {
    const selected = await ensurePrinterSelected();
    if (!selected) return;
    try {
      await runBarcodeLabelPrint(data);
      feedbackService.notify(t.settings.printSentTitle, t.settings.printSentBody);
      onSuccess?.();
    } catch (error) {
      feedbackService.notify(t.settings.printFailed, resolvePrintError(t, error));
    }
  })();
}
