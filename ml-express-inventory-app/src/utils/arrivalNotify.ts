import type { Language } from '../i18n/types';
import type { InventoryStoreSession } from '../services/authService';
import type { OrderTrackingRecord } from '../types/tracking';
import { canMarkCustomerSigned, type CustomerSignItemRef } from './customerSign';
import { resolveOrderDestinationCode } from './orderDestination';

export type ArrivalNotifyTarget = {
  barcode: string;
  expressBarcode?: string;
  recipientName: string;
  recipientPhone: string;
  hubCode: string;
  storeName?: string;
};

export type ArrivalNotifyItemRef = CustomerSignItemRef & {
  arrival_notified_at?: string | null;
};

export function toWhatsAppDigits(raw: string): string {
  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 8) {
    return `95${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, body: string): string {
  const digits = toWhatsAppDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}

export function buildSmsUrl(
  phone: string,
  body: string,
  platform: 'ios' | 'android',
): string {
  const number = phone.replace(/[^\d+]/g, '').trim();
  const encoded = encodeURIComponent(body);
  return platform === 'ios' ? `sms:${number}&body=${encoded}` : `sms:${number}?body=${encoded}`;
}

export function isArrivalNotified(item: ArrivalNotifyItemRef): boolean {
  return Boolean(String(item.arrival_notified_at ?? '').trim());
}

export function needsArrivalNotify(
  store: InventoryStoreSession,
  item: ArrivalNotifyItemRef,
): boolean {
  return canMarkCustomerSigned(store, item) && !isArrivalNotified(item);
}

export function countUnnotifiedSignableItems(
  store: InventoryStoreSession,
  items: ArrivalNotifyItemRef[],
): number {
  return items.filter((item) => needsArrivalNotify(store, item)).length;
}

export function buildArrivalNotifyMessage(params: {
  language: Language;
  hubLabel: string;
  barcode: string;
  expressBarcode?: string;
  recipientName?: string;
}): string {
  const hub = params.hubLabel.trim() || params.barcode;
  const barcode = params.barcode.trim();
  const express = String(params.expressBarcode ?? '').trim();
  const name = String(params.recipientName ?? '').trim();
  if (params.language === 'en') {
    const who = name ? `${name}, ` : '';
    const extra = express ? ` Courier no. ${express}.` : '';
    return `[ML Express] ${who}your parcel has arrived at ${hub}. Tracking ${barcode}.${extra} Please bring ID to collect.`;
  }
  if (params.language === 'my') {
    const who = name ? `${name}၊ ` : '';
    const extra = express ? ` ခရီးသည်နံပါတ် ${express}။` : '';
    return `[ML Express] ${who}သင့်ပါဆယ် ${hub} သို့ ရောက်ရှိပါပြီ။ နံပါတ် ${barcode}။${extra} မှတ်ပုံတင်ယူဆောင်ပြီး လာယူပါ။`;
  }
  const who = name ? `${name}您好，` : '';
  const extra = express ? `，快递单 ${express}` : '';
  return `【ML Express】${who}包裹已到达${hub}站，单号 ${barcode}${extra}，请凭有效证件前来取件。`;
}

export function collectArrivalNotifyTargets(
  orders: OrderTrackingRecord[],
  hubCode: string,
): ArrivalNotifyTarget[] {
  const hub = hubCode.trim().toUpperCase();
  if (!hub) return [];
  const seen = new Set<string>();
  const targets: ArrivalNotifyTarget[] = [];
  for (const order of orders) {
    if (resolveOrderDestinationCode(order) !== hub) continue;
    const phone = String(order.recipient_phone ?? '').trim();
    if (!phone) continue;
    const barcode = String(order.order_barcode ?? '').trim().toUpperCase();
    if (!barcode || seen.has(barcode)) continue;
    seen.add(barcode);
    targets.push({
      barcode,
      expressBarcode: String(order.express_barcode ?? '').trim(),
      recipientName: String(order.recipient_name ?? '').trim(),
      recipientPhone: phone,
      hubCode: hub,
    });
  }
  return targets;
}
