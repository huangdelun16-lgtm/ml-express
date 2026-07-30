import type { ScannedBluetoothDevice } from './bluetoothDeviceMerge';

const PRINTER_NAME_PATTERNS = [
  /xprinter/i,
  /\bxp[-_]?p?\d/i,
  /\bxp[-_]?\d/i,
  /printer/i,
  /label/i,
  /receipt/i,
  /tspl/i,
  /thermal/i,
  /goojprt/i,
  /phomemo/i,
  /niimbot/i,
  /mpt[-_]?\d/i,
  /mtp[-_]?\d/i,
  /pos[-_]?\d/i,
  /rp[-_]?\d/i,
  /p203/i,
  /p201/i,
  /tsc/i,
  /zebra/i,
  /bixolon/i,
  /rongta/i,
  /gprinter/i,
  /hprt/i,
  /打印/i,
  /小票/i,
];

const NON_PRINTER_PATTERNS = [
  /iphone/i,
  /ipad/i,
  /macbook/i,
  /airpod/i,
  /watch/i,
  /galaxy/i,
  /samsung/i,
  /pixel/i,
  /buds/i,
  /headphone/i,
  /keyboard/i,
  /mouse/i,
  /tv/i,
  /speaker/i,
  /carplay/i,
  /tile/i,
  /fitbit/i,
];

export function isLikelyBlePrinterDevice(device: ScannedBluetoothDevice): boolean {
  const name = device.name?.trim() ?? '';
  if (!name || name === device.id) return false;
  if (NON_PRINTER_PATTERNS.some((pattern) => pattern.test(name))) return false;
  return PRINTER_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

export function filterLikelyBlePrinters(devices: ScannedBluetoothDevice[]): ScannedBluetoothDevice[] {
  return devices.filter(isLikelyBlePrinterDevice);
}
