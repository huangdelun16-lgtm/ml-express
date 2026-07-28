import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Device, Characteristic } from 'react-native-ble-plx';
import {
  BLE_WRITE_CHAR_CACHE_KEY,
  PREFERRED_BLE_WRITE_TARGETS,
  type BleWriteTarget,
} from '../constants/blePrinter';
import type { OrderBarcodeData } from '../components/OrderBarcodeModal';
import { ensureConnectedBleDevice } from './bluetoothScanner';
import { buildTsplInboundLabel } from './tsplLabelBuilder';

const CHUNK_SIZE = 180;
const CHUNK_DELAY_MS = 25;

type CachedWriteTarget = BleWriteTarget & { deviceId: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringToBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function normalizeUuid(value: string): string {
  return value.toLowerCase();
}

async function loadCachedWriteTarget(deviceId: string): Promise<BleWriteTarget | null> {
  const raw = await AsyncStorage.getItem(BLE_WRITE_CHAR_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedWriteTarget;
    if (parsed.deviceId !== deviceId) return null;
    if (!parsed.serviceUUID || !parsed.characteristicUUID) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function cacheWriteTarget(deviceId: string, target: BleWriteTarget): Promise<void> {
  const payload: CachedWriteTarget = { deviceId, ...target };
  await AsyncStorage.setItem(BLE_WRITE_CHAR_CACHE_KEY, JSON.stringify(payload));
}

async function characteristicExists(device: Device, target: BleWriteTarget): Promise<boolean> {
  try {
    const chars = await device.characteristicsForService(target.serviceUUID);
    return chars.some((item) => normalizeUuid(item.uuid) === normalizeUuid(target.characteristicUUID));
  } catch {
    return false;
  }
}

async function resolveWriteTarget(device: Device): Promise<BleWriteTarget> {
  const cached = await loadCachedWriteTarget(device.id);
  if (cached && (await characteristicExists(device, cached))) {
    return cached;
  }

  for (const preferred of PREFERRED_BLE_WRITE_TARGETS) {
    if (await characteristicExists(device, preferred)) {
      await cacheWriteTarget(device.id, preferred);
      return preferred;
    }
  }

  const services = await device.services();
  for (const service of services) {
    const characteristics = await device.characteristicsForService(service.uuid);
    for (const characteristic of characteristics) {
      if (characteristic.isWritableWithoutResponse) {
        const target = {
          serviceUUID: service.uuid,
          characteristicUUID: characteristic.uuid,
          withResponse: false,
        };
        await cacheWriteTarget(device.id, target);
        return target;
      }
    }
    for (const characteristic of characteristics) {
      if (characteristic.isWritableWithResponse) {
        const target = {
          serviceUUID: service.uuid,
          characteristicUUID: characteristic.uuid,
          withResponse: true,
        };
        await cacheWriteTarget(device.id, target);
        return target;
      }
    }
  }

  throw new Error('BLE_WRITE_CHAR_NOT_FOUND');
}

async function writeChunk(
  device: Device,
  target: BleWriteTarget,
  base64Chunk: string,
): Promise<Characteristic> {
  if (target.withResponse) {
    return device.writeCharacteristicWithResponseForService(
      target.serviceUUID,
      target.characteristicUUID,
      base64Chunk,
    );
  }
  return device.writeCharacteristicWithoutResponseForService(
    target.serviceUUID,
    target.characteristicUUID,
    base64Chunk,
  );
}

export async function sendTsplPayload(payload: string): Promise<void> {
  if (!payload.trim()) throw new Error('BLE_EMPTY_PAYLOAD');

  const device = await ensureConnectedBleDevice();
  const target = await resolveWriteTarget(device);
  const bytes = stringToBytes(payload);

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.slice(offset, offset + CHUNK_SIZE);
    await writeChunk(device, target, bytesToBase64(chunk));
    if (offset + CHUNK_SIZE < bytes.length) {
      await sleep(CHUNK_DELAY_MS);
    }
  }
}

export async function printOrderBarcodeLabel(data: OrderBarcodeData): Promise<void> {
  const payload = buildTsplInboundLabel({
    barcode: data.barcode,
    sheetKind: 'barcode',
    extras: {
      inputBarcode: data.inputBarcode,
    },
  });
  await sendTsplPayload(payload);
}
