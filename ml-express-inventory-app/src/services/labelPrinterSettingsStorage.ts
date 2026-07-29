import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_LABEL_BARCODE_LAYOUT,
  normalizeLabelBarcodeLayout,
  type LabelBarcodeLayoutConfig,
} from '../constants/labelBarcodeLayout';
import {
  DEFAULT_LABEL_PAPER,
  normalizeLabelPaperSpec,
  type LabelPaperSpec,
} from '../constants/labelPaperSpec';
import { loadSavedBluetoothDevice } from './bluetoothScanner';

const SETTINGS_KEY_V2_PREFIX = 'inventory_label_settings_v2_';
const LEGACY_LAYOUT_KEY_PREFIX = 'inventory_label_layout_v1_';

export type LabelPrinterSettings = {
  version: 1;
  paper: LabelPaperSpec;
  layout: LabelBarcodeLayoutConfig;
};

export const DEFAULT_LABEL_PRINTER_SETTINGS: LabelPrinterSettings = {
  version: 1,
  paper: DEFAULT_LABEL_PAPER,
  layout: DEFAULT_LABEL_BARCODE_LAYOUT,
};

function settingsKey(deviceId: string): string {
  return `${SETTINGS_KEY_V2_PREFIX}${deviceId}`;
}

function legacyLayoutKey(deviceId: string): string {
  return `${LEGACY_LAYOUT_KEY_PREFIX}${deviceId}`;
}

export function normalizeLabelPrinterSettings(raw: unknown): LabelPrinterSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<LabelPrinterSettings>;
  if (value.version !== 1) return null;

  const paper = normalizeLabelPaperSpec(value.paper);
  const layout = normalizeLabelBarcodeLayout(value.layout);
  if (!paper || !layout) return null;

  return { version: 1, paper, layout };
}

async function loadLegacyLayout(deviceId: string): Promise<LabelBarcodeLayoutConfig> {
  const raw = await AsyncStorage.getItem(legacyLayoutKey(deviceId));
  if (!raw) return DEFAULT_LABEL_BARCODE_LAYOUT;
  try {
    const parsed = normalizeLabelBarcodeLayout(JSON.parse(raw));
    return parsed ?? DEFAULT_LABEL_BARCODE_LAYOUT;
  } catch {
    return DEFAULT_LABEL_BARCODE_LAYOUT;
  }
}

export async function loadLabelPrinterSettings(deviceId: string): Promise<LabelPrinterSettings> {
  if (!deviceId) return DEFAULT_LABEL_PRINTER_SETTINGS;

  const raw = await AsyncStorage.getItem(settingsKey(deviceId));
  if (raw) {
    try {
      const parsed = normalizeLabelPrinterSettings(JSON.parse(raw));
      if (parsed) return parsed;
    } catch {
      // fall through to legacy
    }
  }

  const layout = await loadLegacyLayout(deviceId);
  return {
    version: 1,
    paper: DEFAULT_LABEL_PAPER,
    layout,
  };
}

export async function saveLabelPrinterSettings(
  deviceId: string,
  settings: LabelPrinterSettings,
): Promise<void> {
  if (!deviceId) return;
  await AsyncStorage.setItem(settingsKey(deviceId), JSON.stringify(settings));
}

export async function clearLabelPrinterSettings(deviceId: string): Promise<void> {
  if (!deviceId) return;
  await AsyncStorage.multiRemove([settingsKey(deviceId), legacyLayoutKey(deviceId)]);
}

export async function loadLabelLayoutForPrinter(
  deviceId: string,
): Promise<LabelBarcodeLayoutConfig> {
  return (await loadLabelPrinterSettings(deviceId)).layout;
}

export async function loadLabelPaperForPrinter(deviceId: string): Promise<LabelPaperSpec> {
  return (await loadLabelPrinterSettings(deviceId)).paper;
}

export async function saveLabelLayoutForPrinter(
  deviceId: string,
  layout: LabelBarcodeLayoutConfig,
): Promise<void> {
  const current = await loadLabelPrinterSettings(deviceId);
  await saveLabelPrinterSettings(deviceId, { ...current, layout });
}

export async function clearLabelLayoutForPrinter(deviceId: string): Promise<void> {
  await clearLabelPrinterSettings(deviceId);
}

export async function loadLabelLayoutForActivePrinter(): Promise<LabelBarcodeLayoutConfig> {
  const saved = await loadSavedBluetoothDevice();
  if (!saved?.id) return DEFAULT_LABEL_BARCODE_LAYOUT;
  return loadLabelLayoutForPrinter(saved.id);
}

export async function loadLabelPrinterSettingsForActivePrinter(): Promise<LabelPrinterSettings> {
  const saved = await loadSavedBluetoothDevice();
  if (!saved?.id) return DEFAULT_LABEL_PRINTER_SETTINGS;
  return loadLabelPrinterSettings(saved.id);
}
