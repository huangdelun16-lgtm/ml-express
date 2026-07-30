import type { ScannedBluetoothDevice } from './bluetoothDeviceMerge';

/** 已知打印机品牌/型号关键词（小票机、标签机、针式/热敏等） */
const PRINTER_NAME_PATTERNS = [
  /xprinter/i,
  /\bxp[-_]?p?\d/i,
  /\bxp[-_]?\d/i,
  /printer/i,
  /print/i,
  /label/i,
  /receipt/i,
  /tspl/i,
  /esc\/pos/i,
  /escpos/i,
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
  /p210/i,
  /p300/i,
  /p800/i,
  /tsc/i,
  /zebra/i,
  /bixolon/i,
  /rongta/i,
  /gprinter/i,
  /hprt/i,
  /sunmi/i,
  /imin/i,
  /sprt/i,
  /citizen/i,
  /star[\s-]?m/i,
  /epson/i,
  /brother/i,
  /cannon/i,
  /canon/i,
  /hp[\s-]?\d/i,
  /bt[-_]?\d{2,4}/i,
  /spp[-_]/i,
  /bluetooth[\s-]?printer/i,
  /ble[\s-]?print/i,
  /58mm/i,
  /80mm/i,
  /打印/i,
  /小票/i,
  /票据/i,
  /标签/i,
];

/** 明确不是打印机的常见蓝牙设备 */
const NON_PRINTER_PATTERNS = [
  /iphone/i,
  /ipad/i,
  /macbook/i,
  /imac/i,
  /airpod/i,
  /airpods/i,
  /watch/i,
  /galaxy/i,
  /samsung/i,
  /pixel/i,
  /buds/i,
  /headphone/i,
  /headset/i,
  /earphone/i,
  /keyboard/i,
  /mouse/i,
  /trackpad/i,
  /tv\b/i,
  /television/i,
  /speaker/i,
  /soundbar/i,
  /carplay/i,
  /android auto/i,
  /tile\b/i,
  /fitbit/i,
  /whoop/i,
  /oura/i,
  /ring\b/i,
  /beacon/i,
  /ibeacon/i,
  /meter/i,
  /scale\b/i,
  /band\b/i,
];

function isMacLikeName(name: string): boolean {
  return (
    /^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i.test(name) ||
    /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(name)
  );
}

function hasPrinterKeyword(name: string): boolean {
  return PRINTER_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

function isObviousNonPrinter(name: string): boolean {
  return NON_PRINTER_PATTERNS.some((pattern) => pattern.test(name));
}

/** 未广播可读名称时，很多热敏/小票机只显示 MAC 或 UUID */
function isUnnamedPrinterBroadcast(device: ScannedBluetoothDevice): boolean {
  const name = device.name?.trim() ?? '';
  if (!name) return true;
  if (name === device.id) return true;
  if (isMacLikeName(name)) return true;
  return false;
}

export function isLikelyBlePrinterDevice(device: ScannedBluetoothDevice): boolean {
  const name = device.name?.trim() ?? '';

  if (name && isObviousNonPrinter(name)) return false;
  if (name && hasPrinterKeyword(name)) return true;
  if (isUnnamedPrinterBroadcast(device)) return true;

  return false;
}

export function filterLikelyBlePrinters(devices: ScannedBluetoothDevice[]): ScannedBluetoothDevice[] {
  return devices
    .filter(isLikelyBlePrinterDevice)
    .sort((a, b) => {
      const aNamed = hasPrinterKeyword(a.name?.trim() ?? '') ? 1 : 0;
      const bNamed = hasPrinterKeyword(b.name?.trim() ?? '') ? 1 : 0;
      if (aNamed !== bNamed) return bNamed - aNamed;
      return (b.rssi ?? -999) - (a.rssi ?? -999);
    });
}

export function getBlePrinterDisplayName(
  device: ScannedBluetoothDevice,
  unnamedLabel: string,
): string {
  const name = device.name?.trim() ?? '';
  if (!name || name === device.id || isMacLikeName(name)) {
    const shortId = device.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    return unnamedLabel.replace('{id}', shortId);
  }
  return name;
}
