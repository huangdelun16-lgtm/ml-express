import { Alert } from 'react-native';
import type { OrderBarcodeData } from '../components/OrderBarcodeModal';
import type { TranslationDict } from '../i18n/translations';
import { loadSavedBluetoothDevice } from './bluetoothScanner';
import { printOrderBarcodeLabel } from './bleLabelPrinter';
import type { LabelBarcodeLayoutConfig } from '../constants/labelBarcodeLayout';

export function resolvePrintError(t: TranslationDict, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (msg === 'BLE_PRINTER_NOT_CONNECTED') return t.settings.scanPrinterConnectFailed;
  if (msg === 'BLE_WRITE_CHAR_NOT_FOUND') return t.settings.printWindowWriteCharMissing;
  if (/connect|timeout|not connected/i.test(msg)) return t.settings.scanPrinterConnectFailed;
  return msg || t.settings.printFailed;
}

export async function runBarcodeLabelPrint(
  data: OrderBarcodeData,
  copies = 1,
  layout?: LabelBarcodeLayoutConfig,
): Promise<void> {
  await printOrderBarcodeLabel(data, copies, layout);
}

export function runBarcodeLabelPrintWithAlert(
  data: OrderBarcodeData,
  t: TranslationDict,
  onSuccess?: () => void,
): void {
  void (async () => {
    const saved = await loadSavedBluetoothDevice();
    if (!saved) {
      Alert.alert(t.settings.printFailed, t.settings.scanPrinterNotConfigured);
      return;
    }
    try {
      await runBarcodeLabelPrint(data);
      Alert.alert(t.settings.printSentTitle, t.settings.printSentBody, [
        { text: t.common.ok, onPress: onSuccess },
      ]);
    } catch (error) {
      Alert.alert(t.settings.printFailed, resolvePrintError(t, error));
    }
  })();
}
