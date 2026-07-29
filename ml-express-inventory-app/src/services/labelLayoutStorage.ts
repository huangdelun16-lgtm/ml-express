import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_LABEL_BARCODE_LAYOUT,
  normalizeLabelBarcodeLayout,
  type LabelBarcodeLayoutConfig,
} from '../constants/labelBarcodeLayout';
import { loadSavedBluetoothDevice } from './bluetoothScanner';

const LABEL_LAYOUT_KEY_PREFIX = 'inventory_label_layout_v1_';

function layoutKey(deviceId: string): string {
  return `${LABEL_LAYOUT_KEY_PREFIX}${deviceId}`;
}

export async function loadLabelLayoutForPrinter(
  deviceId: string,
): Promise<LabelBarcodeLayoutConfig> {
  if (!deviceId) return DEFAULT_LABEL_BARCODE_LAYOUT;
  const raw = await AsyncStorage.getItem(layoutKey(deviceId));
  if (!raw) return DEFAULT_LABEL_BARCODE_LAYOUT;
  try {
    const parsed = normalizeLabelBarcodeLayout(JSON.parse(raw));
    return parsed ?? DEFAULT_LABEL_BARCODE_LAYOUT;
  } catch {
    return DEFAULT_LABEL_BARCODE_LAYOUT;
  }
}

export async function saveLabelLayoutForPrinter(
  deviceId: string,
  layout: LabelBarcodeLayoutConfig,
): Promise<void> {
  if (!deviceId) return;
  await AsyncStorage.setItem(layoutKey(deviceId), JSON.stringify(layout));
}

export async function clearLabelLayoutForPrinter(deviceId: string): Promise<void> {
  if (!deviceId) return;
  await AsyncStorage.removeItem(layoutKey(deviceId));
}

export async function loadLabelLayoutForActivePrinter(): Promise<LabelBarcodeLayoutConfig> {
  const saved = await loadSavedBluetoothDevice();
  if (!saved?.id) return DEFAULT_LABEL_BARCODE_LAYOUT;
  return loadLabelLayoutForPrinter(saved.id);
}
