export type BleWriteTarget = {
  serviceUUID: string;
  characteristicUUID: string;
  withResponse: boolean;
};

/** 常见蓝牙标签机 / 串口透传 UUID（小写比较） */
export const PREFERRED_BLE_WRITE_TARGETS: BleWriteTarget[] = [
  {
    serviceUUID: '0000ff00-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '0000ff02-0000-1000-8000-00805f9b34fb',
    withResponse: false,
  },
  {
    serviceUUID: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    characteristicUUID: '49535343-8841-43f4-a8d4-ecbe34729bb3',
    withResponse: false,
  },
  {
    serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '00002af1-0000-1000-8000-00805f9b34fb',
    withResponse: false,
  },
];

export const BLE_WRITE_CHAR_CACHE_KEY = 'inventory_ble_write_char';
