export type ScannedBluetoothDevice = {
  id: string;
  name: string;
  rssi: number | null;
};

export function mergeScannedDevices(
  prev: ScannedBluetoothDevice[],
  found: ScannedBluetoothDevice[],
): ScannedBluetoothDevice[] {
  const map = new Map(prev.map((device) => [device.id, device]));
  for (const device of found) map.set(device.id, device);
  return [...map.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
}
