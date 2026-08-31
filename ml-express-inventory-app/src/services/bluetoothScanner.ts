import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager, type Device, type State } from 'react-native-ble-plx';
import type { ScannedBluetoothDevice } from '../utils/bluetoothDeviceMerge';
import {
  isAlreadyConnectedError,
  isBleUserStateError,
  shouldRetryConnectWithScan,
} from '../utils/blePrinterErrors';

export type { ScannedBluetoothDevice } from '../utils/bluetoothDeviceMerge';
export { mergeScannedDevices } from '../utils/bluetoothDeviceMerge';

const CONNECTED_DEVICE_KEY = 'inventory_connected_bluetooth_device';
const CONNECT_TIMEOUT_MS = 15000;
const BLUETOOTH_READY_TIMEOUT_MS = 12000;
const RECONNECT_SCAN_MS = 10000;

let manager: BleManager | null = null;
let connectedDevice: Device | null = null;
let disconnectSub: { remove: () => void } | null = null;

function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

async function persistConnectedDevice(device: ScannedBluetoothDevice | null): Promise<void> {
  if (!device) {
    await AsyncStorage.removeItem(CONNECTED_DEVICE_KEY);
    return;
  }
  await AsyncStorage.setItem(CONNECTED_DEVICE_KEY, JSON.stringify(device));
}

export async function loadSavedBluetoothDevice(): Promise<ScannedBluetoothDevice | null> {
  const raw = await AsyncStorage.getItem(CONNECTED_DEVICE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ScannedBluetoothDevice;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function deviceFromBle(device: Device): ScannedBluetoothDevice {
  const name = device.name?.trim() || device.localName?.trim() || '';
  return {
    id: device.id,
    name: name || device.id,
    rssi: device.rssi,
  };
}

function attachDisconnectListener(device: Device): void {
  disconnectSub?.remove();
  disconnectSub = device.onDisconnected(() => {
    if (connectedDevice?.id === device.id) connectedDevice = null;
    disconnectSub?.remove();
    disconnectSub = null;
  });
}

export async function getLiveConnectedBluetoothDevice(): Promise<ScannedBluetoothDevice | null> {
  if (!connectedDevice) return null;
  try {
    if (await connectedDevice.isConnected()) return deviceFromBle(connectedDevice);
  } catch {
    connectedDevice = null;
  }
  return null;
}

export async function getActiveBluetoothDevice(): Promise<ScannedBluetoothDevice | null> {
  return (await getLiveConnectedBluetoothDevice()) ?? loadSavedBluetoothDevice();
}

export async function requestBluetoothScanPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getBluetoothState(): Promise<State> {
  return getManager().state();
}

function mapBluetoothStateError(state: State): Error | null {
  if (state === 'PoweredOff') return new Error('BLUETOOTH_OFF');
  if (state === 'Unauthorized') return new Error('BLUETOOTH_PERMISSION_DENIED');
  if (state === 'Unsupported') return new Error('BLUETOOTH_UNSUPPORTED');
  return null;
}

async function waitForBluetoothReady(ble: BleManager): Promise<void> {
  const initial = await ble.state();
  if (initial === 'PoweredOn') return;

  const immediateError = mapBluetoothStateError(initial);
  if (immediateError) throw immediateError;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      subscription.remove();
      reject(new Error('BLUETOOTH_READY_TIMEOUT'));
    }, BLUETOOTH_READY_TIMEOUT_MS);

    const subscription = ble.onStateChange((state) => {
      if (settled) return;
      if (state === 'PoweredOn') {
        settled = true;
        clearTimeout(timer);
        subscription.remove();
        resolve();
        return;
      }
      const stateError = mapBluetoothStateError(state);
      if (stateError) {
        settled = true;
        clearTimeout(timer);
        subscription.remove();
        reject(stateError);
      }
    }, true);
  });
}

async function ensureBleReady(): Promise<BleManager> {
  const granted = await requestBluetoothScanPermissions();
  if (!granted) throw new Error('BLUETOOTH_PERMISSION_DENIED');
  const ble = getManager();
  await waitForBluetoothReady(ble);
  return ble;
}

export async function startBluetoothScan(
  onDevices: (devices: ScannedBluetoothDevice[]) => void,
  onError?: (error: Error) => void,
): Promise<() => void> {
  const ble = await ensureBleReady();
  const devices = new Map<string, ScannedBluetoothDevice>();

  ble.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
    if (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    if (!device) return;
    devices.set(device.id, deviceFromBle(device));
    onDevices([...devices.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)));
  });

  return () => {
    ble.stopDeviceScan();
  };
}

async function adoptDevice(device: Device): Promise<Device> {
  await device.discoverAllServicesAndCharacteristics();
  attachDisconnectListener(device);
  connectedDevice = device;
  await persistConnectedDevice(deviceFromBle(device));
  return device;
}

async function connectAndDiscover(ble: BleManager, deviceId: string): Promise<Device> {
  ble.stopDeviceScan();
  try {
    const device = await ble.connectToDevice(deviceId, { timeout: CONNECT_TIMEOUT_MS });
    return adoptDevice(device);
  } catch (error) {
    if (isAlreadyConnectedError(error)) {
      const known = await ble.devices([deviceId]);
      const live = known[0];
      if (live) return adoptDevice(live);
    }
    throw error;
  }
}

async function scanForDeviceId(ble: BleManager, deviceId: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      ble.stopDeviceScan();
      reject(new Error('BLE_PRINTER_NOT_FOUND'));
    }, RECONNECT_SCAN_MS);

    ble.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (settled) return;
      if (error) {
        settled = true;
        clearTimeout(timer);
        ble.stopDeviceScan();
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      if (!device || device.id !== deviceId) return;
      settled = true;
      clearTimeout(timer);
      ble.stopDeviceScan();
      resolve();
    });
  });
}

async function connectWithFallback(ble: BleManager, deviceId: string): Promise<Device> {
  try {
    const known = await ble.devices([deviceId]);
    const cached = known[0];
    if (cached) {
      try {
        if (await cached.isConnected()) return adoptDevice(cached);
      } catch {
        // fall through to connect
      }
    }
  } catch {
    // retrievePeripherals may be empty after cold start
  }

  try {
    return await connectAndDiscover(ble, deviceId);
  } catch (error) {
    if (!shouldRetryConnectWithScan(error)) throw error;
  }

  await scanForDeviceId(ble, deviceId);
  return connectAndDiscover(ble, deviceId);
}

async function dropCurrentConnection(): Promise<void> {
  disconnectSub?.remove();
  disconnectSub = null;
  if (!connectedDevice) return;
  try {
    await connectedDevice.cancelConnection();
  } catch {
    // ignore stale connection
  } finally {
    connectedDevice = null;
  }
}

export async function connectBluetoothDevice(deviceId: string): Promise<ScannedBluetoothDevice> {
  const ble = await ensureBleReady();
  if (connectedDevice?.id === deviceId) {
    try {
      if (await connectedDevice.isConnected()) return deviceFromBle(connectedDevice);
    } catch {
      connectedDevice = null;
    }
  } else {
    await dropCurrentConnection();
  }

  const device = await connectWithFallback(ble, deviceId);
  return deviceFromBle(device);
}

export async function disconnectBluetoothDevice(): Promise<void> {
  await dropCurrentConnection();
  await persistConnectedDevice(null);
}

export async function ensureConnectedBleDevice(): Promise<Device> {
  const ble = await ensureBleReady();

  if (connectedDevice) {
    try {
      if (await connectedDevice.isConnected()) return connectedDevice;
    } catch {
      connectedDevice = null;
    }
  }

  const saved = await loadSavedBluetoothDevice();
  if (!saved?.id) throw new Error('BLE_PRINTER_NOT_CONNECTED');

  try {
    return await connectWithFallback(ble, saved.id);
  } catch (error) {
    if (isBleUserStateError(error)) throw error;
    throw new Error('BLE_PRINTER_NOT_FOUND');
  }
}

export async function stopBluetoothScanner(): Promise<void> {
  if (!manager) return;
  manager.stopDeviceScan();
  await manager.destroy();
  manager = null;
  connectedDevice = null;
  disconnectSub?.remove();
  disconnectSub = null;
}
