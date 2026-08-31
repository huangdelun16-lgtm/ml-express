import { feedbackService } from './FeedbackService';
import type { OrderBarcodeData } from '../components/OrderBarcodeModal';
import type { TranslationDict } from '../i18n/translations';
import { ensureConnectedBleDevice } from './bluetoothScanner';
import { printOrderBarcodeLabel } from './bleLabelPrinter';
import { requestPrinterPicker } from './printerPickerBridge';
import type { LabelBarcodeLayoutConfig } from '../constants/labelBarcodeLayout';
import type { LabelPaperSpec } from '../constants/labelPaperSpec';
import {
  bleErrorMessage,
  isBlePickerRequiredError,
  isBleUserStateError,
} from '../utils/blePrinterErrors';

export function resolvePrintError(t: TranslationDict, error: unknown): string {
  const msg = bleErrorMessage(error);
  if (msg === 'BLE_PRINTER_NOT_CONNECTED') return t.settings.printNeedPrinter;
  if (msg === 'BLE_PRINTER_NOT_FOUND') return t.settings.scanPrinterConnectFailed;
  if (msg === 'BLE_WRITE_CHAR_NOT_FOUND') return t.settings.printWindowWriteCharMissing;
  if (msg === 'BLUETOOTH_OFF' || msg === 'BLUETOOTH_READY_TIMEOUT') {
    return t.settings.scanPrinterBluetoothOff;
  }
  if (msg === 'BLUETOOTH_PERMISSION_DENIED') return t.settings.scanPrinterPermissionDenied;
  if (msg === 'BLUETOOTH_UNSUPPORTED') return t.settings.scanPrinterUnavailable;
  if (/connect|timeout|not connected/i.test(msg)) return t.settings.scanPrinterConnectFailed;
  return msg || t.settings.printFailed;
}

export async function ensurePrinterReady(): Promise<boolean> {
  try {
    await ensureConnectedBleDevice();
    return true;
  } catch (error) {
    if (isBleUserStateError(error)) throw error;
    if (isBlePickerRequiredError(error)) return requestPrinterPicker();
    throw error;
  }
}

export async function runBarcodeLabelPrint(
  data: OrderBarcodeData,
  copies = 1,
  layout?: LabelBarcodeLayoutConfig,
  paper?: LabelPaperSpec,
): Promise<void> {
  await printOrderBarcodeLabel(data, copies, layout, paper);
}

/** 未选机或冷启动连不上时弹选机，选完自动重试。取消选机返回 false。 */
export async function printBarcodeLabelOrPick(
  data: OrderBarcodeData,
  copies = 1,
  layout?: LabelBarcodeLayoutConfig,
  paper?: LabelPaperSpec,
): Promise<boolean> {
  const ready = await ensurePrinterReady();
  if (!ready) return false;
  try {
    await runBarcodeLabelPrint(data, copies, layout, paper);
    return true;
  } catch (error) {
    if (!isBlePickerRequiredError(error)) throw error;
    const picked = await requestPrinterPicker();
    if (!picked) return false;
    await runBarcodeLabelPrint(data, copies, layout, paper);
    return true;
  }
}

export function runBarcodeLabelPrintWithAlert(
  data: OrderBarcodeData,
  t: TranslationDict,
  onSuccess?: () => void,
): void {
  void (async () => {
    try {
      const printed = await printBarcodeLabelOrPick(data);
      if (!printed) return;
      feedbackService.notify(t.settings.printSentTitle, t.settings.printSentBody);
      onSuccess?.();
    } catch (error) {
      feedbackService.notify(t.settings.printFailed, resolvePrintError(t, error));
    }
  })();
}
