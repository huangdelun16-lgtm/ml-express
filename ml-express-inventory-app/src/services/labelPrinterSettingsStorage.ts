import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildDefaultCenteredLayout,
  DEFAULT_LABEL_BARCODE_LAYOUT,
  normalizeLabelBarcodeLayout,
  type LabelBarcodeLayoutConfig,
  type LabelLayoutContentSizes,
} from '../constants/labelBarcodeLayout';
import {
  DEFAULT_LABEL_PAPER,
  normalizeLabelPaperSpec,
  type LabelPaperSpec,
} from '../constants/labelPaperSpec';
import {
  PRINT_PREVIEW_PACK_SAMPLE,
  PRINT_PREVIEW_SAMPLE,
} from '../constants/printPreviewSample';
import { loadSavedBluetoothDevice } from './bluetoothScanner';

const SETTINGS_KEY_V2_PREFIX = 'inventory_label_settings_v2_';
const LEGACY_LAYOUT_KEY_PREFIX = 'inventory_label_layout_v1_';

export type LabelPrinterSettings = {
  version: 2;
  paper: LabelPaperSpec;
  expressLayout: LabelBarcodeLayoutConfig;
  packageLayout: LabelBarcodeLayoutConfig;
};

const EXPRESS_LAYOUT_CONTENT: LabelLayoutContentSizes = {
  expressNo: PRINT_PREVIEW_SAMPLE.inputBarcode,
  barcode: PRINT_PREVIEW_SAMPLE.barcode,
  inboundCode: PRINT_PREVIEW_SAMPLE.barcode,
};

const PACKAGE_LAYOUT_CONTENT: LabelLayoutContentSizes = {
  barcode: PRINT_PREVIEW_PACK_SAMPLE.barcode,
  inboundCode: PRINT_PREVIEW_PACK_SAMPLE.barcode,
};

export function defaultExpressLayout(
  paper: LabelPaperSpec = DEFAULT_LABEL_PAPER,
): LabelBarcodeLayoutConfig {
  return buildDefaultCenteredLayout(
    EXPRESS_LAYOUT_CONTENT,
    paper.widthMm,
    paper.heightMm,
  );
}

export function defaultPackageLayout(
  paper: LabelPaperSpec = DEFAULT_LABEL_PAPER,
): LabelBarcodeLayoutConfig {
  return buildDefaultCenteredLayout(
    PACKAGE_LAYOUT_CONTENT,
    paper.widthMm,
    paper.heightMm,
  );
}

export const DEFAULT_LABEL_PRINTER_SETTINGS: LabelPrinterSettings = {
  version: 2,
  paper: DEFAULT_LABEL_PAPER,
  expressLayout: defaultExpressLayout(),
  packageLayout: defaultPackageLayout(),
};

export function layoutForPrintKind(
  settings: LabelPrinterSettings | null | undefined,
  kind?: 'inbound' | 'pack',
): LabelBarcodeLayoutConfig | undefined {
  if (!settings) return undefined;
  return kind === 'pack' ? settings.packageLayout : settings.expressLayout;
}

function settingsKey(deviceId: string): string {
  return `${SETTINGS_KEY_V2_PREFIX}${deviceId}`;
}

function legacyLayoutKey(deviceId: string): string {
  return `${LEGACY_LAYOUT_KEY_PREFIX}${deviceId}`;
}

export function normalizeLabelPrinterSettings(raw: unknown): LabelPrinterSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<LabelPrinterSettings> & {
    version?: number;
    layout?: LabelBarcodeLayoutConfig;
  };

  const paper = normalizeLabelPaperSpec(value.paper);
  if (!paper) return null;

  if (value.version === 2) {
    const expressLayout = normalizeLabelBarcodeLayout(
      value.expressLayout,
      EXPRESS_LAYOUT_CONTENT,
      paper.widthMm,
    );
    const packageLayout = normalizeLabelBarcodeLayout(
      value.packageLayout,
      PACKAGE_LAYOUT_CONTENT,
      paper.widthMm,
    );
    if (!expressLayout || !packageLayout) return null;
    return { version: 2, paper, expressLayout, packageLayout };
  }

  if (value.version === 1 && value.layout) {
    const expressLayout = normalizeLabelBarcodeLayout(
      value.layout,
      EXPRESS_LAYOUT_CONTENT,
      paper.widthMm,
    );
    if (!expressLayout) return null;
    return {
      version: 2,
      paper,
      expressLayout,
      packageLayout: defaultPackageLayout(paper),
    };
  }

  return null;
}

async function loadLegacyLayout(deviceId: string): Promise<LabelBarcodeLayoutConfig> {
  const raw = await AsyncStorage.getItem(legacyLayoutKey(deviceId));
  if (!raw) return DEFAULT_LABEL_BARCODE_LAYOUT;
  try {
    const parsed = normalizeLabelBarcodeLayout(JSON.parse(raw), EXPRESS_LAYOUT_CONTENT);
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

  const expressLayout = await loadLegacyLayout(deviceId);
  return {
    version: 2,
    paper: DEFAULT_LABEL_PAPER,
    expressLayout,
    packageLayout: defaultPackageLayout(),
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
  return (await loadLabelPrinterSettings(deviceId)).expressLayout;
}

export async function loadLabelPaperForPrinter(deviceId: string): Promise<LabelPaperSpec> {
  return (await loadLabelPrinterSettings(deviceId)).paper;
}

export async function saveLabelLayoutForPrinter(
  deviceId: string,
  layout: LabelBarcodeLayoutConfig,
): Promise<void> {
  const current = await loadLabelPrinterSettings(deviceId);
  await saveLabelPrinterSettings(deviceId, { ...current, expressLayout: layout });
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
