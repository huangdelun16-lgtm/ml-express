import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';

export type BlePrinterDevice = {
  id: string;
  name: string;
  rssi: number;
};

type NativeModule = {
  startScan(): void;
  stopScan(): void;
  connect(deviceId: string): Promise<boolean>;
  disconnect(): void;
  isConnected(): boolean;
  sendTspl(payload: string): Promise<void>;
};

const Native: NativeModule | undefined = NativeModules.MlXprinterBle;
const emitter = Native ? new NativeEventEmitter(NativeModules.MlXprinterBle) : null;

export function startBleScan(
  onDevices: (devices: BlePrinterDevice[]) => void,
): EmitterSubscription {
  if (!Native || !emitter) {
    return { remove: () => {} } as EmitterSubscription;
  }
  const sub = emitter.addListener('onDeviceFound', (event: { devices?: BlePrinterDevice[] }) => {
    if (event.devices?.length) onDevices(event.devices);
  });
  Native.startScan();
  return sub;
}

export async function stopBleScan(): Promise<void> {
  Native?.stopScan();
}

export async function connectBlePrinter(deviceId: string): Promise<boolean> {
  if (!Native) throw new Error('IOS_BLE_MODULE_UNAVAILABLE');
  return Native.connect(deviceId);
}

export async function disconnectBlePrinter(): Promise<void> {
  Native?.disconnect();
}

export function isBlePrinterConnected(): boolean {
  if (!Native) return false;
  try {
    return Boolean(Native.isConnected());
  } catch {
    return false;
  }
}

export async function sendTsplPayload(payload: string): Promise<void> {
  if (!Native) throw new Error('IOS_BLE_MODULE_UNAVAILABLE');
  await Native.sendTspl(payload);
}

export function onBleConnectionChanged(
  listener: (connected: boolean, error?: string) => void,
): EmitterSubscription {
  if (!emitter) {
    return { remove: () => {} } as EmitterSubscription;
  }
  return emitter.addListener(
    'onConnectionChanged',
    (event: { connected?: boolean; error?: string }) => {
      listener(Boolean(event.connected), event.error);
    },
  );
}

export function isIosBlePrintAvailable(): boolean {
  return Platform.OS === 'ios' && NativeModules.MlXprinterBle != null;
}
