import {
  CUSTOMER_NOTIFY_METHOD_LABELS,
  CUSTOMER_NOTIFY_METHODS,
  customerNotifyAccountLabel,
  customerNotifyAccountPlaceholder,
  formatCustomerNotifyDisplay,
  normalizeCustomerNotifyMethod,
} from './customerNotifyMethod';

describe('normalizeCustomerNotifyMethod', () => {
  it('keeps known methods', () => {
    expect(CUSTOMER_NOTIFY_METHODS.map((id) => normalizeCustomerNotifyMethod(id))).toEqual([
      ...CUSTOMER_NOTIFY_METHODS,
    ]);
  });

  it('maps display names and aliases', () => {
    expect(normalizeCustomerNotifyMethod('Whats App')).toBe('whatsapp');
    expect(normalizeCustomerNotifyMethod('Phone Call')).toBe('phone');
    expect(normalizeCustomerNotifyMethod('SMS')).toBe('message');
    expect(normalizeCustomerNotifyMethod('Weixin')).toBe('wechat');
  });

  it('falls back to WhatsApp', () => {
    expect(normalizeCustomerNotifyMethod('')).toBe('whatsapp');
    expect(normalizeCustomerNotifyMethod('fax')).toBe('whatsapp');
  });

  it('has English labels for the add-customer list', () => {
    expect(CUSTOMER_NOTIFY_METHOD_LABELS.whatsapp).toBe('WhatsApp');
    expect(CUSTOMER_NOTIFY_METHOD_LABELS.message).toBe('Message');
    expect(CUSTOMER_NOTIFY_METHOD_LABELS.phone).toBe('Phone Call');
  });

  it('placeholder follows the selected channel', () => {
    expect(customerNotifyAccountPlaceholder('whatsapp', false)).toBe('09xxxxxxxxx');
    expect(customerNotifyAccountPlaceholder('telegram', true)).toBe('@username');
    expect(customerNotifyAccountPlaceholder('wechat', false)).toBe('微信号');
    expect(customerNotifyAccountLabel(false)).toBe('通知账号');
  });

  it('table cell shows method and optional account', () => {
    expect(formatCustomerNotifyDisplay('whatsapp', '')).toBe('WhatsApp');
    expect(formatCustomerNotifyDisplay('whatsapp', ' 09123456789 ')).toBe('WhatsApp · 09123456789');
    expect(formatCustomerNotifyDisplay('telegram', '@ml_user')).toBe('Telegram · @ml_user');
  });
});
