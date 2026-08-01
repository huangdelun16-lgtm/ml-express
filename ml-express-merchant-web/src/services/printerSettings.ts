export type PrinterConnectionType = 'system' | 'bluetooth' | 'wifi';

export type WebPrinterSettings = {
  enabled: boolean;
  type: PrinterConnectionType;
  /** BLE device id/name, or wifi host:port, or empty for system */
  address: string;
  autoPrint: boolean;
  copies: number;
  wifiHost: string;
  wifiPort: number;
  /** Optional local/cloud bridge for raw ESC/POS over TCP */
  printBridgeUrl: string;
  bleDeviceName: string;
};

export const PRINTER_SETTINGS_KEY = 'merchant_web_printer_settings';

const DEFAULT_SETTINGS: WebPrinterSettings = {
  enabled: true,
  type: 'system',
  address: '',
  autoPrint: true,
  copies: 1,
  wifiHost: '',
  wifiPort: 9100,
  printBridgeUrl: '',
  bleDeviceName: '',
};

export function loadPrinterSettings(): WebPrinterSettings {
  try {
    const raw = localStorage.getItem(PRINTER_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<WebPrinterSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function savePrinterSettings(settings: WebPrinterSettings): void {
  localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(settings));
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { bluetooth?: unknown }).bluetooth);
}

export function isSecureContextForBluetooth(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext;
}
