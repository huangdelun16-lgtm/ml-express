export type BleWriteTarget = {
  serviceUUID: string;
  characteristicUUID: string;
  withResponse: boolean;
};

export const PREFERRED_BLE_WRITE_TARGETS: BleWriteTarget[] = [
  { serviceUUID: '0000ff00-0000-1000-8000-00805f9b34fb', characteristicUUID: '0000ff02-0000-1000-8000-00805f9b34fb', withResponse: false },
  { serviceUUID: '49535343-fe7d-4ae5-8fa9-9fafd205e455', characteristicUUID: '49535343-8841-43f4-a8d4-ecbe34729bb3', withResponse: false },
  { serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb', characteristicUUID: '00002af1-0000-1000-8000-00805f9b34fb', withResponse: false },
  { serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', characteristicUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', withResponse: false },
  { serviceUUID: '0000fee7-0000-1000-8000-00805f9b34fb', characteristicUUID: '0000fec8-0000-1000-8000-00805f9b34fb', withResponse: false },
];

export const WEB_BLE_DEVICE_CACHE_KEY = 'merchant_web_ble_device';
