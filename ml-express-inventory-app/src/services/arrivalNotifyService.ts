import { Linking, Platform } from 'react-native';
import { svc } from '../errors/serviceError';
import type { ArrivalNotifyTarget } from '../utils/arrivalNotify';
import {
  buildSmsUrl,
  buildWhatsAppUrl,
  toWhatsAppDigits,
} from '../utils/arrivalNotify';
import { callPhoneNumber } from '../utils/phoneCall';
import type { InventoryStoreSession } from './authService';
import { nowIso } from './database';
import { getItemByBarcode, getItemDetail, upsertItem } from './inventoryService';

export type ArrivalNotifyChannel = 'whatsapp' | 'sms' | 'call';

export async function enrichArrivalNotifyTarget(
  target: ArrivalNotifyTarget,
): Promise<ArrivalNotifyTarget> {
  if (target.recipientPhone.trim()) return target;
  const item = await getItemByBarcode(target.barcode);
  if (!item) return target;
  const detail = await getItemDetail(item.id);
  const phone =
    String(detail?.recipient_phone ?? '').trim() ||
    String(item.customer_sign_phone ?? '').trim();
  return {
    ...target,
    recipientPhone: phone,
    recipientName:
      target.recipientName.trim() ||
      String(item.recipient_name ?? item.customer_name ?? '').trim(),
    expressBarcode: target.expressBarcode?.trim() || item.input_barcode?.trim() || '',
  };
}

export async function openArrivalNotifyChannel(
  channel: ArrivalNotifyChannel,
  phone: string,
  body: string,
): Promise<boolean> {
  if (channel === 'call') {
    await callPhoneNumber(phone);
    return false;
  }
  const trimmed = phone.trim();
  if (!trimmed) return false;
  if (channel === 'whatsapp' && !toWhatsAppDigits(trimmed)) return false;

  const url =
    channel === 'whatsapp'
      ? buildWhatsAppUrl(trimmed, body)
      : buildSmsUrl(trimmed, body, Platform.OS === 'ios' ? 'ios' : 'android');

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function markItemArrivalNotified(
  barcode: string,
  store: InventoryStoreSession,
): Promise<void> {
  const item = await getItemByBarcode(barcode);
  if (!item) throw svc('orderNotFoundOrDeleted');
  await upsertItem(
    {
      ...item,
      barcode: item.barcode,
      arrival_notified_at: nowIso(),
    },
    { actingStore: store },
  );
}
