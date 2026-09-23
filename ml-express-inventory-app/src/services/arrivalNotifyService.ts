import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';
import { svc } from '../errors/serviceError';
import type { ArrivalNotifyAction, ArrivalNotifyTarget } from '../utils/arrivalNotify';
import {
  buildSmsUrl,
  buildWhatsAppUrl,
  toWhatsAppDigits,
} from '../utils/arrivalNotify';
import { callPhoneNumber } from '../utils/phoneCall';
import type { InventoryStoreSession } from './authService';
import { lookupCrossBorderCustomer } from './crossBorderCustomerService';
import { nowIso } from './database';
import { getItemByBarcode, getItemDetail, upsertItem } from './inventoryService';

export type ArrivalNotifyChannel = 'whatsapp' | 'sms' | 'call';

export async function enrichArrivalNotifyTarget(
  target: ArrivalNotifyTarget,
): Promise<ArrivalNotifyTarget> {
  const item = await getItemByBarcode(target.barcode);
  let phone = target.recipientPhone.trim();
  let name = target.recipientName.trim();
  let express = target.expressBarcode?.trim() || '';
  let customerCode = String(target.customerCode ?? '').trim().toUpperCase();
  let notifyMethod = String(target.notifyMethod ?? '').trim();
  let notifyAccount = String(target.notifyAccount ?? '').trim();

  if (item) {
    const detail = await getItemDetail(item.id);
    phone =
      phone ||
      String(detail?.recipient_phone ?? '').trim() ||
      String(item.customer_sign_phone ?? '').trim();
    name = name || String(item.recipient_name ?? item.customer_name ?? '').trim();
    express = express || item.input_barcode?.trim() || '';
    customerCode = customerCode || String(detail?.customer_code ?? '').trim().toUpperCase();
  }

  if (customerCode && !notifyMethod) {
    const match = await lookupCrossBorderCustomer(customerCode);
    if (match) {
      notifyMethod = String(match.notify_method ?? '').trim();
      notifyAccount = String(match.notify_account ?? '').trim();
      phone = phone || match.phone;
      name = name || match.customer_name;
    }
  }

  return {
    ...target,
    recipientPhone: phone,
    recipientName: name,
    expressBarcode: express,
    customerCode,
    notifyMethod,
    notifyAccount,
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

/** opened：已打开应用；copied：已复制微信号；called：已拨号，不自动记已通知。 */
export async function openArrivalNotifyAction(
  action: ArrivalNotifyAction,
  body: string,
): Promise<'opened' | 'copied' | 'called' | 'failed'> {
  if (action.kind === 'wechat') {
    const text = action.copyText.trim();
    if (!text) return 'failed';
    await Clipboard.setStringAsync(text);
    return 'copied';
  }
  if (action.kind === 'telegram') {
    try {
      await Linking.openURL(action.url);
      return 'opened';
    } catch {
      return 'failed';
    }
  }
  if (action.kind === 'call') {
    await callPhoneNumber(action.phone);
    return 'called';
  }
  const opened = await openArrivalNotifyChannel(action.kind, action.phone, body);
  return opened ? 'opened' : 'failed';
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
