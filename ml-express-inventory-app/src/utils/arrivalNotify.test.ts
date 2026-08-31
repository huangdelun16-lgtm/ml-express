import { describe, expect, it } from 'vitest';
import type { InventoryStoreSession } from '../services/authService';
import type { OrderTrackingRecord } from '../types/tracking';
import {
  buildArrivalNotifyMessage,
  buildSmsUrl,
  buildWhatsAppUrl,
  collectArrivalNotifyTargets,
  countUnnotifiedSignableItems,
  needsArrivalNotify,
  toWhatsAppDigits,
} from './arrivalNotify';

const ygnStore: InventoryStoreSession = {
  id: '1',
  storeCode: 'YGN001',
  storeName: 'YGN',
  storeType: 'transit_station',
  hubCode: 'YGN',
  region: 'YGN',
  address: '',
  loggedInAt: '2026-08-31T00:00:00.000Z',
};

function order(
  partial: Partial<OrderTrackingRecord> & Pick<OrderTrackingRecord, 'id' | 'order_barcode'>,
): OrderTrackingRecord {
  return {
    pkg_tracking_id: 'p1',
    pack_barcode: 'PKG1',
    express_barcode: '',
    order_name: '衣物',
    destination_code: 'YGN',
    qty: 1,
    status: 'hub_received',
    recipient_name: 'Aung',
    recipient_phone: '091234567',
    packaging: '',
    spec: '',
    weight: '',
    detail_address: '',
    inbound_note: '',
    inbound_store_name: '',
    inbound_at: null,
    hub_received_at: null,
    hub_received_by_store_code: null,
    hub_received_by_store_name: null,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

describe('toWhatsAppDigits', () => {
  it('缅甸 09 开头转 95', () => {
    expect(toWhatsAppDigits('09-123 4567')).toBe('9591234567');
    expect(toWhatsAppDigits('+9591234567')).toBe('9591234567');
    expect(toWhatsAppDigits('0044955123')).toBe('44955123');
  });

  it('空号返回空', () => {
    expect(toWhatsAppDigits('  ')).toBe('');
  });
});

describe('buildWhatsAppUrl / buildSmsUrl', () => {
  it('WhatsApp 走 wa.me', () => {
    expect(buildWhatsAppUrl('09111', 'hello')).toBe(
      `https://wa.me/${toWhatsAppDigits('09111')}?text=${encodeURIComponent('hello')}`,
    );
  });

  it('iOS 短信用 &body，Android 用 ?body', () => {
    expect(buildSmsUrl('09111', 'hi', 'ios')).toBe(`sms:09111&body=${encodeURIComponent('hi')}`);
    expect(buildSmsUrl('09111', 'hi', 'android')).toBe(`sms:09111?body=${encodeURIComponent('hi')}`);
  });
});

describe('buildArrivalNotifyMessage', () => {
  it('中文含站点与单号', () => {
    const text = buildArrivalNotifyMessage({
      language: 'zh',
      hubLabel: 'YGN',
      barcode: 'YGN0001',
      expressBarcode: 'EX-9',
      recipientName: '张三',
    });
    expect(text).toContain('YGN');
    expect(text).toContain('YGN0001');
    expect(text).toContain('EX-9');
    expect(text).toContain('张三');
  });

  it('英文不含中文模板', () => {
    const text = buildArrivalNotifyMessage({
      language: 'en',
      hubLabel: 'MDY',
      barcode: 'MDY1',
    });
    expect(text.startsWith('[ML Express]')).toBe(true);
    expect(text).not.toContain('包裹');
  });
});

describe('collectArrivalNotifyTargets / needsArrivalNotify', () => {
  it('只收集本站目的且有电话的订单', () => {
    const targets = collectArrivalNotifyTargets(
      [
        order({ id: '1', order_barcode: 'YGN1', destination_code: 'YGN' }),
        order({ id: '2', order_barcode: 'MDY1', destination_code: 'MDY' }),
        order({ id: '3', order_barcode: 'YGN2', destination_code: 'YGN', recipient_phone: '' }),
        order({ id: '4', order_barcode: 'ygn1', destination_code: 'YGN' }),
      ],
      'YGN',
    );
    expect(targets.map((row) => row.barcode)).toEqual(['YGN1']);
  });

  it('已到站未签收且未通知才需要通知', () => {
    const arrived = {
      barcode: 'YGN1',
      hub_arrived_at: '2026-08-31T00:00:00.000Z',
      customer_signed_at: '',
      final_destination: 'YGN',
      owner_store_code: 'MUSE001',
    };
    expect(needsArrivalNotify(ygnStore, arrived)).toBe(true);
    expect(
      needsArrivalNotify(ygnStore, { ...arrived, arrival_notified_at: '2026-08-31T01:00:00.000Z' }),
    ).toBe(false);
    expect(countUnnotifiedSignableItems(ygnStore, [arrived, { ...arrived, barcode: 'PKG26YGN10001' }])).toBe(
      1,
    );
  });
});
