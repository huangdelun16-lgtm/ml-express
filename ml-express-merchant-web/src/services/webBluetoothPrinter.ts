import { PREFERRED_BLE_WRITE_TARGETS, WEB_BLE_DEVICE_CACHE_KEY } from '../constants/blePrinter';

const CHUNK_SIZE = 180;
const CHUNK_DELAY_MS = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type CachedBleDevice = {
  id: string;
  name: string;
};

let activeDevice: any = null;
let activeCharacteristic: any = null;

export function getCachedBleDevice(): CachedBleDevice | null {
  try {
    const raw = localStorage.getItem(WEB_BLE_DEVICE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedBleDevice;
  } catch {
    return null;
  }
}

export function cacheBleDevice(device: CachedBleDevice | null): void {
  if (!device) {
    localStorage.removeItem(WEB_BLE_DEVICE_CACHE_KEY);
    return;
  }
  localStorage.setItem(WEB_BLE_DEVICE_CACHE_KEY, JSON.stringify(device));
}

function normalizeUuid(value: string): string {
  return value.toLowerCase();
}

async function findWritableCharacteristic(server: any): Promise<any> {
  for (const preferred of PREFERRED_BLE_WRITE_TARGETS) {
    try {
      const service = await server.getPrimaryService(preferred.serviceUUID);
      const char = await service.getCharacteristic(preferred.characteristicUUID);
      return char;
    } catch {
      /* try next */
    }
  }

  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const char of chars) {
      if (char.properties.writeWithoutResponse || char.properties.write) {
        return char;
      }
    }
  }

  throw new Error('BLE_WRITE_CHAR_NOT_FOUND');
}

export async function connectWebBluetoothPrinter(): Promise<CachedBleDevice> {
  const nav = navigator as Navigator & { bluetooth?: { requestDevice: (options: unknown) => Promise<any> } };
  if (!nav.bluetooth) throw new Error('WEB_BLUETOOTH_UNSUPPORTED');

  const optionalServices = Array.from(
    new Set(PREFERRED_BLE_WRITE_TARGETS.map((t) => t.serviceUUID)),
  );

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices,
  });

  if (!device.gatt) throw new Error('BLE_GATT_UNAVAILABLE');

  const server = await device.gatt.connect();
  activeCharacteristic = await findWritableCharacteristic(server);
  activeDevice = device;

  device.addEventListener('gattserverdisconnected', () => {
    activeDevice = null;
    activeCharacteristic = null;
  });

  const cached: CachedBleDevice = {
    id: device.id,
    name: device.name || device.id,
  };
  cacheBleDevice(cached);
  return cached;
}

export async function disconnectWebBluetoothPrinter(): Promise<void> {
  if (activeDevice?.gatt?.connected) {
    activeDevice.gatt.disconnect();
  }
  activeDevice = null;
  activeCharacteristic = null;
  cacheBleDevice(null);
}

export function isWebBluetoothConnected(): boolean {
  return Boolean(activeDevice?.gatt?.connected && activeCharacteristic);
}

export async function sendEscPosViaWebBluetooth(bytes: Uint8Array): Promise<void> {
  if (!bytes.length) throw new Error('BLE_EMPTY_PAYLOAD');

  if (!activeCharacteristic || !activeDevice?.gatt?.connected) {
    throw new Error('BLE_PRINTER_NOT_CONNECTED');
  }

  const char = activeCharacteristic;
  const useResponse = char.properties.write && !char.properties.writeWithoutResponse;

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.slice(offset, offset + CHUNK_SIZE);
    if (useResponse) {
      await char.writeValue(chunk);
    } else {
      await char.writeValueWithoutResponse(chunk);
    }
    if (offset + CHUNK_SIZE < bytes.length) {
      await sleep(CHUNK_DELAY_MS);
    }
  }
}
