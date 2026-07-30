import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager, type Device, type State } from 'react-native-ble-plx';
import type { ScannedBluetoothDevice } from '../utils/bluetoothDeviceMerge';

export type { ScannedBluetoothDevice } from '../utils/bluetoothDeviceMerge';
export { mergeScannedDevices } from '../utils/bluetoothDeviceMerge';

const CONNECTED_DEVICE_KEY = 'merchant_connected_bluetooth_device';
const CONNECT_TIMEOUT_MS = 15000;

let manager: BleManager | null = null;
let connectedDevice: Device | null = null;

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

export async function getActiveBluetoothDevice(): Promise<ScannedBluetoothDevice | null> {
  if (connectedDevice) {
    try {
      const isConnected = await connectedDevice.isConnected();
      if (isConnected) return deviceFromBle(connectedDevice);
    } catch {
      connectedDevice = null;
    }
  }

  return loadSavedBluetoothDevice();
}

export function deviceFromBle(device: Device): ScannedBluetoothDevice {
  const name = device.name?.trim() || device.localName?.trim() || '';
  return {
    id: device.id,
    name: name || device.id,
    rssi: device.rssi,
  };
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

export async function startBluetoothScan(
  onDevices: (devices: ScannedBluetoothDevice[]) => void,
): Promise<() => void> {
  const ble = getManager();
  const state = await ble.state();
  if (state !== 'PoweredOn') {
    throw new Error('BLUETOOTH_OFF');
  }

  const devices = new Map<string, ScannedBluetoothDevice>();

  ble.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
    if (error || !device) return;
    devices.set(device.id, deviceFromBle(device));
    onDevices([...devices.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)));
  });

  return () => {
    ble.stopDeviceScan();
  };
}

export async function connectBluetoothDevice(deviceId: string): Promise<ScannedBluetoothDevice> {
  const ble = getManager();
  ble.stopDeviceScan();

  if (connectedDevice) {
    try {
      await connectedDevice.cancelConnection();
    } catch {
      // ignore stale connection
    }
    connectedDevice = null;
  }

  const device = await ble.connectToDevice(deviceId, { timeout: CONNECT_TIMEOUT_MS });
  await device.discoverAllServicesAndCharacteristics();
  connectedDevice = device;

  const snapshot = deviceFromBle(device);
  await persistConnectedDevice(snapshot);
  return snapshot;
}

export async function disconnectBluetoothDevice(): Promise<void> {
  if (connectedDevice) {
    try {
      await connectedDevice.cancelConnection();
    } finally {
      connectedDevice = null;
    }
  }
  await persistConnectedDevice(null);
}
